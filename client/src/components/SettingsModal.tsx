import React, { useState, useRef } from 'react';
import { X, LogOut, Upload, Sparkles, Check, RotateCcw, User } from 'lucide-react';
import { User as UserType } from '../types';
import { apiRequest } from '../lib/api';

interface SettingsModalProps {
  currentUser: UserType;
  onClose: () => void;
  onUpdateUser: (user: UserType) => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  onClose,
  onUpdateUser,
  onLogout,
}) => {
  const [username, setUsername] = useState(currentUser.username);
  const [customStatus, setCustomStatus] = useState(currentUser.customStatus || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload de foto do computador (PNG, JPG, WEBP, etc.)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gerar novo avatar padrão do MELODIA (Dicebear Bottts)
  const handleGenerateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 10);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
    setError(null);
  };

  // Restaurar avatar padrão baseado no username
  const handleResetToDefault = () => {
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      const data = await apiRequest<{ user: UserType }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          username: username.trim(),
          customStatus: customStatus.trim(),
          avatarUrl: avatarUrl,
        }),
      });

      onUpdateUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="w-full max-w-xl bg-[#313338] rounded-xl shadow-2xl overflow-hidden border border-[#232428]">
        {/* Header */}
        <div className="p-4 bg-[#2b2d31] flex items-center justify-between border-b border-[#1f2023]">
          <h3 className="font-bold text-white text-base">Meu Perfil e Configurações</h3>
          <button onClick={onClose} className="text-[#949ba4] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-[#f23f43]/15 border border-[#f23f43]/40 text-[#f23f43] text-xs p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Card de Visualização do Perfil */}
          <div className="bg-[#1e1f22] p-4 rounded-xl flex items-center space-x-4 border border-[#2b2d31]">
            <div className="relative group">
              <img
                src={
                  avatarUrl ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`
                }
                alt="Avatar Preview"
                className="w-20 h-20 rounded-full bg-[#2b2d31] object-cover ring-2 ring-[#5865f2] shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-semibold"
                title="Trocar Foto"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-white truncate">{username}</h4>
              <p className="text-xs text-[#949ba4] truncate">{currentUser.email}</p>

              {/* Botões de Ação do Avatar */}
              <div className="flex flex-wrap gap-2 mt-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-[#35373c] hover:bg-[#404249] text-[#dbdee1] hover:text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Foto do PC</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateRandomAvatar}
                  className="px-2.5 py-1 bg-[#35373c] hover:bg-[#404249] text-[#dbdee1] hover:text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5865f2]" />
                  <span>Sortear Avatar</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-2.5 py-1 bg-[#35373c] hover:bg-[#404249] text-[#949ba4] hover:text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
                  title="Restaurar avatar padrão"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Padrão</span>
                </button>
              </div>
            </div>
          </div>

          {/* Nome de Usuário */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Nome de Usuário
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu nome de usuário"
              className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
          </div>

          {/* Status Personalizado */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Status Personalizado
            </label>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="O que você está ouvindo ou jogando?"
              className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
          </div>

          {/* Rodapé com Logout e Salvar */}
          <div className="flex items-center justify-between pt-4 border-t border-[#2b2d31]">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center space-x-2 text-xs text-[#f23f43] hover:underline font-semibold py-2 px-3 rounded hover:bg-[#f23f43]/10 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta (Logout)</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-white hover:underline py-2 px-4"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#23a55a] hover:bg-[#209451] text-white font-semibold py-2 px-5 rounded text-sm transition shadow flex items-center space-x-1.5 disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvo com Sucesso!</span>
                  </>
                ) : (
                  <span>Salvar Alterações</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
