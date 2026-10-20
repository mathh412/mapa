// ============================================================
// COMPARAÇÃO TERRITORIAL
// ============================================================

const COR_COMPARACAO_A = "#00506e";
const COR_COMPARACAO_B = "#3b7d95";
const DEBOUNCE_COMPARACAO = 220;

let mapaComparacao = null;
let parceriaComparacaoA = null;
let parceriaComparacaoB = null;
let featureComparacaoA = null;
let featureComparacaoB = null;
let resultadoComparacaoA = null;
let resultadoComparacaoB = null;
let temporizadorComparacao = null;

const cacheParceriasComparacao = new Map();

const camadasComparacao = {
    perimetroA: null,
    perimetroB: null,
    bufferA: null,
    bufferB: null,
    setoresA: null,
    setoresB: null
};

const comparacaoElementos = {};

function carregarElementosComparacao() {
    comparacaoElementos.parceriaA = document.getElementById("comparacao-parceria-a");
    comparacaoElementos.localA = document.getElementById("comparacao-local-a");
    comparacaoElementos.parceriaB = document.getElementById("comparacao-parceria-b");
    comparacaoElementos.localB = document.getElementById("comparacao-local-b");
    comparacaoElementos.raio = document.getElementById("comparacao-raio");
    comparacaoElementos.raioValor = document.getElementById("comparacao-raio-valor");
    comparacaoElementos.criterio = document.getElementById("comparacao-criterio");
    comparacaoElementos.botao = document.getElementById("botao-comparar");
    comparacaoElementos.status = document.getElementById("comparacao-status");
    comparacaoElementos.tabela = document.getElementById("tabela-comparacao");
    comparacaoElementos.nomeA = document.getElementById("legenda-nome-a");
    comparacaoElementos.nomeB = document.getElementById("legenda-nome-b");
}

function inicializarMapaComparacao() {
    mapaComparacao = L.map("map-comparacao", {
        preferCanvas: true,
        zoomControl: true
    }).setView([-23.5505, -46.6333], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }).addTo(mapaComparacao);
}

function preencherParceriasComparacao() {
    const entradas = Object.entries(PARCERIAS).sort((a, b) =>
        a[1].nome.localeCompare(b[1].nome, "pt-BR")
    );

    for (const select of [comparacaoElementos.parceriaA, comparacaoElementos.parceriaB]) {
        select.innerHTML = '<option value="">Selecione</option>';

        for (const [codigo, configuracao] of entradas) {
            const option = document.createElement("option");
            option.value = codigo;
            option.textContent = configuracao.nome;
            select.appendChild(option);
        }
    }
}

async function obterParceriaComparacao(codigo) {
    if (cacheParceriasComparacao.has(codigo)) {
        return cacheParceriasComparacao.get(codigo);
    }

    const configuracao = PARCERIAS[codigo];
    if (!configuracao) throw new Error("Parceria não encontrada.");

    const resposta = await fetch(configuracao.arquivo);
    if (!resposta.ok) throw new Error("Não foi possível carregar a parceria.");

    const dados = await resposta.json();
    cacheParceriasComparacao.set(codigo, dados);
    return dados;
}

