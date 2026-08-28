/**
 * Módulo de Criptografia de Ponta a Ponta (E2EE)
 * Implementa derivação de chaves AES-256-GCM para texto e
 * WebRTC Encoded Transform (Insertable Streams) para pacotes de áudio/vídeo/tela.
 */

const SALT = new TextEncoder().encode('discord-e2ee-salt-salt-2026');

// Derivar chave AES-GCM a partir de uma senha / segredo do canal
export async function deriveKeyFromSecret(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Criptografar mensagem de texto
export async function encryptTextMessage(text: string, key: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedText
  );

  // Combina IV + Buffer Criptografado em Base64
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Descriptografar mensagem de texto
export async function decryptTextMessage(cipherBase64: string, key: CryptoKey): Promise<string> {
  try {
    const binary = atob(cipherBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    return '[Mensagem Criptografada - Chave Incompatível]';
  }
}

// Configurar WebRTC Insertable Streams E2EE para Sender (Microfone / Câmera / Tela)
export function setupSenderTransform(sender: RTCRtpSender, key: CryptoKey): void {
  // @ts-ignore - WebRTC Insertable Streams
  if (typeof sender.createEncodedStreams !== 'function') {
    console.warn('[E2EE] WebRTC createEncodedStreams não suportado neste ambiente.');
    return;
  }

  try {
    // @ts-ignore
    const { readable, writable } = sender.createEncodedStreams();
    let frameCount = 0;

    const transformStream = new TransformStream({
      async transform(chunk: any, controller: TransformStreamDefaultController) {
        try {
          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const encrypted = await window.crypto.subtle.encrypt(
            {
              name: 'AES-GCM',
              iv,
            },
            key,
            chunk.data
          );

          // Criar novo buffer com [IV (12 bytes) + Encrypted Data]
          const newData = new Uint8Array(12 + encrypted.byteLength);
          newData.set(iv, 0);
          newData.set(new Uint8Array(encrypted), 12);

          chunk.data = newData.buffer;
          controller.enqueue(chunk);
          frameCount++;
        } catch (e) {
          controller.enqueue(chunk);
        }
      },
    });

    readable.pipeThrough(transformStream).pipeTo(writable);
    console.log('[E2EE] Pipeline de criptografia E2EE configurado com sucesso para envio.');
  } catch (err) {
    console.error('[E2EE] Erro ao configurar sender transform:', err);
  }
}

// Configurar WebRTC Insertable Streams E2EE para Receiver (Áudio / Vídeo Recebidos)
export function setupReceiverTransform(receiver: RTCRtpReceiver, key: CryptoKey): void {
  // @ts-ignore
  if (typeof receiver.createEncodedStreams !== 'function') {
    return;
  }

  try {
    // @ts-ignore
    const { readable, writable } = receiver.createEncodedStreams();

    const transformStream = new TransformStream({
      async transform(chunk: any, controller: TransformStreamDefaultController) {
        try {
          const raw = new Uint8Array(chunk.data);
          if (raw.length < 13) {
            controller.enqueue(chunk);
            return;
          }

          const iv = raw.slice(0, 12);
          const ciphertext = raw.slice(12);

          const decrypted = await window.crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv,
            },
            key,
            ciphertext
          );

          chunk.data = decrypted;
          controller.enqueue(chunk);
        } catch (e) {
          controller.enqueue(chunk);
        }
      },
    });

    readable.pipeThrough(transformStream).pipeTo(writable);
    console.log('[E2EE] Pipeline de decodificação E2EE configurado com sucesso para recebimento.');
  } catch (err) {
    console.error('[E2EE] Erro ao configurar receiver transform:', err);
  }
}
