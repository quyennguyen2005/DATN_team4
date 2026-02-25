export interface User {
  id: string;
  name: string;
  avatar: string;
  publicKey?: CryptoKey; // Public key for E2EE
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string; // Decrypted text for display
  encryptedData?: string; // Base64 simulated encrypted payload
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  isEncrypted: boolean;
}

export interface ChatSession {
  contactId: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: number;
  draft?: string;
}

// Key pair for the current user
export interface keyPairIdentity {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}