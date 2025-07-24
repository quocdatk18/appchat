// types/index.ts
export type Gender = 'male' | 'female' | 'other';

export interface UserType {
  _id: string; // thêm id để đồng bộ
  username: string;
  avatar: string;
  online: boolean;
}

export interface AuthState {
  user: {
    _id: string;
    username: string;
    email: string;
    gender: string;
    avatar: string;
  } | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  initialized: boolean;
}

type MiniUser = {
  _id: string;
  username: string;
  avatar: string;
};

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string; // chỉ có khi 1-1
  content: string;
  createdAt: string;
  sender?: MiniUser; // dùng cho chat nhóm hoặc FE cần
}

export interface MessageState {
  messages: Message[];
  loading: boolean;
  error: string | null;
}

export interface Conversation {
  _id: string;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  receiver?: UserType; // chỉ cho 1-1
  members?: string[]; // mảng id
  memberPreviews?: UserType[]; // preview cho nhóm
  lastMessage?: string;
  updatedAt?: string;
}

export interface ConversationState {
  conversations: Conversation[];
  searchResults: Conversation[];
  selectedConversation: Conversation | null; // ✅ chuẩn
  selectedUser: UserType | null;
  loading: boolean;
  error: string | null;
}

export interface FieldType {
  email: string;
  username: string;
  password: string;
  remember: boolean;
  gender: Gender;
  confirmPassword: string; // lowercase 'string' consistent
}

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
  avatar: string;
}
