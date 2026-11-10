import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <header className="topo">
        <div className="wrap topo-linha">
          <Link to="/" className="marca" aria-label="The Human Games, página inicial">
            <img src="/marca/thp-sigla.png" alt="" width="52" height="43" />
            <span className="marca-nome">The Human<br /><strong>Games</strong></span>
          </Link>
          <nav aria-label="Principal">
            <Link to="/" className="link-nav">Jogos</Link>
            <a href="https://www.thehumanproject.org.br/" target="_blank" rel="noopener" className="link-nav externo">
              The Human Project
            </a>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="wrap" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="rodape">
        <div className="wrap rodape-linha">
          <span>Uma iniciativa</span>
          <a href="https://www.thehumanproject.org.br/" target="_blank" rel="noopener" className="rodape-logo">
            <img src="/marca/thp-logo.png" alt="The Human Project" width="152" height="44" />
          </a>
        </div>
      </footer>
    </>
  );
}
