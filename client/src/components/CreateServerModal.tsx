import React, { useState } from 'react';
import { X, Plus, Compass, Sparkles } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Server } from '../types';

interface CreateServerModalProps {
  onClose: () => void;
  onServerCreated: (server: Server) => void;
  onServerJoined: (serverId: string) => void;
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  onClose,
  onServerCreated,
  onServerJoined,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [serverName, setServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest<{ server: Server }>('/servers', {
        method: 'POST',
        body: JSON.stringify({ name: serverName.trim() }),
      });
      onServerCreated(data.server);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    // Extrair apenas o código se o usuário colar o link completo
    const cleanCode = inviteCode.trim().split('/').pop() || inviteCode.trim();

    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest<{ message: string; serverId: string }>(
        `/servers/join/${cleanCode}`,
        {
          method: 'POST',
        }
      );
      onServerJoined(data.serverId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Convite inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden border border-[#232428]">
        {/* Header com Abas */}
        <div className="p-4 bg-[#2b2d31] flex items-center justify-between border-b border-[#1f2023]">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setTab('create');
                setError(null);
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                tab === 'create'
                  ? 'bg-[#5865f2] text-white'
                  : 'text-[#949ba4] hover:text-white'
              }`}
            >
              Criar Servidor
            </button>
            <button
              onClick={() => {
                setTab('join');
                setError(null);
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                tab === 'join'
                  ? 'bg-[#5865f2] text-white'
                  : 'text-[#949ba4] hover:text-white'
              }`}
            >
              Entrar com Convite
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-[#949ba4] hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-[#f23f43]/15 border border-[#f23f43]/40 text-[#f23f43] text-xs p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Corpo */}
        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">Criar seu servidor</h3>
              <p className="text-xs text-[#949ba4]">
                Seu servidor é onde você e seus amigos se reúnem em chamadas e conversas.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                Nome do Servidor
              </label>
              <input
                type="text"
                required
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="ex: Servidor do Guilherme"
                className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
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
                disabled={loading || !serverName.trim()}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2 px-6 rounded text-sm transition shadow disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">Entrar em um Servidor</h3>
              <p className="text-xs text-[#949ba4]">
                Insira o código ou link de convite abaixo para se juntar à comunidade.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                Código ou Link de Convite
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ex: a8f9e1b2 ou https://..."
                className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
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
                disabled={loading || !inviteCode.trim()}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2 px-6 rounded text-sm transition shadow disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar no Servidor'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
