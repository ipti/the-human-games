import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import GameCard from '../components/GameCard.jsx';
import NaoEncontrado from './NaoEncontrado.jsx';
import { jogos, categoria, estiloCategoria } from '../catalogo.js';

export default function Jogo() {
  const { id } = useParams();
  const palco = useRef(null);
  const iframe = useRef(null);
  const jogo = jogos.find((j) => j.id === id);
  if (!jogo) return <NaoEncontrado />;

  const cat = categoria(jogo.categoria);
  const relacionados = jogos.filter((j) => j.id !== jogo.id).slice(0, 4);
  const src = `/jogos/${jogo.id}/${jogo.entrada}`;

  return (
    <>
      <title>{`${jogo.titulo} · The Human Games`}</title>

      <Link to="/" className="voltar">← Todos os jogos</Link>

      <div className="palco" ref={palco} data-enter="">
        {/* allow-same-origin keeps localStorage working for trusted games; drop it once games are served from a separate domain */}
        <iframe
          key={jogo.id}
          ref={iframe}
          src={src}
          title={`Jogo: ${jogo.titulo}`}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          allow="fullscreen; autoplay; gamepad"
          onLoad={(e) => e.currentTarget.focus()}
        />
      </div>

      <div className="barra">
        <div>
          <h1>{jogo.titulo}</h1>
          <div className="meta">
            <span className="tag" style={estiloCategoria(jogo.categoria)}>{cat.nome}</span>
            {jogo.faixa_etaria && <span>{jogo.faixa_etaria} anos</span>}
            {jogo.autor && <span>por {jogo.autor}</span>}
          </div>
        </div>
        <div className="acoes">
          <button type="button" className="btn secundario" onClick={() => (iframe.current.src = src)}>
            ↻ Reiniciar jogo
          </button>
          <button type="button" className="btn" onClick={() => palco.current.requestFullscreen?.()}>
            ⛶ Jogar em tela cheia
          </button>
        </div>
      </div>

      <div className="sobre">
        <p className="descricao">{jogo.descricao}</p>
        {jogo.controles && (
          <div className="controles">
            <h2>Como jogar</h2>
            <ul>
              {jogo.controles.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {relacionados.length > 0 && (
        <section className="relacionados" aria-labelledby="titulo-outros">
          <h2 id="titulo-outros">Outros jogos</h2>
          <div className="grade">
            {relacionados.map((j) => (
              <GameCard key={j.id} jogo={j} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
