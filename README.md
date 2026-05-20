# BOLAOCHONETE - Copa 2026

## Deploy no Render

1. Push para GitHub
2. Render → New Web Service → conectar repo
3. **Build Command:** `cd frontend && npm install && npm run build && cd ../backend && npm install`
4. **Start Command:** `cd backend && node server.js`
5. **Environment Variable:** `JWT_SECRET` = qualquer string longa
6. **Node Version:** adicione variavel `NODE_VERSION = 20`

## Admin
- Login: `admin` / `admin2026`

## Fluxo de cadastro
1. Admin adiciona participante no painel (nome + login)
2. Admin faz upload da foto do participante
3. Participante acessa `/primeiro-acesso`, informa o login, define senha e faz os palpites bonus
4. Palpites bonus sao definitivos e nao podem ser alterados

## Pontuacao
- Acerto Total (placar exato): 5 pts
- Acerto Parcial (vencedor + gols de um time): 3 pts
- Acerto Basico (so o vencedor): 1 pt
- Campea: 50 pts / Vice: 25 pts
- Melhor Jogador: 25 pts
- Artilheiro: 20 pts / desempate: 10 pts

## Palpite anonimo
- Se NAO marcar: aparece publico antes do jogo
- Se marcar: aparece so apos o inicio da partida
