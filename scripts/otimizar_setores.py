from pathlib import Path
import json

import geopandas as gpd
from shapely.geometry import mapping


# ============================================================
# CAMINHOS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

ARQUIVO_ENTRADA = (
    BASE_DIR
    / "dados"
    / "setores"
    / "setores_sp.geojson"
)

ARQUIVO_SAIDA = (
    BASE_DIR
    / "dados"
    / "setores"
    / "setores_sp_web.geojson"
)


# ============================================================
# CONFIGURAÇÕES
# ============================================================

# CRS métrico adequado para São Paulo
CRS_METROS = "EPSG:31983"

# Simplificação em metros.
#
# Começaremos com apenas 2 metros.
# É conservador e deve preservar muito bem os setores.
TOLERANCIA_METROS = 2.0

# Casas decimais das coordenadas finais.
#
# 6 casas em latitude/longitude representam
# aproximadamente centímetros/decímetros,
# muito além da precisão que precisamos no mapa.
CASAS_DECIMAIS = 6


# ============================================================
# ARREDONDAMENTO
# ============================================================

def arredondar_coordenadas(valor):
    """
    Percorre recursivamente as coordenadas de Polygon,
    MultiPolygon etc. e limita as casas decimais.
    """

    if isinstance(valor, (list, tuple)):

        return [
            arredondar_coordenadas(item)
            for item in valor
        ]

    if isinstance(valor, float):

        return round(
            valor,
            CASAS_DECIMAIS
        )

    return valor


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("==========================================")
    print("OTIMIZAÇÃO DOS SETORES PARA WEB")
    print("==========================================")

    if not ARQUIVO_ENTRADA.exists():

        print()
        print("ERRO: arquivo não encontrado:")
        print(ARQUIVO_ENTRADA)

        return


    # --------------------------------------------------------
    # TAMANHO ORIGINAL
    # --------------------------------------------------------

    tamanho_original = (
        ARQUIVO_ENTRADA.stat().st_size
        / 1024
        / 1024
    )

    print()
    print(
        f"Arquivo original: {tamanho_original:.2f} MB"
    )


    # --------------------------------------------------------
    # CARREGAR
    # --------------------------------------------------------

    print()
    print("Carregando setores...")

    gdf = gpd.read_file(
        ARQUIVO_ENTRADA
    )

    print(
        f"Setores carregados: {len(gdf):,}"
    )


    # --------------------------------------------------------
    # CRS
    # --------------------------------------------------------

    if gdf.crs is None:

        print(
            "CRS não informado. Assumindo EPSG:4326."
        )

        gdf = gdf.set_crs(
            "EPSG:4326"
        )

    else:

        print(
            f"CRS original: {gdf.crs}"
        )


    # --------------------------------------------------------
    # REMOVER GEOMETRIAS VAZIAS
    # --------------------------------------------------------

    antes = len(gdf)

    gdf = gdf[
        gdf.geometry.notna()
        & ~gdf.geometry.is_empty
    ].copy()

    removidos = antes - len(gdf)

    print(
        f"Geometrias vazias removidas: {removidos:,}"
    )


    # --------------------------------------------------------
    # CONVERTER PARA METROS
    # --------------------------------------------------------

    print()
    print(
        f"Projetando para {CRS_METROS}..."
    )

    gdf_metros = gdf.to_crs(
        CRS_METROS
    )


    # --------------------------------------------------------
    # CORRIGIR GEOMETRIAS INVÁLIDAS
    # --------------------------------------------------------

    invalidas_antes = (
        ~gdf_metros.geometry.is_valid
    ).sum()

    print(
        f"Geometrias inválidas antes: {invalidas_antes:,}"
    )

    if invalidas_antes > 0:

        gdf_metros.loc[
            ~gdf_metros.geometry.is_valid,
            "geometry"
        ] = (
            gdf_metros.loc[
                ~gdf_metros.geometry.is_valid,
                "geometry"
            ]
            .buffer(0)
        )


    # --------------------------------------------------------
    # SIMPLIFICAR
    # --------------------------------------------------------

    print()
    print(
        f"Simplificando com tolerância de "
        f"{TOLERANCIA_METROS} metros..."
    )

    gdf_metros["geometry"] = (
        gdf_metros.geometry.simplify(
            tolerance=TOLERANCIA_METROS,
            preserve_topology=True
        )
    )


    # --------------------------------------------------------
    # VERIFICAR NOVAMENTE
    # --------------------------------------------------------

    invalidas_depois = (
        ~gdf_metros.geometry.is_valid
    ).sum()

    print(
        f"Geometrias inválidas depois: {invalidas_depois:,}"
    )


    # --------------------------------------------------------
    # VOLTAR PARA WGS84
    # --------------------------------------------------------

    print()
    print(
        "Voltando para EPSG:4326..."
    )

    gdf_web = gdf_metros.to_crs(
        "EPSG:4326"
    )


    # --------------------------------------------------------
    # CRIAR GEOJSON MANUALMENTE
    # --------------------------------------------------------
    #
    # Fazemos manualmente para:
    #
    # 1. guardar somente CD_SETOR
    # 2. arredondar coordenadas
    # 3. remover espaços desnecessários do JSON
    #

    print()
    print(
        "Gerando GeoJSON compacto..."
    )

    features = []

    for indice, linha in gdf_web.iterrows():

        geometria = mapping(
            linha.geometry
        )

        geometria["coordinates"] = (
            arredondar_coordenadas(
                geometria["coordinates"]
            )
        )

        feature = {
            "type": "Feature",

            "properties": {
                "CD_SETOR":
                    str(
                        linha["CD_SETOR"]
                    )
            },

            "geometry":
                geometria
        }

        features.append(
            feature
        )


    geojson = {
        "type": "FeatureCollection",
        "features": features
    }


    # --------------------------------------------------------
    # SALVAR
    # --------------------------------------------------------

    with open(
        ARQUIVO_SAIDA,
        "w",
        encoding="utf-8"
    ) as arquivo:

        json.dump(
            geojson,
            arquivo,
            ensure_ascii=False,

            # Isso remove espaços e quebras de linha
            separators=(",", ":")
        )


    # --------------------------------------------------------
    # RESULTADO
    # --------------------------------------------------------

    tamanho_final = (
        ARQUIVO_SAIDA.stat().st_size
        / 1024
        / 1024
    )

    reducao = (
        1
        - tamanho_final
        / tamanho_original
    ) * 100


    print()
    print("==========================================")
    print("RESULTADO")
    print("==========================================")

    print(
        f"Setores: {len(features):,}"
    )

    print(
        f"Original: {tamanho_original:.2f} MB"
    )

    print(
        f"Web:      {tamanho_final:.2f} MB"
    )

    print(
        f"Redução:  {reducao:.1f}%"
    )

    print()

    print(
        f"Arquivo criado:"
        f"\n{ARQUIVO_SAIDA}"
    )

    print()
    print(
        "=========================================="
    )
    print(
        "OTIMIZAÇÃO FINALIZADA"
    )
    print(
        "=========================================="
    )


if __name__ == "__main__":
    main()