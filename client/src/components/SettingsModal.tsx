import React, { useState } from 'react';
import { X, LogOut, User, Sparkles, Check } from 'lucide-react';
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
  const [customStatus, setCustomStatus] = useState(currentUser.customStatus || '');
  const [avatarSeed, setAvatarSeed] = useState(currentUser.username);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const newAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
        avatarSeed
      )}`;
      const data = await apiRequest<{ user: UserType }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          customStatus: customStatus.trim(),
          avatarUrl: newAvatarUrl,
        }),
      });

      onUpdateUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Erro ao salvar perfil:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#313338] rounded-lg shadow-2xl overflow-hidden border border-[#232428]">
        <div className="p-4 bg-[#2b2d31] flex items-center justify-between border-b border-[#1f2023]">
          <h3 className="font-bold text-white text-base">Configurações de Usuário</h3>
          <button onClick={onClose} className="text-[#949ba4] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Card de Perfil */}
          <div className="bg-[#1e1f22] p-4 rounded-xl flex items-center space-x-4 border border-[#2b2d31]">
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                avatarSeed
              )}`}
              alt="Avatar Preview"
              className="w-16 h-16 rounded-full bg-[#2b2d31] ring-2 ring-[#5865f2]"
            />
            <div>
              <h4 className="text-base font-bold text-white">{currentUser.username}</h4>
              <p className="text-xs text-[#949ba4]">{currentUser.email}</p>
              <button
                type="button"
                onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                className="mt-2 text-xs text-[#5865f2] hover:underline font-medium flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gerar novo Avatar</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Status Personalizado
            </label>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="O que você está fazendo?"
              className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
          </div>

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
                Fechar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#23a55a] hover:bg-[#209451] text-white font-semibold py-2 px-5 rounded text-sm transition shadow flex items-center space-x-1.5 disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvo!</span>
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
