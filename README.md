# The Human Games

Portal de jogos educativos do The Human Project. React + Vite, publicado no Azure Static Web Apps.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:4321. `npm run build` gera o site em `build/`.

## Deploy (Azure Static Web Apps)

Predefinição **React**, local do aplicativo `/`, local da API vazio, local de saída `build`.
O Azure cria o workflow em `.github/workflows/` e cada push em `main` publica o site.
As rotas do React (`/jogo/...`) são tratadas por `public/staticwebapp.config.json`.

## Adicionar um jogo

1. Crie uma pasta em `public/jogos/<id-do-jogo>/` (o nome da pasta vira a URL: `/jogo/<id-do-jogo>`).
2. Copie os arquivos do jogo (HTML5) para dentro dela, com o `index.html` na raiz da pasta.
3. Crie um `game.json` na mesma pasta:

```json
{
  "titulo": "Nome do Jogo",
  "descricao": "Uma frase sobre o jogo.",
  "categoria": "educacao-basica",
  "faixa_etaria": "8+",
  "controles": ["teclado", "toque"],
  "autor": "Equipe THP",
  "thumb": "thumb.png",
  "entrada": "index.html",
  "destaque": false
}
```

- `categoria`: `educacao-basica`, `educacao-empreendedora`, `saude` ou `diversao`.
- `thumb` (opcional): imagem 4:3 dentro da pasta do jogo. Sem ela, o card mostra as iniciais.
- `entrada` (opcional): arquivo inicial, padrão `index.html`.

O jogo aparece automaticamente na página inicial (o catálogo é montado a partir dos `game.json` no build). Use caminhos relativos dentro do jogo (`./assets/...`, não `/assets/...`).
