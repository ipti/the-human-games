import { Link } from 'react-router-dom';
import { categoria, estiloCategoria } from '../catalogo.js';

export default function GameCard({ jogo }) {
  const cat = categoria(jogo.categoria);
  const iniciais = jogo.titulo
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <Link to={`/jogo/${jogo.id}`} className="card" style={estiloCategoria(jogo.categoria)}>
      <div className="thumb">
        {jogo.thumb ? (
          <img src={`/jogos/${jogo.id}/${jogo.thumb}`} alt="" width="480" height="360" loading="lazy" decoding="async" />
        ) : (
          <span className="iniciais" aria-hidden="true">{iniciais}</span>
        )}
        <span className="jogar" aria-hidden="true">▶ Jogar</span>
      </div>
      <div className="info">
        <h3>{jogo.titulo}</h3>
        <span className="tag">{cat.nome}</span>
      </div>
    </Link>
  );
}
