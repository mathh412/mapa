// ============================================================
// DASHBOARD SPP — MOTOR ANALÍTICO PRINCIPAL
// ============================================================

const URL_SETORES = "../dados/setores/setores_sp_web.geojson";
const URL_INDICADORES = "../dados/setores/indicadores_sp.json";
const TEMPO_DEBOUNCE = 220;

// Preenchido por parcerias.js antes do DOMContentLoaded.
const PARCERIAS = {};

const CORES_QUANTITATIVAS = [
    "#dceff5",
    "#b6d7e3",
    "#80b0c0",
    "#3b7d95",
    "#00506e"
];

const CORES_IPVS = {
    "vulnerabilidade muito baixa": "#d7eee5",
    "vulnerabilidade baixa": "#aad6c1",
    "vulnerabilidade média": "#f0dc91",
    "vulnerabilidade media": "#f0dc91",
    "vulnerabilidade alta": "#e6a06d",
    "vulnerabilidade muito alta": "#c85d52"
};

const COR_SEM_DADO = "#cfd6d9";

let mapa = null;
let setoresGeoJSON = null;
let indicadores = null;
let indiceSetores = [];
let parceriaGeoJSON = null;
let empreendimentoSelecionado = null;
let camadaEmpreendimento = null;
let camadaBuffer = null;
let camadaSetoresSelecionados = null;
let temporizadorRaio = null;
let numeroAnalise = 0;
let ultimosSelecionados = [];
let escalaTemaAtual = null;
let dadosFaixasDistancia = [];

const elementos = {};

// ============================================================
// ELEMENTOS
// ============================================================

function carregarElementos() {
    elementos.parceria = document.getElementById("filtro-parceria");
    elementos.local = document.getElementById("filtro-local");
    elementos.raio = document.getElementById("filtro-raio");
    elementos.criterio = document.getElementById("filtro-criterio");
    elementos.valorRaio = document.getElementById("valor-raio");
    elementos.tema = document.getElementById("filtro-tema-mapa");
    elementos.legenda = document.getElementById("legenda-mapa");
    elementos.indicadorDistancia = document.getElementById("filtro-indicador-distancia");
    elementos.passoFaixa = document.getElementById("filtro-passo-faixa");
    elementos.graficoDistancia = document.getElementById("grafico-distancia");
}

// ============================================================
// MAPA PADRÃO
// ============================================================
// Esta função é sobrescrita por mapa-iframe.js na Visão Geral.
// Ela permanece aqui para o motor continuar reutilizável.

function inicializarMapa() {
    const alvo = document.getElementById("map");
    if (!alvo) return;

    mapa = L.map("map", {
        preferCanvas: true,
        zoomControl: true
    }).setView([-23.5505, -46.6333], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }).addTo(mapa);
}

// ============================================================
// UTILIDADES
// ============================================================

function numero(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}

function formatarInteiro(valor) {
    return Math.round(numero(valor)).toLocaleString("pt-BR");
}

function formatarMoeda(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return "-";

    return n.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0
    });
}

