// ============================================================
// NAVEGAÇÃO ENTRE ABAS
// ============================================================

const botoesAbas = document.querySelectorAll(".aba-navegacao");
const paineisAbas = document.querySelectorAll(".tab-panel");

function abrirAba(nomeAba, atualizarHash = true) {
    botoesAbas.forEach(botao => {
        const ativa = botao.dataset.tab === nomeAba;
        botao.classList.toggle("ativa", ativa);
        botao.setAttribute("aria-selected", ativa ? "true" : "false");
    });

    paineisAbas.forEach(painel => {
        const ativa = painel.id === `tab-${nomeAba}`;
        painel.classList.toggle("ativa", ativa);
    });

    if (nomeAba === "visao-geral") {
        setTimeout(() => {
            try {
                if (typeof mapa !== "undefined" && mapa) {
                    mapa.invalidateSize?.({ animate: false });
                }
            }
            catch (erro) {
                console.warn("Não foi possível atualizar o mapa da Visão Geral.", erro);
            }
        }, 80);
    }

    if (nomeAba === "comparacao") {
        setTimeout(() => {
            try {
                mapaComparacao?.invalidateSize({ animate: false });
            }
            catch (erro) {
                console.warn("Não foi possível atualizar o mapa da comparação.", erro);
            }
        }, 80);
    }

    if (atualizarHash) {
        history.replaceState(null, "", `#${nomeAba}`);
    }
}

botoesAbas.forEach(botao => {
    botao.addEventListener("click", () => {
        abrirAba(botao.dataset.tab);
    });
});

function carregarAbaInicial() {
    const hash = window.location.hash.replace("#", "").trim();

    const existe = Array.from(botoesAbas).some(
        botao => botao.dataset.tab === hash
    );

    abrirAba(existe ? hash : "visao-geral", false);
}

window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "").trim();

    const existe = Array.from(botoesAbas).some(
        botao => botao.dataset.tab === hash
    );

    if (existe) abrirAba(hash, false);
});

document.addEventListener("DOMContentLoaded", carregarAbaInicial);
