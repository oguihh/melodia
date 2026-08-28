import { useState, useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { PeerConnectionInfo, VoiceParticipant, ScreenShareQuality } from '../types';
import { createKrispNoiseProcessor, NoiseProcessor } from '../lib/noiseSuppression';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export const useWebRTC = (
  socket: Socket | null,
  currentUserId?: string,
  currentUsername?: string,
  currentAvatarUrl?: string
) => {
  const [connectedChannelId, setConnectedChannelId] = useState<string | null>(null);
  const [connectedServerId, setConnectedServerId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peers, setPeers] = useState<Map<string, PeerConnectionInfo>>(new Map());

  // Streams reativos
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const rawLocalStreamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const noiseProcessorRef = useRef<NoiseProcessor | null>(null);
  const peersRef = useRef<Map<string, PeerConnectionInfo>>(new Map());

  const updatePeersState = useCallback(() => {
    setPeers(new Map(peersRef.current));
  }, []);

  // Criar conexão RTCPeerConnection para um membro da sala
  const createPeerConnection = useCallback((
    targetSocketId: string,
    targetUserId: string,
    targetUsername: string,
    targetAvatarUrl?: string,
    targetIsMuted?: boolean,
    targetIsDeafened?: boolean,
    targetIsCameraOn?: boolean,
    targetIsScreenSharing?: boolean
  ): RTCPeerConnection => {
    if (peersRef.current.has(targetSocketId)) {
      const existing = peersRef.current.get(targetSocketId);
      if (existing && existing.connection.signalingState !== 'closed') {
        if (targetUsername && targetUsername !== existing.username) {
          existing.username = targetUsername;
        }
        if (targetAvatarUrl) {
          existing.avatarUrl = targetAvatarUrl;
        }
        if (targetIsMuted !== undefined) {
          existing.isMuted = targetIsMuted;
        }
        if (targetIsDeafened !== undefined) {
          existing.isDeafened = targetIsDeafened;
        }
        updatePeersState();
        return existing.connection;
      }
      existing?.connection.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Adicionar áudio limpo processado com cancelamento de ruído Krisp
    const audioStreamToSend = processedStreamRef.current || rawLocalStreamRef.current;
    if (audioStreamToSend) {
      audioStreamToSend.getAudioTracks().forEach((track) => {
        pc.addTrack(track, audioStreamToSend);
      });
    }

    // Adicionar vídeo da câmera se estiver ativa
    if (rawLocalStreamRef.current) {
      rawLocalStreamRef.current.getVideoTracks().forEach((track) => {
        pc.addTrack(track, rawLocalStreamRef.current!);
      });
    }

    // Adicionar vídeo da tela se estiver compartilhando
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, screenStreamRef.current!);
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
      isMuted: targetIsMuted || false,
      isDeafened: targetIsDeafened || false,
      isCameraOn: targetIsCameraOn || false,
      isScreenSharing: targetIsScreenSharing || false,
    });

    updatePeersState();
    return pc;
  }, [socket, updatePeersState]);

  // Entrar em Canal de Voz com Processador de Ruído Krisp em tempo real
  const joinVoiceChannel = useCallback(async (
    channelId: string,
    serverId: string,
    avatarUrl?: string
  ) => {
    try {
      if (noiseProcessorRef.current) {
        noiseProcessorRef.current.cleanup();
        noiseProcessorRef.current = null;
      }

      // Captura do microfone com parâmetros nativos otimizados
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
        video: false,
      });

      rawLocalStreamRef.current = rawStream;

      // Iniciar o processador de voz e cancelamento de ruído DSP Krisp
      const processor = createKrispNoiseProcessor(rawStream, (speaking) => {
        setIsSpeaking(speaking);
        socket?.emit('speaking-state', { isSpeaking: speaking });
      });

      noiseProcessorRef.current = processor;
      processedStreamRef.current = processor.processedStream;
      setLocalStream(processor.processedStream);

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
  }, [socket]);

  // Sair de Canal de Voz
  const leaveVoiceChannel = useCallback(() => {
    if (noiseProcessorRef.current) {
      noiseProcessorRef.current.cleanup();
      noiseProcessorRef.current = null;
    }
    if (rawLocalStreamRef.current) {
      rawLocalStreamRef.current.getTracks().forEach((t) => t.stop());
      rawLocalStreamRef.current = null;
    }
    processedStreamRef.current = null;
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

    socket?.emit('leave-voice');

    setConnectedChannelId(null);
    setConnectedServerId(null);
    setIsSpeaking(false);
    setIsScreenSharing(false);
    setIsCameraOn(false);
    setIsMuted(false);
    setIsDeafened(false);
  }, [socket]);

  // Alternar Mudo (Corta o áudio no processador Krisp e sincroniza com o servidor)
  const toggleMute = useCallback(() => {
    const newMute = !isMuted;
    setIsMuted(newMute);

    // Muta na raiz do DSP
    if (noiseProcessorRef.current) {
      noiseProcessorRef.current.setMuted(newMute);
    }

    // Desativa tracks
    if (rawLocalStreamRef.current) {
      rawLocalStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMute;
      });
    }
    if (processedStreamRef.current) {
      processedStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMute;
      });
    }

    if (newMute) {
      setIsSpeaking(false);
      socket?.emit('speaking-state', { isSpeaking: false });
    }

    socket?.emit('update-voice-state', { isMuted: newMute });
  }, [isMuted, socket]);

  // Alternar Deafen (Desativa áudio de todos os outros participantes)
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

  // Alternar Câmera com renegociação
  const toggleCamera = useCallback(async () => {
    if (!connectedChannelId) return;

    if (isCameraOn) {
      if (rawLocalStreamRef.current) {
        const videoTrack = rawLocalStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          rawLocalStreamRef.current.removeTrack(videoTrack);
        }
      }

      peersRef.current.forEach(async (peer, targetSocketId) => {
        const senders = peer.connection.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video' && !s.track.label.toLowerCase().includes('screen'));
        if (videoSender) {
          peer.connection.removeTrack(videoSender);
          try {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            socket?.emit('signal-offer', {
              targetSocketId,
              offer,
              senderUsername: currentUsername,
              senderAvatarUrl: currentAvatarUrl,
            });
          } catch (e) {}
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

        if (rawLocalStreamRef.current) {
          rawLocalStreamRef.current.addTrack(camTrack);
        }

        peersRef.current.forEach(async (peer, targetSocketId) => {
          peer.connection.addTrack(camTrack, rawLocalStreamRef.current!);
          try {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            socket?.emit('signal-offer', {
              targetSocketId,
              offer,
              senderUsername: currentUsername,
              senderAvatarUrl: currentAvatarUrl,
            });
          } catch (e) {}
        });

        setIsCameraOn(true);
        socket?.emit('update-voice-state', { isCameraOn: true });
      } catch (e) {
        console.error('[WebRTC] Erro ao acessar câmera:', e);
      }
    }
  }, [connectedChannelId, isCameraOn, socket, currentUsername, currentAvatarUrl]);

  // Parar Compartilhamento de Tela com renegociação
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    peersRef.current.forEach(async (peer, targetSocketId) => {
      const senders = peer.connection.getSenders();
      senders.forEach((sender) => {
        if (sender.track && sender.track.label.toLowerCase().includes('screen')) {
          peer.connection.removeTrack(sender);
        }
      });

      try {
        const offer = await peer.connection.createOffer();
        await peer.connection.setLocalDescription(offer);
        socket?.emit('signal-offer', {
          targetSocketId,
          offer,
          senderUsername: currentUsername,
          senderAvatarUrl: currentAvatarUrl,
        });
      } catch (e) {}
    });

    socket?.emit('update-voice-state', { isScreenSharing: false });
  }, [socket, currentUsername, currentAvatarUrl]);

  // Iniciar Compartilhamento de Tela 1080p 60FPS
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
        audio: false,
      });

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      const screenTrack = displayStream.getVideoTracks()[0];

      screenTrack.onended = () => {
        stopScreenShare();
      };

      peersRef.current.forEach(async (peer, targetSocketId) => {
        try {
          peer.connection.addTrack(screenTrack, displayStream);

          const offer = await peer.connection.createOffer();
          await peer.connection.setLocalDescription(offer);

          socket?.emit('signal-offer', {
            targetSocketId,
            offer,
            senderUsername: currentUsername,
            senderAvatarUrl: currentAvatarUrl,
            isScreenShare: true,
          });
        } catch (err) {
          console.error('[WebRTC] Erro ao enviar track de tela para peer:', err);
        }
      });

      socket?.emit('update-voice-state', { isScreenSharing: true });
    } catch (e) {
      console.error('[WebRTC] Compartilhamento de tela cancelado ou falhou:', e);
    }
  }, [connectedChannelId, socket, stopScreenShare, currentUsername, currentAvatarUrl]);

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
          targetUser.avatarUrl,
          targetUser.isMuted,
          targetUser.isDeafened,
          targetUser.isCameraOn,
          targetUser.isScreenSharing
        );

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('signal-offer', {
            targetSocketId: targetUser.socketId,
            offer,
            senderUsername: currentUsername,
            senderAvatarUrl: currentAvatarUrl,
          });
        } catch (e) {
          console.error('[WebRTC] Erro ao criar oferta:', e);
        }
      }
    };

    const handleSignalOffer = async (data: {
      senderSocketId: string;
      senderUserId: string;
      senderUsername?: string;
      senderAvatarUrl?: string;
      offer: any;
      isScreenShare?: boolean;
    }) => {
      const pc = createPeerConnection(
        data.senderSocketId,
        data.senderUserId,
        data.senderUsername || 'Amigo',
        data.senderAvatarUrl
      );

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('signal-answer', {
          targetSocketId: data.senderSocketId,
          answer,
          senderUsername: currentUsername,
          senderAvatarUrl: currentAvatarUrl,
        });
      } catch (e) {
        console.error('[WebRTC] Erro ao responder oferta:', e);
      }
    };

    const handleSignalAnswer = async (data: {
      senderSocketId: string;
      senderUsername?: string;
      senderAvatarUrl?: string;
      answer: any;
    }) => {
      const peer = peersRef.current.get(data.senderSocketId);
      if (peer) {
        if (data.senderUsername && data.senderUsername !== peer.username) {
          peer.username = data.senderUsername;
        }
        if (data.senderAvatarUrl) {
          peer.avatarUrl = data.senderAvatarUrl;
        }
        try {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
          updatePeersState();
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

    // Sincronização em tempo real do estado de voz de outros membros (Mudo, Deafen, etc.)
    const handleUserVoiceStateUpdated = (updatedParticipant: VoiceParticipant) => {
      for (const peer of peersRef.current.values()) {
        if (peer.userId === updatedParticipant.userId) {
          peer.isMuted = updatedParticipant.isMuted;
          peer.isDeafened = updatedParticipant.isDeafened;
          peer.isCameraOn = updatedParticipant.isCameraOn;
          peer.isScreenSharing = updatedParticipant.isScreenSharing;
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
    socket.on('user-voice-state-updated', handleUserVoiceStateUpdated);

    return () => {
      socket.off('voice-room-users', handleVoiceRoomUsers);
      socket.off('signal-offer', handleSignalOffer);
      socket.off('signal-answer', handleSignalAnswer);
      socket.off('signal-ice', handleSignalIce);
      socket.off('user-left-voice', handleUserLeftVoice);
      socket.off('user-speaking-changed', handleUserSpeakingChanged);
      socket.off('user-voice-state-updated', handleUserVoiceStateUpdated);
    };
  }, [socket, currentUserId, currentUsername, currentAvatarUrl, createPeerConnection, updatePeersState]);

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
