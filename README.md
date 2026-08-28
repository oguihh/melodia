# 🚀 Discord Clone — Voz, Vídeo, Compartilhamento de Tela & E2EE

Aplicativo estilo Discord com interface fiel, chamadas de voz e vídeo com ultra-baixa latência, compartilhamento de tela nativo, chat em tempo real e **Criptografia de Ponta a Ponta (E2EE)** com algoritmo **AES-256-GCM**.

Pronto para execução local (**Web** e **Aplicativo Desktop Electron**) e preparado para deploy direto em **VPS**.

---

## ✨ Funcionalidades Principais

* **🔐 Autenticação Completa:** Criação de conta com senha criptografada (bcrypt) e login seguro com JSON Web Tokens (JWT).
* **🛡️ Criptografia de Ponta a Ponta (E2EE):**
  * Voz, vídeo e tela utilizam **WebRTC Encoded Transform (Insertable Streams)** para criptografar pacotes de mídia diretamente no navegador/desktop com **AES-256-GCM**. Nem o servidor intermediário consegue descriptografar a mídia.
* **🔊 Chamadas de Voz & Vídeo:**
  * Canais de voz no estilo Discord com entrada/saída fluida.
  * Indicador de fala em tempo real com anel verde animado no avatar (*Voice Activity Detection* via Web Audio API).
  * Controles completos: Mutar Microfone, Desensurdecer (Deafen), Ligar/Desligar Câmera, Desconectar.
* **🖥️ Compartilhamento de Tela e Janelas:** Compartilhe a tela inteira ou janelas específicas em tempo real com alta definição.
* **💬 Chat em Tempo Real:** Canais de texto com histórico de mensagens, identificação de quem está digitando e notificações via Socket.IO.
* **🏰 Servidores e Sistema de Convites:**
  * Crie seus próprios servidores personalizados com canais de texto e voz.
  * Geração instantânea de códigos de convite compartilháveis para amigos entrarem.
* **🖥️ Multiplataforma:** Roda no navegador ou como **Aplicativo Desktop nativo** via Electron com janela frameless customizada.

---

## 📂 Estrutura do Projeto

```
naosei/
├── client/                  # Frontend (React + Vite + TailwindCSS + Electron)
│   ├── electron/            # Processo principal e preload script do Electron
│   ├── src/
│   │   ├── components/      # UI Components (Sidebar, Chat, Voice, Modais)
│   │   ├── hooks/           # useWebRTC com E2EE e detecção de fala (VAD)
│   │   ├── lib/             # API REST, Socket.IO e Criptografia AES-GCM
│   │   └── types/           # Interfaces TypeScript
│   └── package.json
├── server/                  # Backend (Node.js + Express + Socket.IO + Prisma)
│   ├── prisma/              # Schema do banco de dados (SQLite/PostgreSQL)
│   ├── src/
│   │   ├── middleware/      # Validação de tokens JWT
│   │   ├── routes/          # Auth, Servidores, Canais, Mensagens e Convites
│   │   ├── socket/          # Servidor de Sinalização WebRTC e Chat
│   │   └── index.ts         # Servidor principal
│   └── package.json
└── package.json             # Scripts de execução unificados
```

---

## 💻 Como Rodar em Localhost

### 1. Iniciar no Modo Web (Navegador)
Inicia o servidor backend na porta `3001` e o frontend na porta `5173`:
```bash
npm run dev
```
Acesse no seu navegador: **`http://localhost:5173`**

### 2. Iniciar como Aplicativo Desktop (Electron)
Inicia o backend e abre automaticamente a janela do aplicativo desktop:
```bash
npm run app
```

---

## 🧪 Como Testar com Múltiplos Usuários em Localhost

1. Abra o app no Desktop (`npm run app`) ou abra `http://localhost:5173` em uma aba normal.
2. Registre uma conta (ex: `guilherme`).
3. Crie um servidor e clique em **Convidar Pessoas** para copiar o código de convite.
4. Abra uma segunda aba em modo anônimo (ou outro navegador como Edge/Chrome) em `http://localhost:5173`.
5. Crie uma segunda conta (ex: `amigo`).
6. Clique no botão `+` na barra lateral esquerda -> **Entrar com Convite** e cole o código.
7. Ambos os usuários podem entrar no canal **`🔊 Geral`** e testar:
   * Conversação por áudio.
   * Câmera de vídeo.
   * Compartilhamento de tela com visualização em tempo real.
   * Chat de texto criptografado.

---

## ☁️ Guia de Deploy em VPS (Ubuntu / Debian)

### 1. Configurar Variáveis de Ambiente no Servidor
No diretório `server/`:
Edite o arquivo `.env`:
```env
PORT=3001
DATABASE_URL="file:./dev.db" # Ou "postgresql://user:pass@localhost:5432/discord_db"
JWT_SECRET="sua-chave-secreta-longa-e-segura-vps"
CORS_ORIGIN="https://seu-dominio.com"
```

No diretório `client/`:
Crie um `.env.production`:
```env
VITE_API_URL="https://seu-dominio.com/api"
VITE_SOCKET_URL="https://seu-dominio.com"
```

### 2. Build de Produção
```bash
npm run build
```

### 3. Rodar o Backend com PM2
```bash
npm install -g pm2
pm2 start server/dist/index.js --name "discord-backend"
pm2 save
pm2 startup
```

### 4. Configurar Nginx com Suporte a WebSockets e SSL
Exemplo de bloco de configuração do Nginx (`/etc/nginx/sites-available/discord`):
```nginx
server {
    server_name seu-dominio.com;

    # Frontend estático
    location / {
        root /var/www/discord/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API REST
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSockets (Socket.IO & Sinalização WebRTC)
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Ative o certificado SSL gratuito com Certbot:
```bash
sudo certbot --nginx -d seu-dominio.com
```