function formatarNumero(valor, casas = 1) {
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

function formatarPercentual(valor) {
    return `${formatarNumero(valor, 1)}%`;
}

function formatarRaio(valor) {
    const n = Number(valor);
    if (n < 1000) return `${n} m`;
    return `${formatarNumero(n / 1000, 2)} km`;
}

function formatarDistanciaCurta(metros) {
    if (metros < 1000) return `${Math.round(metros)} m`;
    return `${formatarNumero(metros / 1000, 2)} km`;
}

function dadosDaFeature(feature) {
    const codigo = String(feature?.properties?.CD_SETOR ?? "");
    return indicadores?.[codigo] || {};
}

function calcularMediana(valores) {
    const lista = valores
        .filter(valor => Number.isFinite(Number(valor)))
        .map(Number)
        .sort((a, b) => a - b);

    if (!lista.length) return null;

    const meio = Math.floor(lista.length / 2);
    if (lista.length % 2) return lista[meio];
    return (lista[meio - 1] + lista[meio]) / 2;
}

// ============================================================
// STATUS
// ============================================================

function atualizarStatus(texto, tipo = "carregando") {
    const indicador = document.getElementById("status-indicador");
    const textoElemento = document.getElementById("status-texto");

    if (!indicador || !textoElemento) return;

    indicador.className = "";

    if (tipo === "ok") indicador.classList.add("status-ok");
    else if (tipo === "erro") indicador.classList.add("status-erro");
    else indicador.classList.add("status-carregando");

    textoElemento.textContent = texto;
}

// ============================================================
// CARREGAMENTO DOS DADOS
// ============================================================

async function carregarDados() {
    try {
        atualizarStatus("Carregando dados...");

        const [respostaSetores, respostaIndicadores] = await Promise.all([
            fetch(URL_SETORES),
            fetch(URL_INDICADORES)
        ]);

        if (!respostaSetores.ok) {
            throw new Error(`Erro ao carregar setores: ${respostaSetores.status}`);
        }

        if (!respostaIndicadores.ok) {
            throw new Error(`Erro ao carregar indicadores: ${respostaIndicadores.status}`);
        }

        setoresGeoJSON = await respostaSetores.json();
        indicadores = await respostaIndicadores.json();

        atualizarStatus("Preparando índice espacial...");
        prepararIndiceSetores();
        prepararFiltroParcerias();
        limparIndicadores();
        atualizarLegendaMapa();
        atualizarStatus("Dados carregados", "ok");
    }
    catch (erro) {
        console.error(erro);
        atualizarStatus("Erro ao carregar dados", "erro");
    }
}

// ============================================================
// ÍNDICE ESPACIAL SIMPLES
// ============================================================

function prepararIndiceSetores() {
    indiceSetores = setoresGeoJSON.features.map(feature => {
        try {
            return {
                feature,
                bbox: turf.bbox(feature),
                centroide: turf.centroid(feature)
            };
        }
        catch (erro) {
            return {
                feature,
                bbox: null,
                centroide: null
            };
        }
    });
}

function bboxIntersects(a, b) {
    if (!a || !b) return false;

    return !(
        a[2] < b[0] ||
        a[0] > b[2] ||
        a[3] < b[1] ||
        a[1] > b[3]
    );
}

// ============================================================
// PARCERIAS
// ============================================================

function prepararFiltroParcerias() {
    elementos.parceria.innerHTML = '<option value="">Selecione</option>';

    const entradas = Object.entries(PARCERIAS).sort((a, b) =>
        a[1].nome.localeCompare(b[1].nome, "pt-BR")
    );

    for (const [codigo, configuracao] of entradas) {
        const option = document.createElement("option");
        option.value = codigo;
        option.textContent = configuracao.nome;
        elementos.parceria.appendChild(option);
    }

    elementos.parceria.disabled = false;
    elementos.local.disabled = true;
    elementos.raio.disabled = true;
    elementos.criterio.disabled = true;
    elementos.tema.disabled = true;
    elementos.indicadorDistancia.disabled = true;
    elementos.passoFaixa.disabled = true;
}

async function alterarParceria() {
    const codigo = elementos.parceria.value;

    limparAnaliseCompleta();

    elementos.local.innerHTML = '<option value="">Selecione</option>';
    elementos.local.disabled = true;
    elementos.raio.disabled = true;
    elementos.criterio.disabled = true;
    elementos.tema.disabled = true;
    elementos.indicadorDistancia.disabled = true;
    elementos.passoFaixa.disabled = true;

    if (!codigo) {
        parceriaGeoJSON = null;
        return;
    }

    try {
        const configuracao = PARCERIAS[codigo];
        atualizarStatus(`Carregando ${configuracao.nome}...`);

        const resposta = await fetch(configuracao.arquivo);
        if (!resposta.ok) throw new Error("Erro ao carregar parceria.");

        parceriaGeoJSON = await resposta.json();
        preencherLocais();
        atualizarStatus(`${configuracao.nome} carregado`, "ok");
    }
    catch (erro) {
        console.error(erro);
        atualizarStatus("Erro ao carregar parceria", "erro");
    }
}

function nomeDoLocal(feature) {
    const p = feature?.properties || {};

    return (
        p.Equipamento ||
        p.equipamento ||
        p.Nome ||
        p.nome ||
        p.Local ||
        p.local ||
        p.Name ||
        p.name ||
        "Local sem nome"
    );
}

function preencherLocais() {
    elementos.local.innerHTML = '<option value="">Selecione</option>';

    const locais = parceriaGeoJSON.features
        .map((feature, indice) => ({
            indice,
            nome: nomeDoLocal(feature)
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    for (const local of locais) {
        const option = document.createElement("option");
        option.value = String(local.indice);
        option.textContent = local.nome;
        elementos.local.appendChild(option);
    }

    elementos.local.disabled = false;
}

function alterarLocal() {
    limparAnaliseGeografica();

    const valor = elementos.local.value;

    if (valor === "") {
        empreendimentoSelecionado = null;
        elementos.raio.disabled = true;
        elementos.criterio.disabled = true;
        elementos.tema.disabled = true;
        elementos.indicadorDistancia.disabled = true;
        elementos.passoFaixa.disabled = true;
        limparIndicadores();
        limparGraficoDistancia();
        return;
    }

    empreendimentoSelecionado = parceriaGeoJSON.features[Number(valor)];

    desenharEmpreendimento(empreendimentoSelecionado);

    elementos.raio.disabled = false;
    elementos.criterio.disabled = false;
    elementos.tema.disabled = false;
    elementos.indicadorDistancia.disabled = false;
    elementos.passoFaixa.disabled = false;

    executarAnalise();
}

// ============================================================
// EMPREENDIMENTO / BUFFER
// ============================================================
// Estas funções são substituídas pelo adaptador do iframe.

function desenharEmpreendimento(feature) {
    if (!mapa?.addLayer) return;

    if (camadaEmpreendimento) mapa.removeLayer(camadaEmpreendimento);

    camadaEmpreendimento = L.geoJSON(feature, {
        style: {
            color: "#00506e",
            weight: 3,
            fillColor: "#3b7d95",
            fillOpacity: 0.25
        }
    }).addTo(mapa);

    camadaEmpreendimento.bindTooltip(nomeDoLocal(feature), { sticky: true });
}

function criarBuffer(feature, raio) {
    return turf.buffer(feature, raio, {
        units: "meters",
        steps: 16
    });
}

function desenharBuffer(buffer) {
    if (!mapa?.addLayer) return;

    if (camadaBuffer) mapa.removeLayer(camadaBuffer);

    camadaBuffer = L.geoJSON(buffer, {
        interactive: false,
        style: {
            color: "#00506e",
            weight: 2,
            opacity: 0.9,
            dashArray: "7 5",
            fillColor: "#3b7d95",
            fillOpacity: 0.06
        }
    }).addTo(mapa);

    camadaEmpreendimento?.bringToFront?.();
}

// ============================================================
// SELEÇÃO TERRITORIAL
// ============================================================

function buscarCandidatos(buffer) {
    const bboxBuffer = turf.bbox(buffer);
    return indiceSetores.filter(item => bboxIntersects(item.bbox, bboxBuffer));
}

function selecionarPorCentroide(candidatos, buffer) {
    const resultado = [];

    for (const item of candidatos) {
        if (!item.centroide) continue;

        try {
            if (turf.booleanPointInPolygon(item.centroide, buffer)) {
                resultado.push({ feature: item.feature, fator: 1 });
            }
        }
        catch (erro) {}
    }

    return resultado;
}

function selecionarPorIntersecao(candidatos, buffer) {
    const resultado = [];

    for (const item of candidatos) {
        try {
            if (turf.booleanIntersects(item.feature, buffer)) {
                resultado.push({ feature: item.feature, fator: 1 });
            }
        }
        catch (erro) {}
    }

    return resultado;
}

function selecionarProporcional(candidatos, buffer) {
    const resultado = [];

    for (const item of candidatos) {
        try {
            if (!turf.booleanIntersects(item.feature, buffer)) continue;

            const areaTotal = turf.area(item.feature);
            if (!areaTotal) continue;

            const intersecao = turf.intersect(item.feature, buffer);
            if (!intersecao) continue;

            let fator = turf.area(intersecao) / areaTotal;
            fator = Math.max(0, Math.min(1, fator));

            if (fator > 0) {
                resultado.push({ feature: item.feature, fator });
            }
        }
        catch (erro) {}
    }

    return resultado;
}

function selecionarSetores(buffer, criterio) {
    const candidatos = buscarCandidatos(buffer);

    if (criterio === "intersecao") {
        return selecionarPorIntersecao(candidatos, buffer);
    }

    if (criterio === "proporcional") {
        return selecionarProporcional(candidatos, buffer);
    }

    return selecionarPorCentroide(candidatos, buffer);
}

// ============================================================
// MAPA TEMÁTICO
// ============================================================

function valorTema(feature, tema) {
    const dados = dadosDaFeature(feature);

    if (tema === "renda") {
        const valor = Number(dados.renda);
        return Number.isFinite(valor) ? valor : null;
    }

    if (tema === "densidade") {
        const pop = numero(dados.populacao);
        const area = numero(dados.area_km2);
        return area > 0 ? pop / area : null;
    }

    if (tema === "pretaparda") {
        const branca = numero(dados.branca);
        const preta = numero(dados.preta);
        const parda = numero(dados.parda);
        const amarela = numero(dados.amarela);
        const indigena = numero(dados.indigena);
        const total = branca + preta + parda + amarela + indigena;
        return total > 0 ? ((preta + parda) / total) * 100 : null;
    }

    if (tema === "feminina") {
        const feminina = numero(dados.feminina);
        const masculina = numero(dados.masculina);
        const total = feminina + masculina;
        return total > 0 ? (feminina / total) * 100 : null;
    }

    return null;
}

function quantil(valores, percentual) {
    if (!valores.length) return 0;

    const posicao = (valores.length - 1) * percentual;
    const base = Math.floor(posicao);
    const resto = posicao - base;

    if (valores[base + 1] !== undefined) {
        return valores[base] + resto * (valores[base + 1] - valores[base]);
    }

    return valores[base];
}

function prepararEscalaTematica() {
    escalaTemaAtual = null;

    const tema = elementos.tema?.value || "padrao";
    if (tema === "padrao" || tema === "ipvs") return;

    const valores = ultimosSelecionados
        .map(item => valorTema(item.feature, tema))
        .filter(valor => valor !== null && Number.isFinite(valor))
        .sort((a, b) => a - b);

    if (!valores.length) return;

    escalaTemaAtual = {
        limites: [
            quantil(valores, 0.20),
            quantil(valores, 0.40),
            quantil(valores, 0.60),
            quantil(valores, 0.80)
        ]
    };
}

function corQuantitativa(valor) {
    if (valor === null || !escalaTemaAtual) return COR_SEM_DADO;

    const limites = escalaTemaAtual.limites;

    if (valor <= limites[0]) return CORES_QUANTITATIVAS[0];
    if (valor <= limites[1]) return CORES_QUANTITATIVAS[1];
    if (valor <= limites[2]) return CORES_QUANTITATIVAS[2];
    if (valor <= limites[3]) return CORES_QUANTITATIVAS[3];
    return CORES_QUANTITATIVAS[4];
}

function corIPVS(valor) {
    if (!valor) return COR_SEM_DADO;
    return CORES_IPVS[String(valor).trim().toLowerCase()] || COR_SEM_DADO;
}

function estiloSetorSelecionado(feature) {
    const tema = elementos.tema?.value || "padrao";
    let fillColor = "#3b7d95";

    if (tema === "ipvs") {
        fillColor = corIPVS(dadosDaFeature(feature).ipvs);
    }
    else if (tema !== "padrao") {
        fillColor = corQuantitativa(valorTema(feature, tema));
    }

    return {
        color: "#ffffff",
        weight: 0.8,
        opacity: 0.9,
        fillColor,
        fillOpacity: 0.75
    };
}

function formatarValorTema(valor, tema) {
    if (tema === "renda") return formatarMoeda(valor);
    if (tema === "densidade") return `${formatarInteiro(valor)} hab./km²`;
    if (tema === "pretaparda" || tema === "feminina") return formatarPercentual(valor);
    return formatarNumero(valor, 1);
}

function atualizarLegendaMapa() {
    if (!elementos.legenda) return;

    const tema = elementos.tema?.value || "padrao";

    if (tema === "padrao") {
        elementos.legenda.innerHTML = `
            <div class="legenda-titulo">Área selecionada</div>
            <div class="item-legenda">
                <span class="cor-legenda" style="background:#3b7d95"></span>
                Setores selecionados
            </div>
        `;
        return;
    }

    if (tema === "ipvs") {
        const categorias = [
            ["Vulnerabilidade muito baixa", "#d7eee5"],
            ["Vulnerabilidade baixa", "#aad6c1"],
            ["Vulnerabilidade média", "#f0dc91"],
            ["Vulnerabilidade alta", "#e6a06d"],
            ["Vulnerabilidade muito alta", "#c85d52"],
            ["Sem informação", COR_SEM_DADO]
        ];

        elementos.legenda.innerHTML = `
            <div class="legenda-titulo">Vulnerabilidade / IPVS</div>
            ${categorias.map(item => `
                <div class="item-legenda">
                    <span class="cor-legenda" style="background:${item[1]}"></span>
                    ${item[0]}
                </div>
            `).join("")}
        `;
        return;
    }

    if (!escalaTemaAtual) {
        elementos.legenda.innerHTML = `
            <div class="legenda-titulo">Indicador</div>
            <div class="item-legenda">Sem dados disponíveis</div>
        `;
        return;
    }

    const limites = escalaTemaAtual.limites;
    const titulo = {
        renda: "Renda",
        densidade: "Densidade populacional",
        pretaparda: "População preta + parda",
        feminina: "População feminina"
    }[tema] || "Indicador";

    const faixas = [
        [`Até ${formatarValorTema(limites[0], tema)}`, CORES_QUANTITATIVAS[0]],
        [`${formatarValorTema(limites[0], tema)} – ${formatarValorTema(limites[1], tema)}`, CORES_QUANTITATIVAS[1]],
        [`${formatarValorTema(limites[1], tema)} – ${formatarValorTema(limites[2], tema)}`, CORES_QUANTITATIVAS[2]],
        [`${formatarValorTema(limites[2], tema)} – ${formatarValorTema(limites[3], tema)}`, CORES_QUANTITATIVAS[3]],
        [`Acima de ${formatarValorTema(limites[3], tema)}`, CORES_QUANTITATIVAS[4]]
    ];

    elementos.legenda.innerHTML = `
        <div class="legenda-titulo">${titulo}</div>
        ${faixas.map(faixa => `
            <div class="item-legenda">
                <span class="cor-legenda" style="background:${faixa[1]}"></span>
                ${faixa[0]}
            </div>
        `).join("")}
        <div class="item-legenda">
            <span class="cor-legenda" style="background:${COR_SEM_DADO}"></span>
            Sem informação
        </div>
    `;
}

function criarTooltipSetor(feature) {
    const codigo = String(feature.properties.CD_SETOR);
    const dados = dadosDaFeature(feature);

    return `
        <div>
            <div style="font-weight:700;color:#00506e;margin-bottom:6px;">Setor ${codigo}</div>
            <div><b>População:</b> ${dados.populacao != null ? formatarInteiro(dados.populacao) : "Sem informação"}</div>
            <div><b>Renda:</b> ${dados.renda != null ? formatarMoeda(dados.renda) : "Sem informação"}</div>
            <div><b>IPVS:</b> ${dados.ipvs || "Sem classificação"}</div>
        </div>
    `;
}

function eventosSetor(feature, layer) {
    layer.bindTooltip(() => criarTooltipSetor(feature), {
        sticky: true,
        className: "tooltip-setor-leaflet"
    });

    layer.on("mouseover", function () {
        this.setStyle({
            color: "#F08200",
            weight: 1.8,
            fillOpacity: 0.95
        });
    });

    layer.on("mouseout", function () {
        camadaSetoresSelecionados?.resetStyle?.(this);
    });
}

function desenharSetoresSelecionados(selecionados) {
    if (!mapa?.addLayer) return;

    if (camadaSetoresSelecionados) mapa.removeLayer(camadaSetoresSelecionados);

    prepararEscalaTematica();

    camadaSetoresSelecionados = L.geoJSON({
        type: "FeatureCollection",
        features: selecionados.map(item => item.feature)
    }, {
        style: estiloSetorSelecionado,
        onEachFeature: eventosSetor
    }).addTo(mapa);

    atualizarLegendaMapa();
    camadaEmpreendimento?.bringToFront?.();
}

function atualizarTemaMapa() {
    if (!ultimosSelecionados.length) {
        atualizarLegendaMapa();
        return;
    }

    prepararEscalaTematica();
    camadaSetoresSelecionados?.setStyle?.(estiloSetorSelecionado);
    atualizarLegendaMapa();
}

// ============================================================
// INDICADORES PRINCIPAIS
// ============================================================

function calcularIndicadoresSelecionados(selecionados, criterio) {
    let populacao = 0;
    let branca = 0;
    let preta = 0;
    let parda = 0;
    let amarela = 0;
    let indigena = 0;
    let masculina = 0;
    let feminina = 0;

    const rendas = [];
    const ipvsContagem = {};
    let setoresComIPVS = 0;

    for (const item of selecionados) {
        const dados = dadosDaFeature(item.feature);
        const fator = criterio === "proporcional" ? item.fator : 1;

        populacao += numero(dados.populacao) * fator;
        branca += numero(dados.branca) * fator;
        preta += numero(dados.preta) * fator;
        parda += numero(dados.parda) * fator;
        amarela += numero(dados.amarela) * fator;
        indigena += numero(dados.indigena) * fator;
        masculina += numero(dados.masculina) * fator;
        feminina += numero(dados.feminina) * fator;

        if (dados.renda != null && Number.isFinite(Number(dados.renda))) {
            rendas.push(Number(dados.renda));
        }

        if (dados.ipvs && dados.ipvs !== "nan") {
            setoresComIPVS++;
            ipvsContagem[dados.ipvs] = (ipvsContagem[dados.ipvs] || 0) + 1;
        }
    }

    return {
        setores: selecionados.length,
        populacao,
        rendaMediana: calcularMediana(rendas),
        branca,
        preta,
        parda,
        amarela,
        indigena,
        masculina,
        feminina,
        ipvsContagem,
        setoresComIPVS
    };
}

function atualizarDashboard(resultado) {
    document.getElementById("card-setores").textContent = formatarInteiro(resultado.setores);
    document.getElementById("card-populacao").textContent = formatarInteiro(resultado.populacao);
    document.getElementById("card-renda").textContent = resultado.rendaMediana != null
        ? formatarMoeda(resultado.rendaMediana)
        : "-";

    const cobertura = resultado.setores > 0
        ? resultado.setoresComIPVS / resultado.setores * 100
        : 0;

    document.getElementById("card-ipvs").textContent = formatarPercentual(cobertura);
    document.getElementById("rodape-populacao").textContent = elementos.criterio.value === "proporcional"
        ? "estimativa proporcional à área"
        : "habitantes";

    atualizarRaca(resultado);
    atualizarGenero(resultado);
    atualizarIPVS(resultado.ipvsContagem, resultado.setoresComIPVS);
}

function atualizarRaca(valores) {
    const total = valores.branca + valores.preta + valores.parda + valores.amarela + valores.indigena;

    const atualizar = (nome, valor) => {
        const percentual = total > 0 ? valor / total * 100 : 0;
        const barra = document.getElementById(`barra-${nome}`);
        const texto = document.getElementById(`valor-${nome}`);
        if (barra) barra.style.width = `${percentual}%`;
        if (texto) texto.textContent = formatarPercentual(percentual);
    };

    atualizar("branca", valores.branca);
    atualizar("parda", valores.parda);
    atualizar("preta", valores.preta);
    atualizar("amarela", valores.amarela);
    atualizar("indigena", valores.indigena);
}

function atualizarGenero(valores) {
    const total = valores.feminina + valores.masculina;
    const pf = total > 0 ? valores.feminina / total * 100 : 0;
    const pm = total > 0 ? valores.masculina / total * 100 : 0;

    document.getElementById("valor-feminina").textContent = formatarInteiro(valores.feminina);
    document.getElementById("valor-masculina").textContent = formatarInteiro(valores.masculina);
    document.getElementById("percentual-feminina").textContent = formatarPercentual(pf);
    document.getElementById("percentual-masculina").textContent = formatarPercentual(pm);
}

function atualizarIPVS(contagem, total) {
    const container = document.getElementById("lista-ipvs");
    container.innerHTML = "";

    const itens = Object.entries(contagem).sort((a, b) => b[1] - a[1]);

    if (!itens.length) {
        container.innerHTML = '<div style="color:#829097;font-size:12px;">Nenhuma informação de IPVS disponível para esta área.</div>';
        return;
    }

    for (const [nome, quantidade] of itens) {
        const percentual = total > 0 ? quantidade / total * 100 : 0;
        const elemento = document.createElement("div");
        elemento.className = "ipvs-item";
        elemento.innerHTML = `
            <span class="ipvs-nome">${nome}</span>
            <span class="ipvs-valor">${formatarPercentual(percentual)}</span>
        `;
        container.appendChild(elemento);
    }
}

// ============================================================
// PERFIL POR DISTÂNCIA
// ============================================================

function criarFaixasDistancia(raioMaximo, passo) {
    const faixas = [];
    let inicio = 0;

    while (inicio < raioMaximo) {
        const fim = Math.min(inicio + passo, raioMaximo);

        faixas.push({
            inicio,
            fim,
            label: `${formatarDistanciaCurta(inicio)} – ${formatarDistanciaCurta(fim)}`,
            setores: []
        });

        inicio = fim;
    }

    return faixas;
}

function calcularFaixasDistancia() {
    if (!empreendimentoSelecionado) {
        dadosFaixasDistancia = [];
        limparGraficoDistancia();
        return;
    }

    const raioMaximo = Number(elementos.raio.value);
    const passo = Number(elementos.passoFaixa.value);
    const faixas = criarFaixasDistancia(raioMaximo, passo);

    if (!faixas.length) {
        dadosFaixasDistancia = [];
        limparGraficoDistancia();
        return;
    }

    const buffers = faixas.map(faixa => criarBuffer(empreendimentoSelecionado, faixa.fim));
    const candidatos = buscarCandidatos(buffers[buffers.length - 1]);

    for (const item of candidatos) {
        if (!item.centroide) continue;

        for (let i = 0; i < buffers.length; i++) {
            try {
                if (turf.booleanPointInPolygon(item.centroide, buffers[i])) {
                    faixas[i].setores.push(item.feature);
                    break;
                }
            }
            catch (erro) {
                break;
            }
        }
    }

    dadosFaixasDistancia = faixas.map(faixa => {
        let populacao = 0;
        let branca = 0;
        let preta = 0;
        let parda = 0;
        let amarela = 0;
        let indigena = 0;
        let areaTotal = 0;
        let ipvsValidos = 0;
        let ipvsAlto = 0;
        const rendas = [];

        for (const feature of faixa.setores) {
            const dados = dadosDaFeature(feature);

            populacao += numero(dados.populacao);
            branca += numero(dados.branca);
            preta += numero(dados.preta);
            parda += numero(dados.parda);
            amarela += numero(dados.amarela);
            indigena += numero(dados.indigena);
            areaTotal += numero(dados.area_km2);

            if (dados.renda != null && Number.isFinite(Number(dados.renda))) {
                rendas.push(Number(dados.renda));
            }

            if (dados.ipvs && dados.ipvs !== "nan") {
                ipvsValidos++;
                const chave = String(dados.ipvs).trim().toLowerCase();
                if (
                    chave.includes("vulnerabilidade alta") ||
                    chave.includes("vulnerabilidade muito alta")
                ) {
                    ipvsAlto++;
                }
            }
        }

        const totalRaca = branca + preta + parda + amarela + indigena;
        const percentualPretaParda = totalRaca > 0 ? (preta + parda) / totalRaca * 100 : 0;
        const percentualIPVSAlto = ipvsValidos > 0 ? ipvsAlto / ipvsValidos * 100 : 0;
        const densidade = areaTotal > 0 ? populacao / areaTotal : 0;

        return {
            inicio: faixa.inicio,
            fim: faixa.fim,
            label: faixa.label,
            quantidadeSetores: faixa.setores.length,
            populacao,
            renda: calcularMediana(rendas),
            pretaparda: percentualPretaParda,
            ipvsalto: percentualIPVSAlto,
            densidade
        };
    });

    renderizarGraficoDistancia();
}

function valorIndicadorDistancia(faixa, indicador) {
    if (indicador === "populacao") return faixa.populacao;
    if (indicador === "renda") return faixa.renda;
    if (indicador === "pretaparda") return faixa.pretaparda;
    if (indicador === "ipvsalto") return faixa.ipvsalto;
    if (indicador === "densidade") return faixa.densidade;
    return 0;
}

function formatarIndicadorDistancia(valor, indicador) {
    if (valor === null || valor === undefined) return "-";
    if (indicador === "populacao") return formatarInteiro(valor);
    if (indicador === "renda") return formatarMoeda(valor);
    if (indicador === "pretaparda" || indicador === "ipvsalto") return formatarPercentual(valor);
    if (indicador === "densidade") return `${formatarInteiro(valor)} hab./km²`;
    return formatarNumero(valor, 1);
}

function renderizarGraficoDistancia() {
    const container = elementos.graficoDistancia;

    if (!dadosFaixasDistancia.length) {
        limparGraficoDistancia();
        return;
    }

    const indicador = elementos.indicadorDistancia.value;
    const valores = dadosFaixasDistancia.map(faixa =>
        numero(valorIndicadorDistancia(faixa, indicador))
    );
    const maximo = Math.max(...valores, 0);

    container.innerHTML = "";

    for (const faixa of dadosFaixasDistancia) {
        const valor = valorIndicadorDistancia(faixa, indicador);
        const largura = maximo > 0 ? numero(valor) / maximo * 100 : 0;
        const linha = document.createElement("div");
        linha.className = "linha-distancia";

        linha.innerHTML = `
            <div class="faixa-distancia">
                ${faixa.label}
                <span class="detalhe-distancia">${formatarInteiro(faixa.quantidadeSetores)} setores</span>
            </div>
            <div class="trilho-distancia">
                <div class="barra-distancia" style="width:${largura}%;"></div>
            </div>
            <div class="valor-distancia">${formatarIndicadorDistancia(valor, indicador)}</div>
        `;

        container.appendChild(linha);
    }
}

function limparGraficoDistancia() {
    if (!elementos.graficoDistancia) return;

    elementos.graficoDistancia.innerHTML = `
        <div class="mensagem-distancia">
            Selecione um empreendimento para visualizar o perfil por distância.
        </div>
    `;
}

// ============================================================
// LIMPEZA
// ============================================================

function limparIndicadores() {
    for (const id of ["card-setores", "card-populacao", "card-renda", "card-ipvs"]) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = "-";
    }

    atualizarRaca({ branca: 0, preta: 0, parda: 0, amarela: 0, indigena: 0 });
    atualizarGenero({ feminina: 0, masculina: 0 });

    const lista = document.getElementById("lista-ipvs");
    if (lista) {
        lista.innerHTML = '<div style="color:#829097;font-size:12px;">Selecione um local para iniciar a análise.</div>';
    }
}

function limparAnaliseGeografica() {
    numeroAnalise++;
    ultimosSelecionados = [];
    dadosFaixasDistancia = [];
    escalaTemaAtual = null;

    if (mapa?.removeLayer) {
        for (const camada of [camadaBuffer, camadaSetoresSelecionados, camadaEmpreendimento]) {
            if (camada) {
                try { mapa.removeLayer(camada); }
                catch (erro) {}
            }
        }
    }

    camadaBuffer = null;
    camadaSetoresSelecionados = null;
    camadaEmpreendimento = null;
    atualizarLegendaMapa();
}

function limparAnaliseCompleta() {
    empreendimentoSelecionado = null;
    limparAnaliseGeografica();
    limparIndicadores();
    limparGraficoDistancia();

    const subtitulo = document.getElementById("subtitulo-mapa");
    if (subtitulo) subtitulo.textContent = "Selecione um empreendimento";
}

// ============================================================
// EXECUTAR ANÁLISE
// ============================================================

function executarAnalise() {
    if (!empreendimentoSelecionado) return;

    const idAnalise = ++numeroAnalise;
    const raio = Number(elementos.raio.value);
    const criterio = elementos.criterio.value;

    atualizarStatus("Calculando área de influência...");

    const buffer = criarBuffer(empreendimentoSelecionado, raio);
    if (idAnalise !== numeroAnalise) return;

    desenharBuffer(buffer);

    const selecionados = selecionarSetores(buffer, criterio);
    ultimosSelecionados = selecionados;

    const resultado = calcularIndicadoresSelecionados(selecionados, criterio);

    desenharSetoresSelecionados(selecionados);
    atualizarDashboard(resultado);
    calcularFaixasDistancia();

    const nome = nomeDoLocal(empreendimentoSelecionado);
    const subtitulo = document.getElementById("subtitulo-mapa");
    if (subtitulo) subtitulo.textContent = `${nome} • ${formatarRaio(raio)}`;

    try {
        const limites = camadaBuffer?.getBounds?.();
        if (limites) {
            mapa?.fitBounds?.(limites, {
                padding: [25, 25],
                maxZoom: 15
            });
        }
    }
    catch (erro) {}

    atualizarStatus(`${formatarInteiro(selecionados.length)} setores selecionados`, "ok");
}

function agendarAnalise() {
    clearTimeout(temporizadorRaio);
    temporizadorRaio = setTimeout(executarAnalise, TEMPO_DEBOUNCE);
}

// ============================================================
// EVENTOS
// ============================================================

function registrarEventos() {
    elementos.parceria.addEventListener("change", alterarParceria);
    elementos.local.addEventListener("change", alterarLocal);

    elementos.raio.addEventListener("input", function () {
        elementos.valorRaio.textContent = formatarRaio(this.value);
        agendarAnalise();
    });

    elementos.criterio.addEventListener("change", executarAnalise);
    elementos.tema.addEventListener("change", atualizarTemaMapa);
    elementos.indicadorDistancia.addEventListener("change", renderizarGraficoDistancia);
    elementos.passoFaixa.addEventListener("change", calcularFaixasDistancia);
}

// ============================================================
// INICIAR
// ============================================================

async function iniciar() {
    carregarElementos();
    inicializarMapa();
    registrarEventos();
    await carregarDados();
    limparGraficoDistancia();
}

document.addEventListener("DOMContentLoaded", iniciar);
