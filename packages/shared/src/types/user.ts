export const Role = {
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
  HELPER: 'HELPER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface User {
  id: string;
  login: string;
  name: string;
  role: Role;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  login: string;
  password: string;
  name: string;
  role: Role;
  phone?: string;
}

export interface UserUpdateInput {
  name?: string;
  phone?: string;
  role?: Role;
  isActive?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  role: Role;
  iat: number;
  exp: number;
}
