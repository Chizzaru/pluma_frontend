export interface Certificate {
  id: number;
  userId: number;
  fileName: string;
  storedFileName: string;
  certificateHash: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  expiresAt: string | null;
  issuer: string | null;
  subject: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}