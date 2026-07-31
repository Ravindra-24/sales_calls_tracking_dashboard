import { api } from './client';
import type { ApiResponse } from '../types/api';

export interface AndroidRelease {
  versionCode: number;
  versionName: string;
  sha256: string;
  releaseNotes: string;
  publishedAt: string;
}

export const fetchAndroidRelease = async (): Promise<AndroidRelease | null> => {
  try {
    const response = await api.get<ApiResponse<AndroidRelease>>('/mobile/releases/android');
    return response.status === 204 ? null : response.data.data ?? null;
  } catch {
    return null;
  }
};
