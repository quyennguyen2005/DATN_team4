// Using Web Crypto API for client-side encryption simulation

export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
};

export const importPublicKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "ECDH",
            namedCurve: "P-256",
        },
        true,
        []
    );
}

// Derive a shared secret key (AES-GCM) from one's private key and another's public key
export const deriveSharedKey = async (
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> => {
  return window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptMessage = async (
  sharedKey: CryptoKey,
  text: string
): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> => {
  const encoded = new TextEncoder().encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    encoded
  );

  return { iv, ciphertext };
};

export const decryptMessage = async (
  sharedKey: CryptoKey,
  iv: Uint8Array,
  ciphertext: ArrayBuffer
): Promise<string> => {
  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      sharedKey,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    return "[Decryption Error]";
  }
};

// Helpers for simulation: Convert buffer to base64 for "storage"
export const bufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const base64ToBuffer = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};