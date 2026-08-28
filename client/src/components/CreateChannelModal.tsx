import React, { useState } from 'react';
import { X, Hash, Volume2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Channel } from '../types';

interface CreateChannelModalProps {
  serverId: string;
  defaultType?: 'TEXT' | 'VOICE';
  onClose: () => void;
  onChannelCreated: (channel: Channel) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  serverId,
  defaultType = 'TEXT',
  onClose,
  onChannelCreated,
}) => {
  const [channelType, setChannelType] = useState<'TEXT' | 'VOICE'>(defaultType);
  const [channelName, setChannelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest<{ channel: Channel }>(`/servers/${serverId}/channels`, {
        method: 'POST',
        body: JSON.stringify({
          name: channelName.trim(),
          type: channelType,
        }),
      });
      onChannelCreated(data.channel);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar canal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden border border-[#232428]">
        <div className="p-4 bg-[#2b2d31] flex items-center justify-between border-b border-[#1f2023]">
          <h3 className="font-bold text-white text-base">Criar Canal</h3>
          <button onClick={onClose} className="text-[#949ba4] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {error && (
            <div className="bg-[#f23f43]/15 border border-[#f23f43]/40 text-[#f23f43] text-xs p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Seleção do Tipo de Canal */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Tipo de Canal
            </label>

            <div className="space-y-2">
              {/* Opção Texto */}
              <div
                onClick={() => setChannelType('TEXT')}
                className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition ${
                  channelType === 'TEXT'
                    ? 'bg-[#35373c] border-[#5865f2]'
                    : 'bg-[#2b2d31] border-transparent hover:bg-[#35373c]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Hash className="w-6 h-6 text-[#949ba4]" />
                  <div>
                    <div className="text-sm font-semibold text-white">Texto</div>
                    <div className="text-xs text-[#949ba4]">
                      Poste mensagens, imagens e conversas
                    </div>
                  </div>
                </div>
                <input
                  type="radio"
                  checked={channelType === 'TEXT'}
                  onChange={() => setChannelType('TEXT')}
                  className="w-4 h-4 accent-[#5865f2]"
                />
              </div>

              {/* Opção Voz */}
              <div
                onClick={() => setChannelType('VOICE')}
                className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition ${
                  channelType === 'VOICE'
                    ? 'bg-[#35373c] border-[#5865f2]'
                    : 'bg-[#2b2d31] border-transparent hover:bg-[#35373c]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-6 h-6 text-[#949ba4]" />
                  <div>
                    <div className="text-sm font-semibold text-white">Voz e Vídeo</div>
                    <div className="text-xs text-[#949ba4]">
                      Fale por voz, transmita vídeo e tela com E2EE
                    </div>
                  </div>
                </div>
                <input
                  type="radio"
                  checked={channelType === 'VOICE'}
                  onChange={() => setChannelType('VOICE')}
                  className="w-4 h-4 accent-[#5865f2]"
                />
              </div>
            </div>
          </div>

          {/* Nome do Canal */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Nome do Canal
            </label>
            <div className="relative">
              {channelType === 'TEXT' ? (
                <Hash className="w-4 h-4 text-[#80848e] absolute left-3 top-3" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#80848e] absolute left-3 top-3" />
              )}
              <input
                type="text"
                required
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="novo-canal"
                className="w-full bg-[#1e1f22] text-[#dbdee1] pl-9 pr-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-white hover:underline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !channelName.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2 px-6 rounded text-sm transition shadow disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Canal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
