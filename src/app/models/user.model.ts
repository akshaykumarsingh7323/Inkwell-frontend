export interface User {
  userId?: string;
  username: string;
  email: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
  fullName?: string;
  active?: boolean;
  phoneNumber?: string;
}

export interface AuthRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  active?: boolean;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  phoneNumber?: string;
}

export interface PublicUserProfile {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  role?: string;
  phoneNumber?: string;
  email?: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  bio?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  currentPassword?: string;
  newPassword?: string;
}