function preencherLocaisComparacao(select, geojson) {
    select.innerHTML = '<option value="">Selecione</option>';

    const locais = geojson.features
        .map((feature, indice) => ({
            indice,
            nome: nomeDoLocal(feature)
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    for (const local of locais) {
        const option = document.createElement("option");
        option.value = String(local.indice);
        option.textContent = local.nome;
        select.appendChild(option);
    }

    select.disabled = false;
}

async function alterarParceriaComparacaoA() {
    const codigo = comparacaoElementos.parceriaA.value;

    featureComparacaoA = null;
    parceriaComparacaoA = null;
    comparacaoElementos.localA.disabled = true;
    comparacaoElementos.localA.innerHTML = '<option value="">Selecione</option>';

    if (!codigo) {
        verificarBotaoComparar();
        return;
    }

    try {
        parceriaComparacaoA = await obterParceriaComparacao(codigo);
        preencherLocaisComparacao(comparacaoElementos.localA, parceriaComparacaoA);
    }
    catch (erro) {
        console.error(erro);
    }

    verificarBotaoComparar();
}

async function alterarParceriaComparacaoB() {
    const codigo = comparacaoElementos.parceriaB.value;

    featureComparacaoB = null;
    parceriaComparacaoB = null;
    comparacaoElementos.localB.disabled = true;
    comparacaoElementos.localB.innerHTML = '<option value="">Selecione</option>';

    if (!codigo) {
        verificarBotaoComparar();
        return;
    }

    try {
        parceriaComparacaoB = await obterParceriaComparacao(codigo);
        preencherLocaisComparacao(comparacaoElementos.localB, parceriaComparacaoB);
    }
    catch (erro) {
        console.error(erro);
    }

    verificarBotaoComparar();
}

function alterarLocalComparacaoA() {
    const valor = comparacaoElementos.localA.value;

    featureComparacaoA = valor === ""
        ? null
        : parceriaComparacaoA.features[Number(valor)];

    verificarBotaoComparar();

    if (featureComparacaoA && featureComparacaoB) agendarComparacao();
}

function alterarLocalComparacaoB() {
    const valor = comparacaoElementos.localB.value;

    featureComparacaoB = valor === ""
        ? null
        : parceriaComparacaoB.features[Number(valor)];

    verificarBotaoComparar();

    if (featureComparacaoA && featureComparacaoB) agendarComparacao();
}

function verificarBotaoComparar() {
    const valido = Boolean(featureComparacaoA && featureComparacaoB);
    comparacaoElementos.botao.disabled = !valido;
    comparacaoElementos.status.textContent = valido
        ? "Pronto para comparar"
        : "Selecione dois empreendimentos";
}

function atualizarRaioComparacao() {
    const valor = Number(comparacaoElementos.raio.value);
    comparacaoElementos.raioValor.textContent = formatarRaio(valor);

    if (featureComparacaoA && featureComparacaoB) agendarComparacao();
}

function agendarComparacao() {
    clearTimeout(temporizadorComparacao);
    temporizadorComparacao = setTimeout(executarComparacao, DEBOUNCE_COMPARACAO);
}

function calcularAreaSelecionada(selecionados, criterio) {
    let area = 0;

    for (const item of selecionados) {
        const dados = dadosDaFeature(item.feature);
        const areaSetor = numero(dados.area_km2);
        const fator = criterio === "proporcional" ? item.fator : 1;
        area += areaSetor * fator;
    }

    return area;
}

function calcularIPVSAlto(contagem, total) {
    if (!total) return 0;

    let alto = 0;

    for (const [nome, quantidade] of Object.entries(contagem)) {
        const chave = nome.trim().toLowerCase();

        if (
            chave.includes("vulnerabilidade alta") ||
            chave.includes("vulnerabilidade muito alta")
        ) {
            alto += quantidade;
        }
    }

    return alto / total * 100;
}

function calcularDerivadosComparacao(selecionados, resultado, criterio) {
    const totalRaca =
        resultado.branca +
        resultado.preta +
        resultado.parda +
        resultado.amarela +
        resultado.indigena;

    const pretaParda = totalRaca > 0
        ? (resultado.preta + resultado.parda) / totalRaca * 100
        : 0;

    const totalGenero = resultado.feminina + resultado.masculina;

    const feminina = totalGenero > 0
        ? resultado.feminina / totalGenero * 100
        : 0;

    const coberturaIPVS = resultado.setores > 0
        ? resultado.setoresComIPVS / resultado.setores * 100
        : 0;

    const ipvsAlto = calcularIPVSAlto(
        resultado.ipvsContagem,
        resultado.setoresComIPVS
    );

    const area = calcularAreaSelecionada(selecionados, criterio);
    const densidade = area > 0 ? resultado.populacao / area : 0;

    return {
        pretaParda,
        feminina,
        coberturaIPVS,
        ipvsAlto,
        area,
        densidade
    };
}

function calcularEmpreendimentoComparacao(feature, raio, criterio) {
    const buffer = criarBuffer(feature, raio);
    const selecionados = selecionarSetores(buffer, criterio);
    const resultadoIndicadores = calcularIndicadoresSelecionados(selecionados, criterio);
    const derivados = calcularDerivadosComparacao(
        selecionados,
        resultadoIndicadores,
        criterio
    );

    return {
        feature,
        buffer,
        selecionados,
        indicadores: resultadoIndicadores,
        derivados
    };
}

function limparCamadasComparacao() {
    for (const chave of Object.keys(camadasComparacao)) {
        const camada = camadasComparacao[chave];

        if (camada) {
            mapaComparacao.removeLayer(camada);
            camadasComparacao[chave] = null;
        }
    }
}

function desenharResultadoComparacao() {
    limparCamadasComparacao();

    if (!resultadoComparacaoA || !resultadoComparacaoB) return;

    camadasComparacao.setoresA = L.geoJSON({
        type: "FeatureCollection",
        features: resultadoComparacaoA.selecionados.map(item => item.feature)
    }, {
        interactive: false,
        style: {
            color: "#ffffff",
            weight: 0.45,
            fillColor: COR_COMPARACAO_A,
            fillOpacity: 0.15
        }
    }).addTo(mapaComparacao);

    camadasComparacao.setoresB = L.geoJSON({
        type: "FeatureCollection",
        features: resultadoComparacaoB.selecionados.map(item => item.feature)
    }, {
        interactive: false,
        style: {
            color: "#ffffff",
            weight: 0.45,
            fillColor: COR_COMPARACAO_B,
            fillOpacity: 0.15
        }
    }).addTo(mapaComparacao);

    camadasComparacao.bufferA = L.geoJSON(resultadoComparacaoA.buffer, {
        interactive: false,
        style: {
            color: COR_COMPARACAO_A,
            weight: 2,
            dashArray: "7 5",
            fillColor: COR_COMPARACAO_A,
            fillOpacity: 0.04
        }
    }).addTo(mapaComparacao);

    camadasComparacao.bufferB = L.geoJSON(resultadoComparacaoB.buffer, {
        interactive: false,
        style: {
            color: COR_COMPARACAO_B,
            weight: 2,
            dashArray: "7 5",
            fillColor: COR_COMPARACAO_B,
            fillOpacity: 0.04
        }
    }).addTo(mapaComparacao);

    camadasComparacao.perimetroA = L.geoJSON(resultadoComparacaoA.feature, {
        style: {
            color: COR_COMPARACAO_A,
            weight: 3,
            fillColor: COR_COMPARACAO_A,
            fillOpacity: 0.35
        }
    }).addTo(mapaComparacao);

    camadasComparacao.perimetroB = L.geoJSON(resultadoComparacaoB.feature, {
        style: {
            color: COR_COMPARACAO_B,
            weight: 3,
            fillColor: COR_COMPARACAO_B,
            fillOpacity: 0.35
        }
    }).addTo(mapaComparacao);

    const grupo = L.featureGroup([
        camadasComparacao.bufferA,
        camadasComparacao.bufferB
    ]);

    const limites = grupo.getBounds();

    if (limites.isValid()) {
        mapaComparacao.fitBounds(limites, {
            padding: [35, 35],
            maxZoom: 14
        });
    }
}

function diferencaAbsoluta(a, b) {
    return numero(b) - numero(a);
}

function classeDiferenca(valor) {
    if (valor > 0) return "positiva";
    if (valor < 0) return "negativa";
    return "";
}

function formatarSinal(valor, formatador) {
    const n = numero(valor);
    if (n > 0) return `+${formatador(n)}`;
    if (n < 0) return `−${formatador(Math.abs(n))}`;
    return formatador(0);
}

function linhaComparacao(titulo, valorA, valorB, formatador, tipo = "normal") {
    const diferenca = diferencaAbsoluta(valorA, valorB);

    const textoDiferenca = tipo === "percentual"
        ? formatarSinal(diferenca, valor => `${formatarNumero(valor, 1)} p.p.`)
        : formatarSinal(diferenca, formatador);

    return `
        <div class="comparacao-linha">
            <div class="comparacao-metrica">${titulo}</div>
            <div class="comparacao-valor-a">${formatador(valorA)}</div>
            <div class="comparacao-valor-b">${formatador(valorB)}</div>
            <div class="comparacao-diferenca ${classeDiferenca(diferenca)}">${textoDiferenca}</div>
        </div>
    `;
}

function miniComparacao(titulo, valorA, valorB) {
    const maximo = Math.max(valorA, valorB, 1);
    const larguraA = valorA / maximo * 100;
    const larguraB = valorB / maximo * 100;

    return `
        <div class="mini-comparacao">
            <div class="mini-comparacao-titulo">${titulo}</div>

            <div class="mini-comparacao-linha">
                <div class="mini-comparacao-letra a">A</div>
                <div class="mini-comparacao-trilho">
                    <div class="mini-comparacao-barra a" style="width:${larguraA}%;"></div>
                </div>
                <div class="mini-comparacao-valor">${formatarPercentual(valorA)}</div>
            </div>

            <div class="mini-comparacao-linha">
                <div class="mini-comparacao-letra b">B</div>
                <div class="mini-comparacao-trilho">
                    <div class="mini-comparacao-barra b" style="width:${larguraB}%;"></div>
                </div>
                <div class="mini-comparacao-valor">${formatarPercentual(valorB)}</div>
            </div>
        </div>
    `;
}

function renderizarTabelaComparacao() {
    const a = resultadoComparacaoA;
    const b = resultadoComparacaoB;

    if (!a || !b) return;

    const nomeA = nomeDoLocal(a.feature);
    const nomeB = nomeDoLocal(b.feature);

    comparacaoElementos.nomeA.textContent = nomeA;
    comparacaoElementos.nomeB.textContent = nomeB;

    const ia = a.indicadores;
    const ib = b.indicadores;
    const da = a.derivados;
    const db = b.derivados;

    comparacaoElementos.tabela.innerHTML = `
        <div class="comparacao-tabela-cabecalho">
            <div></div>

            <div class="comparacao-cabecalho-local">
                <span>A</span>
                <strong title="${nomeA}">${nomeA}</strong>
            </div>

            <div class="comparacao-cabecalho-local local-b">
                <span>B</span>
                <strong title="${nomeB}">${nomeB}</strong>
            </div>

            <div class="comparacao-col-diferenca">B − A</div>
        </div>

        ${linhaComparacao("Setores censitários", ia.setores, ib.setores, formatarInteiro)}
        ${linhaComparacao("População", ia.populacao, ib.populacao, formatarInteiro)}
        ${linhaComparacao("Área analisada", da.area, db.area, valor => `${formatarNumero(valor, 2)} km²`)}
        ${linhaComparacao("Densidade", da.densidade, db.densidade, valor => `${formatarInteiro(valor)} hab./km²`)}
        ${linhaComparacao("Renda mediana", ia.rendaMediana, ib.rendaMediana, formatarMoeda)}
        ${linhaComparacao("Cobertura IPVS", da.coberturaIPVS, db.coberturaIPVS, formatarPercentual, "percentual")}

        <div class="comparacao-bloco-percentuais">
            <h3>Composição territorial</h3>
            ${miniComparacao("População preta + parda", da.pretaParda, db.pretaParda)}
            ${miniComparacao("População feminina", da.feminina, db.feminina)}
            ${miniComparacao("Vulnerabilidade alta / muito alta", da.ipvsAlto, db.ipvsAlto)}
        </div>
    `;
}

function executarComparacao() {
    if (!featureComparacaoA || !featureComparacaoB) return;

    if (!indiceSetores?.length || !indicadores) {
        comparacaoElementos.status.textContent = "Aguardando dados territoriais...";
        return;
    }

    const raio = Number(comparacaoElementos.raio.value);
    const criterio = comparacaoElementos.criterio.value;

    comparacaoElementos.status.textContent = "Calculando comparação...";
    const inicio = performance.now();

    try {
        resultadoComparacaoA = calcularEmpreendimentoComparacao(
            featureComparacaoA,
            raio,
            criterio
        );

        resultadoComparacaoB = calcularEmpreendimentoComparacao(
            featureComparacaoB,
            raio,
            criterio
        );

        desenharResultadoComparacao();
        renderizarTabelaComparacao();

        const tempo = performance.now() - inicio;
        comparacaoElementos.status.textContent = `Comparação concluída • ${Math.round(tempo)} ms`;
    }
    catch (erro) {
        console.error(erro);
        comparacaoElementos.status.textContent = "Erro ao calcular comparação";
    }
}

function registrarEventosComparacao() {
    comparacaoElementos.parceriaA.addEventListener("change", alterarParceriaComparacaoA);
    comparacaoElementos.parceriaB.addEventListener("change", alterarParceriaComparacaoB);
    comparacaoElementos.localA.addEventListener("change", alterarLocalComparacaoA);
    comparacaoElementos.localB.addEventListener("change", alterarLocalComparacaoB);
    comparacaoElementos.raio.addEventListener("input", atualizarRaioComparacao);

    comparacaoElementos.criterio.addEventListener("change", () => {
        if (featureComparacaoA && featureComparacaoB) agendarComparacao();
    });

    comparacaoElementos.botao.addEventListener("click", executarComparacao);

    const botaoAbaComparacao = document.querySelector('.aba-navegacao[data-tab="comparacao"]');

    botaoAbaComparacao?.addEventListener("click", () => {
        setTimeout(() => {
            mapaComparacao?.invalidateSize({ animate: false });
        }, 100);
    });
}

function iniciarComparacao() {
    carregarElementosComparacao();
    inicializarMapaComparacao();
    preencherParceriasComparacao();
    registrarEventosComparacao();
    atualizarRaioComparacao();
}

document.addEventListener("DOMContentLoaded", iniciarComparacao);
