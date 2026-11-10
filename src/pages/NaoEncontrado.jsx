import { Link } from 'react-router-dom';

export default function NaoEncontrado() {
  return (
    <>
      <title>Página não encontrada · The Human Games</title>
      <section className="nao-encontrado">
        <h1>Não achamos essa página</h1>
        <p>O jogo pode ter mudado de endereço.</p>
        <Link to="/" className="btn">Ver todos os jogos</Link>
      </section>
    </>
  );
}
