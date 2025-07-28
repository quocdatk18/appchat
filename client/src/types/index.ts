// types/index.ts
export type Gender = 'male' | 'female';

export interface UserType {
  _id: string; // thêm id để đồng bộ
  username: string;
  avatar: string;
  online: boolean;
  nickname?: string;
  email?: string;
  gender?: string;
}

export interface AuthState {
  user: {
    _id: string;
    username: string;
    email: string;
    gender: Gender;
    avatar: string;
    nickname?: string;
  } | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  initialized: boolean;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string; // chỉ có khi 1-1
  content: string;
  type?: string; // loại message: text, image, file, video
  createdAt: string;
  sender?: Pick<UserType, '_id' | 'username' | 'avatar'>; // dùng cho chat nhóm hoặc FE cần
  mediaUrl?: string; // đường dẫn file
  mimetype?: string; // loại file thực tế (image/png, video/mp4, ...)
  originalName?: string; // tên file gốc
  seenBy?: string[]; // userId đã xem message này
  deletedBy?: string[]; // userId đã xoá message này (chỉ ẩn phía họ)
  recalled?: boolean; // true nếu đã thu hồi
  recallAt?: string; // thời điểm thu hồi
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
  lastMessageType?: string;
  lastMessageSenderId?: string;
  updatedAt?: string;
  createdBy?: string; // userId người tạo nhóm
  isActive?: boolean; // true: conversation đang hoạt động, false: đã bị xóa/ẩn (chỉ dùng cho group)
  // UserConversation fields (sẽ được populate từ server)
  isDeleted?: boolean; // User đã xóa conversation này
  isPinned?: boolean; // User đã pin conversation này
  isMuted?: boolean; // User đã mute conversation này
  unreadCount?: number; // Số tin nhắn chưa đọc của user này
  lastReadAt?: Date; // Thời điểm user đọc tin nhắn cuối cùng
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
