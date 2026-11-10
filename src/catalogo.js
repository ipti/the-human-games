import jogos from 'virtual:jogos';

// cor fills thumbnails and active chips; tinta is the text shade that passes 4.5:1 on white
export const CATEGORIAS = {
  'educacao-basica': { nome: 'Educação Básica', cor: '#55A333', tinta: '#3B7322' },
  'educacao-empreendedora': { nome: 'Empreendedorismo', cor: '#EC8A41', tinta: '#A4501A' },
  saude: { nome: 'Saúde', cor: '#3E8E9E', tinta: '#2A6B77' },
  diversao: { nome: 'Diversão', cor: '#2F6FB5', tinta: '#285F9C' },
};

export function categoria(id) {
  return CATEGORIAS[id] ?? { nome: id, cor: '#2F431E', tinta: '#2F431E' };
}

export function estiloCategoria(id) {
  const c = categoria(id);
  return { '--cor': c.cor, '--tinta-cat': c.tinta };
}

export { jogos };
