// types/auth.ts
export interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
}

export interface AuthActions {
  refreshAccessToken: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export type Role = 'ROLE_ADMIN' | 'ROLE_USER';

export interface Auth{
    isAuthenticated: boolean | undefined;
    user: User | null;
    login: (username: string, password:string) => void;
    logout: () => void;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user?: User;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  clearSuccess: () => void;
}