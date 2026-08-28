import React, { useState } from 'react';
import { Music, LogIn, UserPlus, Lock, Mail, User as UserIcon } from 'lucide-react';
import { apiRequest, setStoredToken } from '../lib/api';
import { User as UserType } from '../types';

interface AuthModalProps {
  onSuccess: (user: UserType, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const data = await apiRequest<{ message: string; token: string; user: UserType }>(
          '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({ email, username, password }),
          }
        );
        setStoredToken(data.token);
        onSuccess(data.user, data.token);
      } else {
        const data = await apiRequest<{ message: string; token: string; user: UserType }>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          }
        );
        setStoredToken(data.token);
        onSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#313338] rounded-xl shadow-2xl overflow-hidden border border-[#232428]">
        {/* Header MELODIA */}
        <div className="bg-gradient-to-r from-[#5865f2] to-[#4752c4] p-6 text-center text-white relative">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md mb-2 shadow-inner">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-wider">MELODIA</h2>
          <p className="text-xs text-white/80 mt-1">
            {isRegister
              ? 'Crie sua conta para conversar por voz, vídeo e compartilhar tela em 60 FPS.'
              : 'Boas-vindas de volta! Entre na sua conta para continuar.'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-[#f23f43]/15 border border-[#f23f43]/40 text-[#f23f43] text-xs p-3 rounded-md">
              {error}
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                Nome de Usuário
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#80848e] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: guilherme"
                  className="w-full bg-[#1e1f22] text-[#dbdee1] pl-9 pr-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#80848e] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                className="w-full bg-[#1e1f22] text-[#dbdee1] pl-9 pr-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#80848e] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1e1f22] text-[#dbdee1] pl-9 pr-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2.5 px-4 rounded text-sm transition duration-150 flex items-center justify-center space-x-2 mt-6 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin">⟳</span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Criar Conta</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar</span>
              </>
            )}
          </button>

          <div className="text-center pt-2 text-xs text-[#949ba4]">
            {isRegister ? (
              <span>
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                  }}
                  className="text-[#00a8fc] hover:underline font-medium"
                >
                  Entrar
                </button>
              </span>
            ) : (
              <span>
                Precisa de uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                  }}
                  className="text-[#00a8fc] hover:underline font-medium"
                >
                  Registre-se
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
