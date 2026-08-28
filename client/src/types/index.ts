export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  customStatus?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId: string;
  createdAt?: string;
}

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  role: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    customStatus?: string;
  };
}

export interface Server {
  id: string;
  name: string;
  iconUrl?: string;
  ownerId: string;
  channels: Channel[];
  members?: ServerMember[];
  _count?: {
    members: number;
  };
}

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  isEncrypted: boolean;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface VoiceParticipant {
  userId: string;
  socketId: string;
  username: string;
  avatarUrl?: string;
  channelId: string;
  serverId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

export interface PeerConnectionInfo {
  peerId: string;
  userId: string;
  socketId: string;
  username: string;
  avatarUrl?: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  screenStream?: MediaStream;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
}

export interface Friend {
  friendshipId: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    customStatus?: string;
  };
}

export interface PendingFriendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  sender?: User;
  receiver?: User;
  createdAt: string;
}

export interface DMChannelSummary {
  id: string;
  recipient: User;
  lastMessage?: {
    content: string;
    createdAt: string;
  } | null;
  updatedAt: string;
}

export interface DirectMessageItem {
  id: string;
  dmChannelId: string;
  senderId: string;
  content: string;
  isEncrypted: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface ScreenShareQuality {
  resolution: '1080p' | '720p' | 'source';
  fps: 60 | 30 | 15;
  audio: boolean;
}
