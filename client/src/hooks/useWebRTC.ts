import { useState, useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { PeerConnectionInfo, VoiceParticipant, ScreenShareQuality } from '../types';
import { deriveKeyFromSecret, setupSenderTransform, setupReceiverTransform } from '../lib/e2ee';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (socket: Socket | null, currentUserId?: string) => {
  const [connectedChannelId, setConnectedChannelId] = useState<string | null>(null);
  const [connectedServerId, setConnectedServerId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peers, setPeers] = useState<Map<string, PeerConnectionInfo>>(new Map());

  // Streams reativos do React
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnectionInfo>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const e2eeKeyRef = useRef<CryptoKey | null>(null);

  const updatePeersState = useCallback(() => {
    setPeers(new Map(peersRef.current));
  }, []);

  // Detector de Voz (VAD) via Web Audio API
  const startVoiceActivityDetection = useCallback((stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speakingFrames = 0;
      let lastSpeakingState = false;

      const checkAudio = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        const speakingNow = average > 12 && !isMuted;

        if (speakingNow) {
          speakingFrames++;
          if (speakingFrames > 2 && !lastSpeakingState) {
            lastSpeakingState = true;
            setIsSpeaking(true);
            socket?.emit('speaking-state', { isSpeaking: true });
          }
        } else {
          speakingFrames = 0;
          if (lastSpeakingState) {
            lastSpeakingState = false;
            setIsSpeaking(false);
            socket?.emit('speaking-state', { isSpeaking: false });
          }
        }

        animFrameRef.current = requestAnimationFrame(checkAudio);
      };

      animFrameRef.current = requestAnimationFrame(checkAudio);
    } catch (e) {
      console.error('[WebRTC] Erro ao iniciar VAD:', e);
    }
  }, [socket, isMuted]);

  // Criar conexão RTCPeerConnection
  const createPeerConnection = useCallback((
    targetSocketId: string,
    targetUserId: string,
    targetUsername: string,
    targetAvatarUrl?: string
  ): RTCPeerConnection => {
    if (peersRef.current.has(targetSocketId)) {
      peersRef.current.get(targetSocketId)?.connection.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Tracks locais de voz/câmera
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStreamRef.current!);
        if (e2eeKeyRef.current && sender) {
          setupSenderTransform(sender, e2eeKeyRef.current);
        }
      });
    }

    // Tracks de tela (se houver)
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, screenStreamRef.current!);
        if (e2eeKeyRef.current && sender) {
          setupSenderTransform(sender, e2eeKeyRef.current);
        }
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('signal-ice', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      remoteStream.addTrack(event.track);

      if (e2eeKeyRef.current && event.receiver) {
        setupReceiverTransform(event.receiver, e2eeKeyRef.current);
      }

      const peer = peersRef.current.get(targetSocketId);
      if (peer) {
        peer.stream = remoteStream;
        updatePeersState();
      }
    };

    peersRef.current.set(targetSocketId, {
      peerId: targetSocketId,
      userId: targetUserId,
      socketId: targetSocketId,
      username: targetUsername,
      avatarUrl: targetAvatarUrl,
      connection: pc,
      stream: remoteStream,
    });

    updatePeersState();
    return pc;
  }, [socket, updatePeersState]);

  // Entrar em Canal de Voz
  const joinVoiceChannel = useCallback(async (
    channelId: string,
    serverId: string,
    avatarUrl?: string,
    secret = 'melodia-secure-channel-2026'
  ) => {
    try {
      const key = await deriveKeyFromSecret(`${channelId}-${secret}`);
      e2eeKeyRef.current = key;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      startVoiceActivityDetection(stream);

      socket?.emit('join-voice', { channelId, serverId, avatarUrl });

      setConnectedChannelId(channelId);
      setConnectedServerId(serverId);
      setIsMuted(false);
      setIsDeafened(false);
      setIsCameraOn(false);
      setIsScreenSharing(false);
    } catch (err) {
      console.error('[WebRTC] Erro ao entrar no canal de voz:', err);
      alert('Permissão de microfone negada ou dispositivo indisponível.');
    }
  }, [socket, startVoiceActivityDetection]);

  // Sair de Canal de Voz
  const leaveVoiceChannel = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);

    peersRef.current.forEach((peer) => {
      try {
        peer.connection.close();
      } catch (e) {}
    });
    peersRef.current.clear();
    setPeers(new Map());

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    socket?.emit('leave-voice');

    setConnectedChannelId(null);
    setConnectedServerId(null);
    setIsSpeaking(false);
    setIsScreenSharing(false);
    setIsCameraOn(false);
    setIsMuted(false);
    setIsDeafened(false);
  }, [socket]);

  // Alternar Mudo
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;

    const newMute = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMute;
    });

    setIsMuted(newMute);
    socket?.emit('update-voice-state', { isMuted: newMute });
  }, [isMuted, socket]);

  // Alternar Deafen
  const toggleDeafen = useCallback(() => {
    const newDeafen = !isDeafened;
    setIsDeafened(newDeafen);

    peersRef.current.forEach((peer) => {
      if (peer.stream) {
        peer.stream.getAudioTracks().forEach((track) => {
          track.enabled = !newDeafen;
        });
      }
    });

    socket?.emit('update-voice-state', { isDeafened: newDeafen });
  }, [isDeafened, socket]);

  // Alternar Câmera
  const toggleCamera = useCallback(async () => {
    if (!connectedChannelId) return;

    if (isCameraOn) {
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      }

      peersRef.current.forEach((peer) => {
        const senders = peer.connection.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          peer.connection.removeTrack(videoSender);
        }
      });

      setIsCameraOn(false);
      socket?.emit('update-voice-state', { isCameraOn: false });
    } else {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const camTrack = camStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(camTrack);
        }

        peersRef.current.forEach((peer) => {
          const sender = peer.connection.addTrack(camTrack, localStreamRef.current!);
          if (e2eeKeyRef.current && sender) {
            setupSenderTransform(sender, e2eeKeyRef.current);
          }
        });

        setIsCameraOn(true);
        socket?.emit('update-voice-state', { isCameraOn: true });
      } catch (e) {
        console.error('[WebRTC] Erro ao acessar câmera:', e);
      }
    }
  }, [connectedChannelId, isCameraOn, socket]);

  // Parar Compartilhamento de Tela
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    peersRef.current.forEach((peer) => {
      const senders = peer.connection.getSenders();
      senders.forEach((sender) => {
        if (sender.track && sender.track.label.toLowerCase().includes('screen')) {
          peer.connection.removeTrack(sender);
        }
      });
    });

    socket?.emit('update-voice-state', { isScreenSharing: false });
  }, [socket]);

  // Iniciar Compartilhamento de Tela (60 FPS / 1080P)
  const startScreenShare = useCallback(async (quality?: ScreenShareQuality) => {
    if (!connectedChannelId) return;

    const fps = quality?.fps || 60;
    const is1080p = quality?.resolution === '1080p';
    const is720p = quality?.resolution === '720p';

    const videoConstraints: MediaTrackConstraints = {
      frameRate: { ideal: fps, max: fps },
    };

    if (is1080p) {
      videoConstraints.width = { ideal: 1920, max: 1920 };
      videoConstraints.height = { ideal: 1080, max: 1080 };
    } else if (is720p) {
      videoConstraints.width = { ideal: 1280, max: 1280 };
      videoConstraints.height = { ideal: 720, max: 720 };
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: videoConstraints,
        audio: quality?.audio !== false,
      });

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      const screenTrack = displayStream.getVideoTracks()[0];

      screenTrack.onended = () => {
        stopScreenShare();
      };

      peersRef.current.forEach((peer) => {
        const sender = peer.connection.addTrack(screenTrack, displayStream);
        if (e2eeKeyRef.current && sender) {
          setupSenderTransform(sender, e2eeKeyRef.current);
        }
      });

      socket?.emit('update-voice-state', { isScreenSharing: true });
    } catch (e) {
      console.error('[WebRTC] Compartilhamento de tela cancelado ou falhou:', e);
    }
  }, [connectedChannelId, socket, stopScreenShare]);

  // Handlers do Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleVoiceRoomUsers = async (data: { channelId: string; users: VoiceParticipant[] }) => {
      for (const targetUser of data.users) {
        if (targetUser.userId === currentUserId) continue;

        const pc = createPeerConnection(
          targetUser.socketId,
          targetUser.userId,
          targetUser.username,
          targetUser.avatarUrl
        );

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('signal-offer', {
            targetSocketId: targetUser.socketId,
            offer,
          });
        } catch (e) {
          console.error('[WebRTC] Erro ao criar oferta:', e);
        }
      }
    };

    const handleSignalOffer = async (data: {
      senderSocketId: string;
      senderUserId: string;
      offer: any;
    }) => {
      const pc = createPeerConnection(
        data.senderSocketId,
        data.senderUserId,
        `Usuário-${data.senderUserId.slice(0, 4)}`
      );

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('signal-answer', {
          targetSocketId: data.senderSocketId,
          answer,
        });
      } catch (e) {
        console.error('[WebRTC] Erro ao responder oferta:', e);
      }
    };

    const handleSignalAnswer = async (data: { senderSocketId: string; answer: any }) => {
      const peer = peersRef.current.get(data.senderSocketId);
      if (peer) {
        try {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          console.error('[WebRTC] Erro ao definir resposta remota:', e);
        }
      }
    };

    const handleSignalIce = async (data: { senderSocketId: string; candidate: any }) => {
      const peer = peersRef.current.get(data.senderSocketId);
      if (peer) {
        try {
          await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('[WebRTC] Erro ao adicionar ICE candidate:', e);
        }
      }
    };

    const handleUserLeftVoice = (data: { userId: string }) => {
      let targetSocketId: string | null = null;
      for (const [sId, p] of peersRef.current.entries()) {
        if (p.userId === data.userId) {
          targetSocketId = sId;
          p.connection.close();
          break;
        }
      }

      if (targetSocketId) {
        peersRef.current.delete(targetSocketId);
        updatePeersState();
      }
    };

    const handleUserSpeakingChanged = (data: { userId: string; isSpeaking: boolean }) => {
      for (const p of peersRef.current.values()) {
        if (p.userId === data.userId) {
          p.isSpeaking = data.isSpeaking;
          updatePeersState();
          break;
        }
      }
    };

    socket.on('voice-room-users', handleVoiceRoomUsers);
    socket.on('signal-offer', handleSignalOffer);
    socket.on('signal-answer', handleSignalAnswer);
    socket.on('signal-ice', handleSignalIce);
    socket.on('user-left-voice', handleUserLeftVoice);
    socket.on('user-speaking-changed', handleUserSpeakingChanged);

    return () => {
      socket.off('voice-room-users', handleVoiceRoomUsers);
      socket.off('signal-offer', handleSignalOffer);
      socket.off('signal-answer', handleSignalAnswer);
      socket.off('signal-ice', handleSignalIce);
      socket.off('user-left-voice', handleUserLeftVoice);
      socket.off('user-speaking-changed', handleUserSpeakingChanged);
    };
  }, [socket, currentUserId, createPeerConnection, updatePeersState]);

  return {
    connectedChannelId,
    connectedServerId,
    isMuted,
    isDeafened,
    isCameraOn,
    isScreenSharing,
    isSpeaking,
    peers,
    localStream,
    screenStream,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
  };
};
