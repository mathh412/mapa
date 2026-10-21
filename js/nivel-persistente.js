// ============================================================
// SPP — NÍVEL PERSISTENTE DO MAPA
// ============================================================
//
// Responsabilidades:
//
// 1. preservar o parâmetro ?nivel= quando o mapa é recriado;
// 2. aceitar "nivel" também nas mensagens do dashboard;
// 3. garantir que mapas em modo embed tenham nível padrão;
// 4. não alterar o comportamento normal do mapa standalone;
// 5. permitir:
//
//    nivel=regiao
//    nivel=subprefeitura
//    nivel=distrito
//    nivel=local
//    nivel=perimetro
//    nivel=interno
//
// Este arquivo deve ser carregado DEPOIS de mapa.js e
// ANTES de bridge-analitico.js.
// ============================================================

(function () {

    "use strict";


    // ========================================================
    // PARÂMETROS
    // ========================================================

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const modoEmbed =
        parametros.get(
            "embed"
        ) ===
        "1";


    // ========================================================
    // NORMALIZAÇÃO
    // ========================================================

    function normalizarTexto(
        valor
    ) {

        return String(
            valor ??
            ""
        )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase()
        .replace(
            /_/g,
            "-"
        )
        .replace(
            /\s+/g,
            "-"
        );

    }


    function normalizarNivel(
        valor
    ) {

        const chave =
            normalizarTexto(
                valor
            );


        const aliases = {

            // =================================================
            // REGIÃO
            // =================================================

            regiao:
                "regiao",

            regioes:
                "regiao",

            regional:
                "regiao",


            // =================================================
            // SUBPREFEITURA
            // =================================================

            subprefeitura:
                "subprefeitura",

            subprefeituras:
                "subprefeitura",

            sub:
                "subprefeitura",


            // =================================================
            // DISTRITO
            // =================================================

            distrito:
                "distrito",

            distritos:
                "distrito",


            // =================================================
            // LOCAL / EQUIPAMENTO
            // =================================================

            local:
                "local",

            locais:
                "local",

            equipamento:
                "local",

            equipamentos:
                "local",

            pin:
                "local",

            pins:
                "local",


            // =================================================
            // PERÍMETRO
            // =================================================

            perimetro:
                "perimetro",

            perimetros:
                "perimetro",


            // =================================================
            // DIVISÕES INTERNAS
            // =================================================

            interno:
                "interno",

            interna:
                "interno",

            internos:
                "interno",

            internas:
                "interno",

            "divisao-interna":
                "interno",

            "divisoes-internas":
                "interno",

            "area-interna":
                "interno",

            "areas-internas":
                "interno"

        };


        return (
            aliases[
                chave
            ]
            ||
            ""
        );

    }


    // ========================================================
    // ESTADO
    // ========================================================

    /*
     * Primeiro tenta utilizar o que já existe na URL.
     *
     * Se o mapa estiver em iframe e nenhum nível tiver sido
     * informado, usamos PERÍMETRO.
     *
     * No mapa standalone não forçamos nada.
     */

    let nivelAtual =
        normalizarNivel(
            parametros.get(
                "nivel"
            )
        );


    if (
        !nivelAtual
        &&
        modoEmbed
    ) {

        nivelAtual =
            "perimetro";

    }


    // ========================================================
    // URL
    // ========================================================

    function atualizarURL(
        nivel
    ) {

        const nivelNormalizado =
            normalizarNivel(
                nivel
            );


        const url =
            new URL(
                window.location.href
            );


        if (
            nivelNormalizado
        ) {

            url.searchParams.set(
                "nivel",
                nivelNormalizado
            );

        }
        else {

            url.searchParams.delete(
                "nivel"
            );

        }


        /*
         * replaceState altera a URL sem recarregar
         * a página e sem adicionar entrada no histórico.
         */

        window.history.replaceState(
            window.history.state,
            "",
            url.toString()
        );


        nivelAtual =
            nivelNormalizado;


        return nivelAtual;

    }


    // ========================================================
    // GARANTIR URL INICIAL
    // ========================================================

    if (
        nivelAtual
        &&
        normalizarNivel(
            parametros.get(
                "nivel"
            )
        )
        !==
        nivelAtual
    ) {

        atualizarURL(
            nivelAtual
        );

    }
    else if (
        modoEmbed
        &&
        !parametros.has(
            "nivel"
        )
    ) {

        atualizarURL(
            nivelAtual
        );

    }


    // ========================================================
    // ALTERAR NÍVEL
    // ========================================================

    function definirNivel(
        nivel
    ) {

        const normalizado =
            normalizarNivel(
                nivel
            );


        if (
            !normalizado
        ) {

            console.warn(
                "[SPPMapaNivel] Nível inválido:",
                nivel
            );


            return false;

        }


        atualizarURL(
            normalizado
        );


        return true;

    }


    // ========================================================
    // WRAPPER DO sppApplyFilters
    // ========================================================
    //
    // mapa.js possui:
    //
    //     function sppApplyFilters(message)
    //
    // Sempre que o dashboard altera grupo/local, essa função
    // remove o Leaflet atual e executa inicializarSistema().
    //
    // O inicializarSistema() lê ?nivel= da URL.
    //
    // Portanto, antes da função original executar, garantimos
    // que o nível correto está na URL.
    // ========================================================

    if (
        typeof sppApplyFilters ===
        "function"
    ) {

        const sppApplyFiltersOriginal =
            sppApplyFilters;


        sppApplyFilters =
            function (
                message = {}
            ) {

                const mensagem = {
                    ...message
                };


                // =================================================
                // NÍVEL ENVIADO EXPLICITAMENTE
                // =================================================

                if (
                    mensagem.nivel !==
                    undefined
                    &&
                    mensagem.nivel !==
                    null
                    &&
                    mensagem.nivel !==
                    ""
                ) {

                    const recebido =
                        normalizarNivel(
                            mensagem.nivel
                        );


                    if (
                        recebido
                    ) {

                        atualizarURL(
                            recebido
                        );

                    }

                }


                // =================================================
                // ALIAS "level"
                // =================================================

                else if (
                    mensagem.level !==
                    undefined
                    &&
                    mensagem.level !==
                    null
                    &&
                    mensagem.level !==
                    ""
                ) {

                    const recebido =
                        normalizarNivel(
                            mensagem.level
                        );


                    if (
                        recebido
                    ) {

                        atualizarURL(
                            recebido
                        );

                    }

                }


                // =================================================
                // NENHUM NÍVEL NA MENSAGEM
                // =================================================
                //
                // Mantemos o nível atual.
                //
                // Isso é exatamente o que faltava no fluxo da
                // comparação.
                // =================================================

                else if (
                    nivelAtual
                ) {

                    atualizarURL(
                        nivelAtual
                    );

                }


                return sppApplyFiltersOriginal(
                    mensagem
                );

            };


        // ====================================================
        // ATUALIZAR API EXISTENTE
        // ====================================================

        if (
            window.SPPMapaBridge
        ) {

            window
                .SPPMapaBridge
                .aplicarFiltros =
                    sppApplyFilters;

        }

    }
    else {

        console.warn(
            "[SPPMapaNivel] sppApplyFilters não foi encontrado."
        );

    }


    // ========================================================
    // POPSTATE
    // ========================================================
    //
    // Se a URL for alterada pelo histórico do navegador,
    // sincronizamos a variável.
    // ========================================================

    window.addEventListener(
        "popstate",
        () => {

            const params =
                new URLSearchParams(
                    window.location.search
                );


            const novoNivel =
                normalizarNivel(
                    params.get(
                        "nivel"
                    )
                );


            if (
                novoNivel
            ) {

                nivelAtual =
                    novoNivel;

            }
            else if (
                modoEmbed
            ) {

                nivelAtual =
                    "perimetro";


                atualizarURL(
                    nivelAtual
                );

            }
            else {

                nivelAtual =
                    "";

            }

        }
    );


    // ========================================================
    // API GLOBAL
    // ========================================================

    window.SPPMapaNivel = {

        normalizar:
            normalizarNivel,


        definir:
            definirNivel,


        atualizarURL,


        get atual() {

            return nivelAtual;

        },


        get embed() {

            return modoEmbed;

        },


        get niveis() {

            return [
                "regiao",
                "subprefeitura",
                "distrito",
                "local",
                "perimetro",
                "interno"
            ];

        }

    };


    // ========================================================
    // DEBUG
    // ========================================================

    console.log(
        "[SPPMapaNivel] Nível:",
        nivelAtual ||
        "automático"
    );

})();
