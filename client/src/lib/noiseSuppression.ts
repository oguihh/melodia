/**
 * Módulo de Supressão de Ruído e Gate de Voz de Alta Fidelidade (Estilo Krisp / Discord)
 * Processamento DSP em tempo real usando Web Audio API para eliminar chiados,
 * ventoinhas, cliques de teclado e eco de retorno.
 */

export interface NoiseProcessor {
  processedStream: MediaStream;
  setMuted: (muted: boolean) => void;
  setThreshold: (threshold: number) => void;
  cleanup: () => void;
}

export function createKrispNoiseProcessor(
  rawStream: MediaStream,
  onSpeakingChange?: (isSpeaking: boolean) => void
): NoiseProcessor {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx({ sampleRate: 48000, latencyHint: 'interactive' });

  const source = audioCtx.createMediaStreamSource(rawStream);

  // 1. Filtro Passa-Altas (Corta ruídos graves abaixo de 90Hz: ventoinha, vibração de mesa, ar-condicionado)
  const highPass = audioCtx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.setValueAtTime(90, audioCtx.currentTime);
  highPass.Q.setValueAtTime(0.707, audioCtx.currentTime);

  // 2. Filtro Passa-Baixas (Corta chiados e frequências acima de 12kHz)
  const lowPass = audioCtx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.setValueAtTime(12000, audioCtx.currentTime);
  lowPass.Q.setValueAtTime(0.707, audioCtx.currentTime);

  // 3. Compressor de Dinâmica (Nivela o volume da voz e comprime picos de ruído de fundo)
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
  compressor.knee.setValueAtTime(12, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(4, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.15, audioCtx.currentTime);

  // 4. Noise Gate (GainNode): silêncio absoluto (ganho 0.0) quando o usuário não estiver falando
  const noiseGate = audioCtx.createGain();
  noiseGate.gain.setValueAtTime(0, audioCtx.currentTime);

  // 5. Analisador para detecção de atividade vocal (VAD)
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.3;

  // 6. Destino de saída limpa (Stream de áudio processado enviado para o WebRTC)
  const destination = audioCtx.createMediaStreamDestination();

  // Encadeamento do pipeline de áudio
  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(compressor);
  compressor.connect(analyser);
  compressor.connect(noiseGate);
  noiseGate.connect(destination);

  // NUNCA conectamos ao audioCtx.destination para garantir zero retorno nos fones locais!

  let isMutedState = false;
  let animFrameId: number | null = null;
  let isSpeakingState = false;
  let holdFrames = 0; // Hold time para não cortar o final das palavras
  let thresholdValue = 0.015; // Limite de sensibilidade de voz

  const dataArray = new Float32Array(analyser.fftSize);

  const processAudioFrame = () => {
    if (!analyser || isMutedState) {
      if (isSpeakingState) {
        isSpeakingState = false;
        onSpeakingChange?.(false);
        noiseGate.gain.cancelScheduledValues(audioCtx.currentTime);
        noiseGate.gain.setValueAtTime(0, audioCtx.currentTime);
      }
      animFrameId = requestAnimationFrame(processAudioFrame);
      return;
    }

    analyser.getFloatTimeDomainData(dataArray);

    // Calcular RMS (Energia do sinal em tempo real)
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sumSquares += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);

    if (rms > thresholdValue) {
      holdFrames = 15; // Mantém o portão aberto por ~250ms após parar de falar
      if (!isSpeakingState) {
        isSpeakingState = true;
        onSpeakingChange?.(true);
        // Abre o Noise Gate suavemente em 15ms
        noiseGate.gain.cancelScheduledValues(audioCtx.currentTime);
        noiseGate.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.015);
      }
    } else {
      if (holdFrames > 0) {
        holdFrames--;
      } else if (isSpeakingState) {
        isSpeakingState = false;
        onSpeakingChange?.(false);
        // Fecha o Noise Gate suavemente para silêncio total
        noiseGate.gain.cancelScheduledValues(audioCtx.currentTime);
        noiseGate.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.04);
      }
    }

    animFrameId = requestAnimationFrame(processAudioFrame);
  };

  animFrameId = requestAnimationFrame(processAudioFrame);

  return {
    processedStream: destination.stream,
    setMuted: (muted: boolean) => {
      isMutedState = muted;
      if (muted) {
        noiseGate.gain.cancelScheduledValues(audioCtx.currentTime);
        noiseGate.gain.setValueAtTime(0, audioCtx.currentTime);
        if (isSpeakingState) {
          isSpeakingState = false;
          onSpeakingChange?.(false);
        }
      }
    },
    setThreshold: (newThresh: number) => {
      thresholdValue = newThresh;
    },
    cleanup: () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      try {
        source.disconnect();
        highPass.disconnect();
        lowPass.disconnect();
        compressor.disconnect();
        noiseGate.disconnect();
        destination.disconnect();
        audioCtx.close();
      } catch (e) {}
    },
  };
}
