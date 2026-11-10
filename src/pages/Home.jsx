import { useMemo, useState } from 'react';
import GameCard from '../components/GameCard.jsx';
import { jogos, categoria, estiloCategoria } from '../catalogo.js';

const categorias = [...new Set(jogos.map((j) => j.categoria))];

export default function Home() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const contagem = jogos.length === 1 ? '1 jogo' : `${jogos.length} jogos`;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return jogos.filter(
      (j) =>
        (!filtro || j.categoria === filtro) &&
        `${j.titulo} ${j.descricao}`.toLowerCase().includes(termo),
    );
  }, [busca, filtro]);

  return (
    <>
      <title>The Human Games · Jogos educativos gratuitos</title>
      <section className="hero" data-enter="">
        <h1>
          Jogos gratuitos para aprender <span className="destaque">brincando</span>
        </h1>
        <p>
          {contagem} criados em Santa Luzia do Itanhy (SE), para jogar no celular ou no computador. Sem anúncios e
          sem cadastro.
        </p>
      </section>

      <section className="catalogo" aria-labelledby="titulo-catalogo">
        <div className="catalogo-topo">
          <h2 id="titulo-catalogo">Escolha um jogo</h2>
          <div className="filtros">
            <label className="sr-only" htmlFor="busca">Buscar jogo</label>
            <input
              type="search"
              id="busca"
              placeholder="Buscar jogo..."
              autoComplete="off"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="chips" role="group" aria-label="Filtrar por categoria">
              <button type="button" className="chip" aria-pressed={filtro === ''} onClick={() => setFiltro('')}>
                Todos
              </button>
              {categorias.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={filtro === c}
                  style={estiloCategoria(c)}
                  onClick={() => setFiltro(c)}
                >
                  {categoria(c).nome}
                </button>
              ))}
            </div>
          </div>
        </div>

        {jogos.length === 0 ? (
          <p className="vazio">
            Nenhum jogo ainda. Adicione uma pasta em <code>public/jogos/</code>.
          </p>
        ) : (
          <div className="grade">
            {visiveis.map((j) => (
              <GameCard key={j.id} jogo={j} />
            ))}
          </div>
        )}
        <p className="vazio" role="status" hidden={visiveis.length > 0 || jogos.length === 0}>
          Nenhum jogo com esse nome. Tente outra palavra.
        </p>
      </section>
    </>
  );
}
