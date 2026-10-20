// ============================================================
// SPP — BRIDGE ANALÍTICO
// ============================================================
//
// Executado DENTRO do mapa oficial.
//
// Recebe do dashboard:
//
// - buffer territorial;
// - setores censitários;
// - anéis;
// - outras geometrias analíticas.
//
// Tudo é desenhado no MESMO Leaflet do mapa oficial.
//
// ============================================================

(function () {


    // ========================================================
    // CONFIGURAÇÃO
    // ========================================================

    const params =
        new URLSearchParams(
            window.location.search
        );


    const modoEmbed =
        params.get(
            "embed"
        ) === "1";


    const dadosCamadas =
        new Map();


    const camadasLeaflet =
        new Map();


    let mapaConhecido =
        null;


    // ========================================================
    // MODO EMBED
    // ========================================================

    if (
        modoEmbed
    ) {

        document.documentElement
            .classList
            .add(
                "spp-modo-embed"
            );

    }


    // ========================================================
    // MAPA
    // ========================================================

    function obterMapa() {

        try {

            if (
                typeof sppMap !==
                    "undefined"
                &&
                sppMap
            ) {

                return sppMap;

            }

        }

        catch (
            erro
        ) {

            return null;

        }


        return null;

    }


    // ========================================================
    // FORMATADORES
    // ========================================================

    function formatarInteiro(
        valor
    ) {

        const numero =
            Number(
                valor
            );


        if (
            !Number.isFinite(
                numero
            )
        ) {

            return "-";

        }


        return Math.round(
            numero
        ).toLocaleString(
            "pt-BR"
        );

    }


    function formatarMoeda(
        valor
    ) {

        const numero =
            Number(
                valor
            );


        if (
            !Number.isFinite(
                numero
            )
        ) {

            return "-";

        }


        return numero.toLocaleString(
            "pt-BR",
            {

                style:
                    "currency",

                currency:
                    "BRL",

                maximumFractionDigits:
                    0

            }
        );

    }


    // ========================================================
    // PANES
    // ========================================================

    function garantirPanes() {

        const mapa =
            obterMapa();


        if (
            !mapa
        ) {

            return;

        }


        /*
         * TilePane = 200
         * OverlayPane padrão = 400
         *
         * Os setores ficam abaixo dos perímetros oficiais.
         */

        if (
            !mapa.getPane(
                "sppAnaliseBuffer"
            )
        ) {

            const pane =
                mapa.createPane(
                    "sppAnaliseBuffer"
                );


            pane.style.zIndex =
                "350";


            pane.style.pointerEvents =
                "none";

        }


        if (
            !mapa.getPane(
                "sppAnaliseSetores"
            )
        ) {

            const pane =
                mapa.createPane(
                    "sppAnaliseSetores"
                );


            pane.style.zIndex =
                "390";

        }


        if (
            !mapa.getPane(
                "sppAnaliseFrente"
            )
        ) {

            const pane =
                mapa.createPane(
                    "sppAnaliseFrente"
                );


            pane.style.zIndex =
                "410";


            pane.style.pointerEvents =
                "none";

        }

    }


    // ========================================================
    // TOOLTIP
    // ========================================================

    function tooltipSetor(
        feature
    ) {

        const p =
            feature?.properties
            ||
            {};


        const codigo =
            p.CD_SETOR
            ||
            "";


        const populacao =
            p.__analysisPopulacao;


        const renda =
            p.__analysisRenda;


        const ipvs =
            p.__analysisIPVS;


        return `

            <div>

                <div
                    class="tooltip-setor-titulo"
                >
                    Setor ${codigo}
                </div>


                <div
                    class="tooltip-setor-linha"
                >
                    <b>População:</b>

                    ${
                        populacao !== null
                        &&
                        populacao !== undefined

                            ?

                            formatarInteiro(
                                populacao
                            )

                            :

                            "Sem informação"
                    }

                </div>


                <div
                    class="tooltip-setor-linha"
                >
                    <b>Renda:</b>

                    ${
                        renda !== null
                        &&
                        renda !== undefined

                            ?

                            formatarMoeda(
                                renda
                            )

                            :

                            "Sem informação"
                    }

                </div>


                <div
                    class="tooltip-setor-linha"
                >
                    <b>IPVS:</b>

                    ${
                        ipvs
                        ||
                        "Sem classificação"
                    }

                </div>

            </div>

        `;

    }


    // ========================================================
    // REMOVER CAMADA
    // ========================================================

    function removerCamadaRenderizada(
        nome
    ) {

        const mapa =
            obterMapa();


        const camada =
            camadasLeaflet.get(
                nome
            );


        if (
            mapa
            &&
            camada
        ) {

            try {

                mapa.removeLayer(
                    camada
                );

            }

            catch (
                erro
            ) {

                // Pode pertencer ao mapa Leaflet anterior.

            }

        }


        camadasLeaflet.delete(
            nome
        );

    }


    // ========================================================
    // BUFFER
    // ========================================================

    function renderizarBuffer(
        nome,
        configuracao
    ) {

        const mapa =
            obterMapa();


        if (
            !mapa
        ) {

            return;

        }


        garantirPanes();


        const estilo =
            configuracao.style
            ||
            {};


        const camada =
            L.geoJSON(
                configuracao.geojson,
                {

                    pane:
                        "sppAnaliseBuffer",

                    interactive:
                        false,

                    style:
                        {

                            color:
                                estilo.color
                                ||
                                "#00506e",

                            weight:
                                estilo.weight
                                ??
                                2,

                            opacity:
                                estilo.opacity
                                ??
                                0.95,

                            dashArray:
                                estilo.dashArray
                                ||
                                "7 5",

                            fillColor:
                                estilo.fillColor
                                ||
                                "#3b7d95",

                            fillOpacity:
                                estilo.fillOpacity
                                ??
                                0.07

                        }

                }
            );


        camada.addTo(
            mapa
        );


        camadasLeaflet.set(
            nome,
            camada
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
                            [
                                25,
                                25
                            ],

                        maxZoom:
                            15

                    }
                );

            }

        }

    }


    // ========================================================
    // SETORES
    // ========================================================

    function renderizarSetores(
        nome,
        configuracao
    ) {

        const mapa =
            obterMapa();


        if (
            !mapa
        ) {

            return;

        }


        garantirPanes();


        let camada =
            null;


        camada =
            L.geoJSON(
                configuracao.geojson,
                {

                    pane:
                        "sppAnaliseSetores",


                    style:
                        feature => {

                            const p =
                                feature.properties
                                ||
                                {};


                            return {

                                color:
                                    "#ffffff",

                                weight:
                                    0.75,

                                opacity:
                                    0.92,

                                fillColor:
                                    p.__analysisColor
                                    ||
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
                                tooltipSetor(
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

                                    camada.resetStyle(
                                        this
                                    );

                                }
                            );

                        }

                }
            );


        camada.addTo(
            mapa
        );


        camadasLeaflet.set(
            nome,
            camada
        );

    }


    // ========================================================
    // GEOJSON GENÉRICO
    // ========================================================

    function renderizarGeoJSON(
        nome,
        configuracao
    ) {

        const mapa =
            obterMapa();


        if (
            !mapa
        ) {

            return;

        }


        garantirPanes();


        const estilo =
            configuracao.style
            ||
            {};


        const camada =
            L.geoJSON(
                configuracao.geojson,
                {

                    pane:
                        configuracao.pane
                        ||
                        "sppAnaliseFrente",

                    interactive:
                        configuracao.interactive
                        ??
                        false,

                    style:
                        {

                            color:
                                estilo.color
                                ||
                                "#00506e",

                            weight:
                                estilo.weight
                                ??
                                2,

                            opacity:
                                estilo.opacity
                                ??
                                1,

                            dashArray:
                                estilo.dashArray
                                ||
                                null,

                            fillColor:
                                estilo.fillColor
                                ||
                                "#3b7d95",

                            fillOpacity:
                                estilo.fillOpacity
                                ??
                                0.12

                        }

                }
            );


        camada.addTo(
            mapa
        );


        camadasLeaflet.set(
            nome,
            camada
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
                            [
                                25,
                                25
                            ],

                        maxZoom:
                            15

                    }
                );

            }

        }

    }


    // ========================================================
    // RENDERIZAR CAMADA
    // ========================================================

    function renderizarCamada(
        nome
    ) {

        const mapa =
            obterMapa();


        if (
            !mapa
        ) {

            return;

        }


        const configuracao =
            dadosCamadas.get(
                nome
            );


        if (
            !configuracao
            ||
            !configuracao.geojson
        ) {

            return;

        }


        removerCamadaRenderizada(
            nome
        );


        if (
            configuracao.tipo ===
            "buffer"
        ) {

            renderizarBuffer(
                nome,
                configuracao
            );

            return;

        }


        if (
            configuracao.tipo ===
            "setores"
        ) {

            renderizarSetores(
                nome,
                configuracao
            );

            return;

        }


        renderizarGeoJSON(
            nome,
            configuracao
        );

    }


    // ========================================================
    // TODAS
    // ========================================================

    function renderizarTodas() {

        const mapa =
            obterMapa();


        if (
            !mapa
        ) {

            return;

        }


        garantirPanes();


        for (
            const nome
            of dadosCamadas.keys()
        ) {

            renderizarCamada(
                nome
            );

        }

    }


    // ========================================================
    // DEFINIR CAMADA
    // ========================================================

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
                    mensagem.tipo
                    ||
                    "geojson",

                geojson:
                    mensagem.geojson,

                style:
                    mensagem.style
                    ||
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


    // ========================================================
    // LIMPAR
    // ========================================================

    function limparCamada(
        nome
    ) {

        removerCamadaRenderizada(
            nome
        );


        dadosCamadas.delete(
            nome
        );

    }


    function limparTodas() {

        for (
            const nome
            of Array.from(
                camadasLeaflet.keys()
            )
        ) {

            removerCamadaRenderizada(
                nome
            );

        }


        dadosCamadas.clear();

    }


    // ========================================================
    // MENSAGENS
    // ========================================================

    window.addEventListener(
        "message",
        event => {


            /*
             * O mapa já possui a validação principal das
             * mensagens spp-dashboard.
             *
             * Aqui tratamos somente as camadas analíticas.
             */

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


    // ========================================================
    // MAPA É RECRIADO PELO MOTOR EXISTENTE
    // ========================================================
    //
    // Seu mapa remove e cria uma nova instância Leaflet quando
    // grupo/local/filtros são alterados.
    //
    // Este monitor detecta isso e restaura as camadas
    // analíticas automaticamente.
    //
    // ========================================================

    setInterval(
        () => {

            const mapa =
                obterMapa();


            if (
                !mapa
            ) {

                return;

            }


            if (
                mapa !==
                mapaConhecido
            ) {

                mapaConhecido =
                    mapa;


                camadasLeaflet.clear();


                setTimeout(
                    () => {

                        renderizarTodas();

                    },
                    60
                );

            }

        },
        100
    );


    // ========================================================
    // API PARA DEBUG
    // ========================================================

    window.SPPMapaAnalysis =
        {

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

            }

        };


})();