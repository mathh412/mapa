from pathlib import Path
import re
import shutil
import sys


# ============================================================
# CAMINHOS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

INDEX = ROOT / "index.html"

PASTA_CSS = ROOT / "css"
PASTA_JS = ROOT / "js"

ARQUIVO_CSS = PASTA_CSS / "mapa.css"
ARQUIVO_JS = PASTA_JS / "mapa.js"

BACKUP = ROOT / "index.inline.backup.html"


# ============================================================
# VALIDAÇÕES
# ============================================================

if not INDEX.exists():
    print(f"ERRO: index.html não encontrado em:")
    print(INDEX)
    sys.exit(1)


html = INDEX.read_text(
    encoding="utf-8"
)


# ============================================================
# NÃO EXECUTAR DUAS VEZES ACIDENTALMENTE
# ============================================================

if (
    'href="./css/mapa.css"' in html
    and
    'src="./js/mapa.js"' in html
):
    print("")
    print("O mapa já parece estar separado.")
    print("")
    print("Encontrado:")
    print("  css/mapa.css")
    print("  js/mapa.js")
    print("")
    sys.exit(0)


# ============================================================
# LOCALIZAR STYLE
# ============================================================

match_style = re.search(
    r"<style[^>]*>(.*?)</style>",
    html,
    flags=re.DOTALL | re.IGNORECASE
)


if not match_style:
    print("ERRO: bloco <style> não encontrado.")
    sys.exit(1)


css = match_style.group(1).strip()


# ============================================================
# LOCALIZAR SCRIPT PRINCIPAL
# ============================================================
#
# Não pegamos scripts externos Leaflet/Turf.
# Procuramos especificamente pelo script que contém
# SPP_BRIDGE_SOURCE e inicializarSistema.
#
# ============================================================

scripts_inline = list(
    re.finditer(
        r"<script(?![^>]*\bsrc\s*=)[^>]*>(.*?)</script>",
        html,
        flags=re.DOTALL | re.IGNORECASE
    )
)


match_script = None


for match in scripts_inline:

    conteudo = match.group(1)

    if (
        "SPP_BRIDGE_SOURCE" in conteudo
        and
        "inicializarSistema" in conteudo
    ):
        match_script = match
        break


if not match_script:
    print("ERRO: JavaScript principal do mapa não encontrado.")
    sys.exit(1)


javascript = match_script.group(1).strip()


# ============================================================
# PEQUENA MELHORIA
# ============================================================
#
# Adicionamos uma classe própria ao botão de voltar.
# Isso permitirá escondê-lo quando o mapa estiver dentro
# do dashboard sem esconder o controle de zoom.
#
# ============================================================

javascript = javascript.replace(
    "const box=L.DomUtil.create('div','leaflet-bar');",
    "const box=L.DomUtil.create('div','leaflet-bar spp-back-control');"
)


# ============================================================
# CSS DO MODO EMBED
# ============================================================

css_embed = r"""

/* ============================================================
   MODO EMBED / DASHBOARD
============================================================ */

html.spp-modo-embed,
html.spp-modo-embed body {

    width: 100%;
    height: 100%;

    margin: 0;
    padding: 0;

    overflow: hidden;

}


html.spp-modo-embed #map {

    width: 100%;
    height: 100%;

}


html.spp-modo-embed #indicador-camada {

    display: none !important;

}


/*
 * No dashboard esses elementos duplicariam informações
 * que já estão na interface externa.
 */

html.spp-modo-embed .equipment-map-legend,
html.spp-modo-embed .spp-back-control {

    display: none !important;

}


html.spp-modo-embed .leaflet-control-attribution {

    font-size: 8px;

}


/* ============================================================
   SETORES ANALÍTICOS
============================================================ */

.tooltip-setor-analitico {

    min-width: 165px;

    padding: 8px 10px !important;

    border:

        1px solid
        rgba(0, 80, 110, 0.25) !important;

    border-radius: 6px !important;

    background:

        rgba(255, 255, 255, 0.98) !important;

    color: #263238 !important;

    font-family:

        "Segoe UI",
        Arial,
        sans-serif;

    font-size: 11px;

    font-weight: 400 !important;

    box-shadow:

        0 3px 12px
        rgba(0, 0, 0, 0.18) !important;

}


.tooltip-setor-analitico::before {

    display: none !important;

}


.tooltip-setor-analitico .tooltip-setor-titulo {

    margin-bottom: 6px;

    color: #00506e;

    font-weight: 700;

}


.tooltip-setor-analitico .tooltip-setor-linha {

    margin: 2px 0;

}
"""


css = (
    css
    +
    "\n"
    +
    css_embed.strip()
    +
    "\n"
)


# ============================================================
# CRIAR DIRETÓRIOS
# ============================================================

PASTA_CSS.mkdir(
    parents=True,
    exist_ok=True
)

PASTA_JS.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# BACKUP
# ============================================================

if not BACKUP.exists():

    shutil.copy2(
        INDEX,
        BACKUP
    )


# ============================================================
# GRAVAR CSS E JS
# ============================================================

ARQUIVO_CSS.write_text(
    css,
    encoding="utf-8"
)


ARQUIVO_JS.write_text(
    javascript + "\n",
    encoding="utf-8"
)


# ============================================================
# NOVO INDEX
# ============================================================

novo_index = """<!DOCTYPE html>
<html lang="pt-BR">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Mapa Interativo - São Paulo
    </title>


    <!-- =====================================================
         LEAFLET
    ====================================================== -->

    <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    >


    <!-- =====================================================
         MAPA
    ====================================================== -->

    <link
        rel="stylesheet"
        href="./css/mapa.css"
    >

</head>


<body>


    <!-- =====================================================
         CARREGAMENTO
    ====================================================== -->

    <div id="loading">

        Carregando dados geográficos da nuvem...

    </div>


    <!-- =====================================================
         INDICADOR DA CAMADA
    ====================================================== -->

    <div
        id="indicador-camada"
        style="display:none"
    >

        Camada Atual: Regiões

    </div>


    <!-- =====================================================
         MAPA
    ====================================================== -->

    <div id="map"></div>


    <!-- =====================================================
         LEAFLET
    ====================================================== -->

    <script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    ></script>


    <!-- =====================================================
         TURF
    ====================================================== -->

    <script
        src="https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js"
    ></script>


    <!-- =====================================================
         MOTOR DO MAPA
    ====================================================== -->

    <script
        src="./js/mapa.js"
    ></script>


    <!-- =====================================================
         INTEGRAÇÃO ANALÍTICA
    ====================================================== -->

    <script
        src="./js/bridge-analitico.js"
    ></script>


</body>

</html>
"""


INDEX.write_text(
    novo_index,
    encoding="utf-8"
)


# ============================================================
# RESULTADO
# ============================================================

print("")
print("=" * 60)
print("MAPA SEPARADO COM SUCESSO")
print("=" * 60)
print("")

print("Backup:")
print(f"  {BACKUP}")
print("")

print("HTML:")
print(f"  {INDEX}")
print("")

print("CSS:")
print(f"  {ARQUIVO_CSS}")
print("")

print("JavaScript:")
print(f"  {ARQUIVO_JS}")
print("")

print(f"Tamanho CSS: {ARQUIVO_CSS.stat().st_size / 1024:.2f} KB")
print(f"Tamanho JS:  {ARQUIVO_JS.stat().st_size / 1024:.2f} KB")

print("")
print("Agora crie:")
print("  js/bridge-analitico.js")
print("")
print("FINALIZADO")