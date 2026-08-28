const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getStoredToken = (): string | null => {
  return localStorage.getItem('discord_auth_token');
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem('discord_auth_token', token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem('discord_auth_token');
};

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao processar requisição');
  }

  return data as T;
};
