import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const JOGOS_DIR = path.resolve('public/jogos');
const VIRTUAL_ID = 'virtual:jogos';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

function lerJogos() {
  if (!fs.existsSync(JOGOS_DIR)) return [];
  return fs
    .readdirSync(JOGOS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const dir = path.join(JOGOS_DIR, d.name);
      const manifest = path.join(dir, 'game.json');
      if (!fs.existsSync(manifest)) {
        console.warn(`[jogos] ${d.name}: game.json não encontrado, ignorando`);
        return [];
      }
      const data = JSON.parse(fs.readFileSync(manifest, 'utf-8'));
      const entrada = data.entrada ?? 'index.html';
      if (!fs.existsSync(path.join(dir, entrada))) {
        console.warn(`[jogos] ${d.name}: ${entrada} não encontrado, ignorando`);
        return [];
      }
      return [{ ...data, id: d.name, entrada }];
    })
    .sort((a, b) => Number(!!b.destaque) - Number(!!a.destaque) || a.titulo.localeCompare(b.titulo));
}

// Exposes the game catalog built from public/jogos/*/game.json as `import jogos from 'virtual:jogos'`.
function catalogoDeJogos() {
  return {
    name: 'catalogo-de-jogos',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) return `export default ${JSON.stringify(lerJogos())};`;
    },
    configureServer(server) {
      server.watcher.add(JOGOS_DIR);
      const recarregar = (arquivo) => {
        if (!arquivo.startsWith(JOGOS_DIR)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', recarregar);
      server.watcher.on('change', recarregar);
      server.watcher.on('unlink', recarregar);
      server.watcher.on('addDir', recarregar);
      server.watcher.on('unlinkDir', recarregar);
    },
  };
}

export default defineConfig({
  plugins: [react(), catalogoDeJogos()],
  server: { port: 4321 },
  preview: { port: 4321 },
  build: { outDir: 'build' },
});
