import React, { useState, useEffect } from 'react';
import { X, Copy, Check, UserPlus, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Server } from '../types';

interface InviteModalProps {
  server: Server;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ server, onClose }) => {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateInvite = async () => {
      try {
        const data = await apiRequest<{ invite: { code: string } }>(
          `/servers/${server.id}/invites`,
          { method: 'POST' }
        );
        setInviteCode(data.invite.code);
      } catch (e) {
        console.error('Erro ao gerar convite:', e);
      } finally {
        setLoading(false);
      }
    };

    generateInvite();
  }, [server.id]);

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-md bg-[#313338] rounded-lg shadow-2xl overflow-hidden border border-[#232428]">
        <div className="p-4 bg-[#2b2d31] flex items-center justify-between border-b border-[#1f2023]">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-[#5865f2]" />
            <h3 className="font-bold text-white text-base">
              Convidar amigos para {server.name}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#949ba4] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-[#949ba4]">
            Envie este código ou link de convite para um amigo. Qualquer pessoa com o código poderá entrar no servidor.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Código de Convite do Servidor
            </label>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={loading ? 'Gerando código...' : inviteCode || ''}
                className="w-full bg-[#1e1f22] text-[#dbdee1] font-mono px-3 py-2.5 rounded text-sm focus:outline-none border border-[#2b2d31]"
              />

              <button
                onClick={handleCopy}
                disabled={loading || !inviteCode}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2.5 px-4 rounded text-sm transition flex items-center space-x-1.5 shrink-0 disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#23a55a]" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-[#2b2d31] p-3 rounded-lg flex items-center space-x-3 text-xs text-[#23a55a]">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>
              Todas as comunicações neste servidor utilizam criptografia de ponta a ponta.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
