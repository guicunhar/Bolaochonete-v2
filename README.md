# ⚽ Bolão Chonete — Copa do Mundo 2026

Bolão dos amigos para a Copa 2026. Palpites nos jogos, classificação em tempo real.

## Stack
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React + Vite
- **Auth**: JWT + bcrypt
- **Deploy**: Railway (gratuito)

## Login Admin padrão
```
usuário: admin
senha:   admin2026
```
⚠️ **Troque a senha após o primeiro login** (editando direto no banco ou adicionando uma rota de troca de senha).

## Rodando localmente

### Backend
```bash
cd backend
npm install
node server.js
# Roda na porta 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Roda na porta 5173 com proxy para o backend
```

## Deploy no Railway (gratuito)

1. Crie conta em [railway.app](https://railway.app)
2. Crie um novo projeto → "Deploy from GitHub repo"
3. Faça push deste projeto para um repositório GitHub
4. Conecte o repositório no Railway
5. Configure a variável de ambiente:
   - `JWT_SECRET` = uma string longa e aleatória (ex: `meubolao2026supersecreto`)
6. O Railway detecta o `railway.toml` e faz o build automaticamente
7. Acesse a URL gerada pelo Railway

### Variáveis de ambiente (Railway)
| Variável | Descrição |
|----------|-----------|
| `JWT_SECRET` | Chave secreta para JWT (obrigatório) |
| `DB_PATH` | Caminho do banco SQLite (padrão: `./bolao.db`) |
| `PORT` | Porta do servidor (Railway define automaticamente) |

## Estrutura
```
bolao2026/
├── backend/
│   ├── server.js      # API Express
│   ├── database.js    # Schema + seed dos jogos
│   ├── scoring.js     # Cálculo de pontos
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/     # Classificação, Palpites, Admin...
│   │   ├── contexts/  # AuthContext
│   │   └── components/
│   └── package.json
├── railway.toml       # Config de deploy
└── README.md
```

## Funcionalidades

### Participantes
- Cadastro com login/senha + palpites especiais (campeã, melhor jogador, artilheiro)
- Palpitar nos jogos (bloqueado automaticamente no horário de início)
- Ver palpites de todos os participantes (visíveis após o início da partida)
- Classificação com pontos totais, exatos, parciais e básicos

### Administrador
- Painel de gerenciamento de jogos (planilha editável)
- Alterar datas, horários, times, bandeiras, local
- Inserir resultados finais (calcula pontos automaticamente)
- Adicionar/remover jogos (fase de grupos e mata-mata)
- Ver todos os participantes e seus palpites especiais

### Sistema de Pontuação
| Tipo | Pontos |
|------|--------|
| Acerto Total (placar exato) | 5 pts |
| Acerto Parcial (vencedor + gols de um time) | 3 pts |
| Acerto Básico (só o vencedor) | 1 pt |
| Campeã certa | 50 pts |
| Vice (palpitou no campeão) | 25 pts |
| Melhor Jogador | 25 pts |
| Artilheiro exato | 20 pts |
| Artilheiro (perdeu no desempate) | 10 pts |
