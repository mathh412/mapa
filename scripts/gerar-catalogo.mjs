import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizPadrao = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arquivosConhecidos = ['perimetros.geojson', 'blocos.geojson', 'conjuntos.geojson', 'estruturas.geojson'];
const tipos = new Set(['education', 'park', 'terminal', 'market', 'sport', 'cemetery', 'events', 'publicspace', 'housing', 'unknown']);

export async function gerarCatalogo(raiz = raizPadrao, verificar = false) {
    const pasta = join(raiz, 'grupos');
    const diretorios = (await readdir(pasta, { withFileTypes: true }))
        .filter(item => item.isDirectory()).map(item => item.name).sort();
    const grupos = [];
    for (const codigo of diretorios) {
        const config = JSON.parse(await readFile(join(pasta, codigo, 'config.json'), 'utf8'));
        if (!/^[a-z0-9][a-z0-9_-]*$/.test(codigo) || config.codigo !== codigo) {
            throw new Error(`${codigo}: codigo deve coincidir com a pasta (letras minúsculas, números, _ e -).`);
        }
        for (const campo of ['nome', 'categoria']) {
            if (typeof config[campo] !== 'string' || !config[campo].trim()) throw new Error(`${codigo}: ${campo} obrigatório.`);
        }
        if (typeof config.ativo !== 'boolean') throw new Error(`${codigo}: ativo deve ser booleano.`);
        if (config.tipo !== undefined && !tipos.has(config.tipo)) throw new Error(`${codigo}: tipo de ícone inválido.`);
        const existentes = new Set(await readdir(join(pasta, codigo)));
        const arquivos = arquivosConhecidos.filter(arquivo => existentes.has(arquivo));
        if (!arquivos.includes('perimetros.geojson')) throw new Error(`${codigo}: perimetros.geojson obrigatório.`);
        for (const arquivo of arquivos) {
            const geo = JSON.parse(await readFile(join(pasta, codigo, arquivo), 'utf8'));
            if (geo.type !== 'FeatureCollection' || !Array.isArray(geo.features)
                || geo.features.some(f => f?.type !== 'Feature' || !f.geometry || !Array.isArray(f.geometry.coordinates))) {
                throw new Error(`${codigo}/${arquivo}: FeatureCollection ou geometria inválida.`);
            }
            if (arquivo === 'perimetros.geojson' && config.ativo && !geo.features.length) {
                throw new Error(`${codigo}: parceria ativa precisa de equipamento.`);
            }
        }
        grupos.push({ codigo, nome: config.nome.trim(), categoria: config.categoria.trim(), ativo: config.ativo,
            ...(config.tipo ? { tipo: config.tipo } : {}), arquivos });
    }
    const conteudo = JSON.stringify({ versao: 1, grupos }, null, 2) + '\n';
    const destino = join(pasta, 'catalogo.json');
    if (verificar) {
        if (await readFile(destino, 'utf8') !== conteudo) throw new Error('Catálogo desatualizado. Execute node scripts/gerar-catalogo.mjs.');
    } else {
        await writeFile(destino, conteudo);
    }
    return { versao: 1, grupos };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const catalogo = await gerarCatalogo(raizPadrao, process.argv.includes('--check'));
        console.log(`Catálogo ${process.argv.includes('--check') ? 'verificado' : 'gerado'}: ${catalogo.grupos.length} grupos.`);
    } catch (erro) {
        console.error(erro.message);
        process.exitCode = 1;
    }
}
