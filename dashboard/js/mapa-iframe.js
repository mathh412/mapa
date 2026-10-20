// ============================================================
// DASHBOARD — MAPA OFICIAL VIA IFRAME
// ============================================================

(function () {
    const iframe = document.getElementById("mapa-spp-iframe");
    const loading = document.getElementById("mapa-iframe-loading");

    if (!iframe) {
        console.error("mapa-spp-iframe não encontrado.");
        return;
    }

    const MAPA_ORIGIN = new URL(iframe.src, window.location.href).origin;

    let mapaPronto = false;
    let grupoAtual = "";
    let localAtual = "";
    let bufferAtual = null;
    let setoresAtuais = [];

    // ========================================================
    // COMUNICAÇÃO
    // ========================================================

    function enviarParaMapa(type, dados = {}) {
        if (!iframe.contentWindow) return;

        iframe.contentWindow.postMessage({
            source: "spp-dashboard",
            type,
            ...dados
        }, MAPA_ORIGIN);
    }

    function mostrarParceria(grupo) {
        grupoAtual = grupo || "";
        localAtual = "";

        enviarParaMapa("set-filters", {
            grupo: grupo ? [grupo] : ["todos"],
            local: []
        });
    }

    function mostrarLocal(grupo, local) {
        if (!grupo || !local) return;

        grupoAtual = grupo;
        localAtual = local;

        enviarParaMapa("focus-local", {
            grupo: [grupo],
            local: [local]
        });
    }

    // ========================================================
    // CAMADAS ANALÍTICAS
    // ========================================================

    function gerarGeoJSONSetores(selecionados) {
        prepararEscalaTematica();

        return {
            type: "FeatureCollection",
            features: selecionados.map(item => {
                const feature = item.feature;
                const dados = dadosDaFeature(feature);
                const estilo = estiloSetorSelecionado(feature);

                return {
                    type: "Feature",
                    geometry: feature.geometry,
                    properties: {
                        ...feature.properties,
                        __analysisColor: estilo.fillColor,
                        __analysisPopulacao: dados.populacao ?? null,
                        __analysisRenda: dados.renda ?? null,
                        __analysisIPVS: dados.ipvs || ""
                    }
                };
            })
        };
    }

    function enviarBuffer(buffer, ajustarZoom = true) {
        if (!buffer) return;

        bufferAtual = buffer;

        enviarParaMapa("set-analysis-layer", {
            layer: "buffer-territorial",
            tipo: "buffer",
            geojson: buffer,
            fit: ajustarZoom,
            style: {
                color: "#00506e",
                weight: 2,
                opacity: 0.95,
                dashArray: "7 5",
                fillColor: "#3b7d95",
                fillOpacity: 0.07
            }
        });
    }

    function enviarSetores(selecionados) {
        setoresAtuais = selecionados;

        enviarParaMapa("set-analysis-layer", {
            layer: "setores-territoriais",
            tipo: "setores",
            geojson: gerarGeoJSONSetores(selecionados)
        });
    }

    function limparAnaliseMapa() {
        bufferAtual = null;
        setoresAtuais = [];
        enviarParaMapa("clear-analysis-layers");
    }

    function reenviarEstado() {
        if (grupoAtual && localAtual) {
            mostrarLocal(grupoAtual, localAtual);
        }
        else if (grupoAtual) {
            mostrarParceria(grupoAtual);
        }

        setTimeout(() => {
            if (bufferAtual) enviarBuffer(bufferAtual, true);
            if (setoresAtuais.length) enviarSetores(setoresAtuais);
        }, 140);
    }

    // ========================================================
    // ADAPTADORES DO app.js
    // ========================================================

    inicializarMapa = function () {
        mapa = {
            fitBounds() {},
            removeLayer() {},
            invalidateSize() {}
        };
    };

    desenharEmpreendimento = function (feature) {
        camadaEmpreendimento = {
            bringToFront() {}
        };

        const grupo = elementos.parceria.value;
        const local = nomeDoLocal(feature);
        mostrarLocal(grupo, local);
    };

    desenharBuffer = function (buffer) {
        const bbox = turf.bbox(buffer);

        camadaBuffer = {
            getBounds() {
                return L.latLngBounds(
                    [bbox[1], bbox[0]],
                    [bbox[3], bbox[2]]
                );
            }
        };

        enviarBuffer(buffer, true);
    };

    desenharSetoresSelecionados = function (selecionados) {
        prepararEscalaTematica();

        camadaSetoresSelecionados = {
            setStyle() {},
            resetStyle() {}
        };

        enviarSetores(selecionados);
        atualizarLegendaMapa();
    };

    atualizarTemaMapa = function () {
        if (!ultimosSelecionados.length) {
            atualizarLegendaMapa();
            return;
        }

        prepararEscalaTematica();
        enviarSetores(ultimosSelecionados);
        atualizarLegendaMapa();
    };

    limparAnaliseGeografica = function () {
        numeroAnalise++;
        ultimosSelecionados = [];
        dadosFaixasDistancia = [];
        escalaTemaAtual = null;
        camadaBuffer = null;
        camadaSetoresSelecionados = null;
        camadaEmpreendimento = null;

        limparAnaliseMapa();
        atualizarLegendaMapa();
    };

    // ========================================================
    // PARCERIA DO DASHBOARD -> MAPA
    // ========================================================

    document.addEventListener("DOMContentLoaded", () => {
        const select = document.getElementById("filtro-parceria");
        if (!select) return;

        select.addEventListener("change", () => {
            mostrarParceria(select.value);
        });
    });

    // ========================================================
    // MAPA -> DASHBOARD
    // ========================================================

    function normalizar(texto) {
        return String(texto ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    async function localizarOption(select, nome) {
        const alvo = normalizar(nome);

        for (let tentativa = 0; tentativa < 40; tentativa++) {
            const option = Array.from(select.options).find(item =>
                normalizar(item.textContent) === alvo
            );

            if (option) return option;

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return null;
    }

    async function selecionarLocalDoMapa(grupo, local) {
        if (!grupo || !local || !PARCERIAS[grupo]) return;

        const selectParceria = document.getElementById("filtro-parceria");
        const selectLocal = document.getElementById("filtro-local");

        if (!selectParceria || !selectLocal) return;

        if (selectParceria.value !== grupo) {
            selectParceria.value = grupo;
            selectParceria.dispatchEvent(new Event("change", { bubbles: true }));
        }

        const option = await localizarOption(selectLocal, local);

        if (!option) {
            console.warn("Local selecionado no mapa não encontrado:", grupo, local);
            return;
        }

        if (selectLocal.value !== option.value) {
            selectLocal.value = option.value;
            selectLocal.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    window.addEventListener("message", event => {
        if (event.source !== iframe.contentWindow) return;
        if (event.origin !== MAPA_ORIGIN) return;

        const mensagem = event.data;
        if (!mensagem || mensagem.source !== "spp-mapa") return;

        if (mensagem.type === "map-ready") {
            mapaPronto = true;
            loading?.classList.add("oculto");
            reenviarEstado();
            return;
        }

        if (mensagem.type === "local-selected") {
            selecionarLocalDoMapa(mensagem.grupo, mensagem.local);
        }
    });

    iframe.addEventListener("load", () => {
        mapaPronto = false;
        loading?.classList.remove("oculto");

        setTimeout(() => {
            enviarParaMapa("ping");
        }, 150);
    });

    window.SPPDashboardMap = {
        iframe,
        enviar: enviarParaMapa,
        mostrarParceria,
        mostrarLocal,
        enviarBuffer,
        enviarSetores,
        limpar: limparAnaliseMapa,
        reenviar: reenviarEstado,
        get pronto() {
            return mapaPronto;
        }
    };
})();
