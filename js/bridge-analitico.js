// ============================================================
// SPP — BRIDGE ANALÍTICO
// ============================================================
// Recebe do dashboard, via postMessage, buffer, setores e outras
// geometrias analíticas e desenha tudo no mesmo Leaflet do mapa.
//
// A camada é registrada na própria instância do Leaflet por nome.
// Antes de redesenhar uma camada com o mesmo nome, a anterior é
// removida. Isso evita buffers duplicados quando o raio muda ou
// quando o mapa principal recria a instância sppMap.
// ============================================================

(function () {
    "use strict";

    const parametros = new URLSearchParams(window.location.search);
    const modoEmbed = parametros.get("embed") === "1";
    const dadosCamadas = new Map();

    let mapaConhecido = null;
    let versaoMapa = 0;

    if (modoEmbed) {
        document.documentElement.classList.add("spp-modo-embed");
    }

    // --------------------------------------------------------
    // Origem autorizada
    // --------------------------------------------------------
    function obterOrigemPai() {
        try {
            if (typeof SPP_PARENT_ORIGIN !== "undefined" && SPP_PARENT_ORIGIN) {
                return SPP_PARENT_ORIGIN;
            }
        } catch (_) {}

        try {
            if (!document.referrer) return "*";
            const origem = new URL(document.referrer).origin;
            return origem && origem !== "null" ? origem : "*";
        } catch (_) {
            return "*";
        }
    }

    const origemPai = obterOrigemPai();

    // --------------------------------------------------------
    // Instância atual do Leaflet
    // --------------------------------------------------------
    function obterMapa() {
        try {
            if (typeof sppMap !== "undefined" && sppMap) return sppMap;
        } catch (_) {}

        return null;
    }

    // --------------------------------------------------------
    // Registro persistente por instância Leaflet
    // --------------------------------------------------------
    // Guardar a camada no próprio mapa evita perder a referência
    // quando o bridge detecta uma recriação em outro momento.
    function obterRegistroDoMapa(mapa) {
        if (!mapa) return null;

        if (!(mapa.__sppAnalysisLayers instanceof Map)) {
            mapa.__sppAnalysisLayers = new Map();
        }

        return mapa.__sppAnalysisLayers;
    }

    // --------------------------------------------------------
    // Panes
    // --------------------------------------------------------
    function garantirPanes(mapa) {
        if (!mapa) return;

        if (!mapa.getPane("sppAnaliseBuffer")) {
            const pane = mapa.createPane("sppAnaliseBuffer");

            pane.style.zIndex = "350";
            pane.style.pointerEvents = "none";
        }

        if (!mapa.getPane("sppAnaliseSetores")) {
            const pane = mapa.createPane("sppAnaliseSetores");

            pane.style.zIndex = "390";
        }

        if (!mapa.getPane("sppAnaliseFrente")) {
            const pane = mapa.createPane("sppAnaliseFrente");

            pane.style.zIndex = "410";
            pane.style.pointerEvents = "none";
        }
    }

    // --------------------------------------------------------
    // Formatadores
    // --------------------------------------------------------
    function formatarInteiro(valor) {
        const n = Number(valor);

        if (!Number.isFinite(n)) {
            return "-";
        }

        return Math.round(n).toLocaleString("pt-BR");
    }

    function formatarMoeda(valor) {
        const n = Number(valor);

        if (!Number.isFinite(n)) {
            return "-";
        }

        return n.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0
            }
        );
    }

    // --------------------------------------------------------
    // Tooltip dos setores
    // --------------------------------------------------------
    function criarTooltipSetor(feature) {
        const p = feature?.properties || {};

        const codigo =
            p.CD_SETOR ||
            "";

        const populacao =
            p.__analysisPopulacao;

        const renda =
            p.__analysisRenda;

        const ipvs =
            p.__analysisIPVS;

        return `
            <div>

                <div class="tooltip-setor-titulo">
                    Setor ${codigo}
                </div>

                <div class="tooltip-setor-linha">
                    <b>População:</b>

                    ${
                        populacao !== null
                        &&
                        populacao !== undefined
                            ? formatarInteiro(populacao)
                            : "Sem informação"
                    }

                </div>

                <div class="tooltip-setor-linha">
                    <b>Renda:</b>

                    ${
                        renda !== null
                        &&
                        renda !== undefined
                            ? formatarMoeda(renda)
                            : "Sem informação"
                    }

                </div>

                <div class="tooltip-setor-linha">
                    <b>IPVS:</b>

                    ${
                        ipvs ||
                        "Sem classificação"
                    }

                </div>

            </div>
        `;
    }

    // --------------------------------------------------------
    // Remoção por nome
    // --------------------------------------------------------
    function removerCamadaDoMapa(
        nome,
        mapa = obterMapa()
    ) {
        if (!mapa) {
            return;
        }

        const registro =
            obterRegistroDoMapa(mapa);

        const camada =
            registro.get(nome);

        if (!camada) {
            return;
        }

        try {
            if (
                mapa.hasLayer(camada)
            ) {
                mapa.removeLayer(camada);
            }
        } catch (_) {}

        registro.delete(nome);
    }

    function registrarCamada(
        nome,
        camada,
        mapa
    ) {
        obterRegistroDoMapa(mapa)
            .set(
                nome,
                camada
            );
    }

    // --------------------------------------------------------
    // Buffer
    // --------------------------------------------------------
    function renderizarBuffer(
        nome,
        configuracao,
        mapa
    ) {
        const estilo =
            configuracao.style ||
            {};

        const camada =
            L.geoJSON(
                configuracao.geojson,
                {
                    pane:
                        "sppAnaliseBuffer",

                    interactive:
                        false,

                    style: {
                        color:
                            estilo.color ||
                            "#00506e",

                        weight:
                            estilo.weight ??
                            2,

                        opacity:
                            estilo.opacity ??
                            0.95,

                        dashArray:
                            estilo.dashArray ||
                            "7 5",

                        fillColor:
                            estilo.fillColor ||
                            "#3b7d95",

                        fillOpacity:
                            estilo.fillOpacity ??
                            0.07
                    }
                }
            );

        camada.addTo(mapa);

        registrarCamada(
            nome,
            camada,
            mapa
        );

        if (
            configuracao.fit
        ) {
            const bounds =
                camada.getBounds();

            if (
                bounds.isValid()
            ) {
                mapa.fitBounds(
                    bounds,
                    {
                        padding:
                            [25, 25],

                        maxZoom:
                            15
                    }
                );
            }
        }
    }

    // --------------------------------------------------------
    // Setores
    // --------------------------------------------------------
    function renderizarSetores(
        nome,
        configuracao,
        mapa
    ) {
        let camada = null;

        camada =
            L.geoJSON(
                configuracao.geojson,
                {
                    pane:
                        "sppAnaliseSetores",

                    style:
                        feature => {
                            const p =
                                feature.properties ||
                                {};

                            return {
                                color:
                                    "#ffffff",

                                weight:
                                    0.75,

                                opacity:
                                    0.92,

                                fillColor:
                                    p.__analysisColor ||
                                    "#3b7d95",

                                fillOpacity:
                                    0.72
                            };
                        },

                    onEachFeature:
                        (
                            feature,
                            layer
                        ) => {
                            layer.bindTooltip(
                                criarTooltipSetor(
                                    feature
                                ),
                                {
                                    sticky:
                                        true,

                                    direction:
                                        "auto",

                                    className:
                                        "tooltip-setor-analitico"
                                }
                            );

                            layer.on(
                                "mouseover",
                                function () {
                                    this.setStyle(
                                        {
                                            color:
                                                "#F08200",

                                            weight:
                                                1.7,

                                            fillOpacity:
                                                0.90
                                        }
                                    );

                                    if (
                                        this.bringToFront
                                    ) {
                                        this.bringToFront();
                                    }
                                }
                            );

                            layer.on(
                                "mouseout",
                                function () {
                                    if (camada) {
                                        camada.resetStyle(
                                            this
                                        );
                                    }
                                }
                            );
                        }
                }
            );

        camada.addTo(mapa);

        registrarCamada(
            nome,
            camada,
            mapa
        );
    }

    // --------------------------------------------------------
    // GeoJSON genérico
    // --------------------------------------------------------
    function renderizarGeoJSON(
        nome,
        configuracao,
        mapa
    ) {
        const estilo =
            configuracao.style ||
            {};

        const camada =
            L.geoJSON(
                configuracao.geojson,
                {
                    pane:
                        configuracao.pane ||
                        "sppAnaliseFrente",

                    interactive:
                        configuracao.interactive ??
                        false,

                    style: {
                        color:
                            estilo.color ||
                            "#00506e",

                        weight:
                            estilo.weight ??
                            2,

                        opacity:
                            estilo.opacity ??
                            1,

                        dashArray:
                            estilo.dashArray ||
                            null,

                        fillColor:
                            estilo.fillColor ||
                            "#3b7d95",

                        fillOpacity:
                            estilo.fillOpacity ??
                            0.12
                    }
                }
            );

        camada.addTo(mapa);

        registrarCamada(
            nome,
            camada,
            mapa
        );

        if (
            configuracao.fit
        ) {
            const bounds =
                camada.getBounds();

            if (
                bounds.isValid()
            ) {
                mapa.fitBounds(
                    bounds,
                    {
                        padding:
                            [25, 25],

                        maxZoom:
                            15
                    }
                );
            }
        }
    }

    // --------------------------------------------------------
    // Renderização central
    // --------------------------------------------------------
    function renderizarCamada(nome) {
        const mapa =
            obterMapa();

        if (!mapa) {
            return;
        }

        const configuracao =
            dadosCamadas.get(nome);

        if (
            !configuracao
            ||
            !configuracao.geojson
        ) {
            return;
        }

        garantirPanes(mapa);

        // ====================================================
        // IMPORTANTE
        // ====================================================
        // Remove SEMPRE a camada anterior com o mesmo nome.
        // Isso impede o acúmulo de buffers antigos.
        // ====================================================

        removerCamadaDoMapa(
            nome,
            mapa
        );

        if (
            configuracao.tipo ===
            "buffer"
        ) {
            renderizarBuffer(
                nome,
                configuracao,
                mapa
            );

            return;
        }

        if (
            configuracao.tipo ===
            "setores"
        ) {
            renderizarSetores(
                nome,
                configuracao,
                mapa
            );

            return;
        }

        renderizarGeoJSON(
            nome,
            configuracao,
            mapa
        );
    }

    function renderizarTodas() {
        if (!obterMapa()) {
            return;
        }

        for (
            const nome
            of dadosCamadas.keys()
        ) {
            renderizarCamada(nome);
        }
    }

    // --------------------------------------------------------
    // Definir / atualizar camada
    // --------------------------------------------------------
    function definirCamada(
        mensagem
    ) {
        if (
            !mensagem.layer
            ||
            !mensagem.geojson
        ) {
            return;
        }

        dadosCamadas.set(
            mensagem.layer,
            {
                tipo:
                    mensagem.tipo ||
                    "geojson",

                geojson:
                    mensagem.geojson,

                style:
                    mensagem.style ||
                    {},

                interactive:
                    mensagem.interactive,

                pane:
                    mensagem.pane,

                fit:
                    Boolean(
                        mensagem.fit
                    )
            }
        );

        renderizarCamada(
            mensagem.layer
        );
    }

    // --------------------------------------------------------
    // Limpar uma camada
    // --------------------------------------------------------
    function limparCamada(
        nome
    ) {
        const mapa =
            obterMapa();

        if (mapa) {
            removerCamadaDoMapa(
                nome,
                mapa
            );
        }

        dadosCamadas.delete(nome);
    }

    // --------------------------------------------------------
    // Limpar todas
    // --------------------------------------------------------
    function limparTodas() {
        const mapa =
            obterMapa();

        if (mapa) {
            const registro =
                obterRegistroDoMapa(
                    mapa
                );

            for (
                const nome
                of Array.from(
                    registro.keys()
                )
            ) {
                removerCamadaDoMapa(
                    nome,
                    mapa
                );
            }
        }

        dadosCamadas.clear();
    }

    // --------------------------------------------------------
    // Mensagens do dashboard
    // --------------------------------------------------------
    window.addEventListener(
        "message",
        event => {
            if (
                window.parent !== window
                &&
                event.source !== window.parent
            ) {
                return;
            }

            if (
                origemPai !== "*"
                &&
                event.origin !== origemPai
            ) {
                return;
            }

            const mensagem =
                event.data;

            if (
                !mensagem
                ||
                mensagem.source !==
                    "spp-dashboard"
            ) {
                return;
            }

            if (
                mensagem.type ===
                    "set-analysis-layer"
            ) {
                definirCamada(
                    mensagem
                );

                return;
            }

            if (
                mensagem.type ===
                    "clear-analysis-layer"
            ) {
                limparCamada(
                    mensagem.layer
                );

                return;
            }

            if (
                mensagem.type ===
                    "clear-analysis-layers"
            ) {
                limparTodas();

                return;
            }

            if (
                mensagem.type ===
                    "refresh-analysis-layers"
            ) {
                renderizarTodas();
            }
        }
    );

    // --------------------------------------------------------
    // Detectar recriação do Leaflet
    // --------------------------------------------------------
    //
    // O mapa principal recria sppMap quando grupo/local muda.
    //
    // Quando isso acontecer:
    // 1. reconhecemos a nova instância;
    // 2. incrementamos uma versão;
    // 3. esperamos o mapa terminar de montar;
    // 4. restauramos as camadas analíticas UMA vez.
    //
    // Se o mapa mudar novamente durante a espera, o timer
    // antigo é ignorado.
    // --------------------------------------------------------

    setInterval(
        () => {
            const mapa =
                obterMapa();

            if (
                !mapa
                ||
                mapa === mapaConhecido
            ) {
                return;
            }

            mapaConhecido =
                mapa;

            versaoMapa++;

            const versaoLocal =
                versaoMapa;

            garantirPanes(
                mapa
            );

            setTimeout(
                () => {
                    if (
                        versaoLocal !==
                            versaoMapa
                    ) {
                        return;
                    }

                    if (
                        obterMapa() !==
                            mapa
                    ) {
                        return;
                    }

                    renderizarTodas();
                },
                80
            );
        },
        100
    );

    // --------------------------------------------------------
    // API para debug
    // --------------------------------------------------------
    window.SPPMapaAnalysis = {
        definir:
            definirCamada,

        remover:
            limparCamada,

        limpar:
            limparTodas,

        renderizar:
            renderizarTodas,

        get mapa() {
            return obterMapa();
        },

        get camadas() {
            return dadosCamadas;
        },

        get camadasRenderizadas() {
            const mapa =
                obterMapa();

            if (!mapa) {
                return [];
            }

            return Array.from(
                obterRegistroDoMapa(
                    mapa
                ).keys()
            );
        }
    };

})();