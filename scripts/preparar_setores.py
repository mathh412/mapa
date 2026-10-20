from pathlib import Path
import json
import re
import unicodedata
from decimal import Decimal, InvalidOperation

import pandas as pd
import geopandas as gpd
from shapely import wkt


# ============================================================
# CAMINHOS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

PASTA_BRUTOS = BASE_DIR / "dados_brutos"
PASTA_SAIDA = BASE_DIR / "dados" / "setores"

ARQUIVO_MALHA = PASTA_BRUTOS / "malha_2022.xlsx"
ARQUIVO_RENDA = PASTA_BRUTOS / "renda_responsavel.xlsx"
ARQUIVO_IPVS = PASTA_BRUTOS / "ipvs.xlsx"
ARQUIVO_POPULACAO = PASTA_BRUTOS / "POP_RACA_COR_GENERO_SP.xlsx"

ARQUIVO_GEOJSON = PASTA_SAIDA / "setores_sp.geojson"
ARQUIVO_INDICADORES = PASTA_SAIDA / "indicadores_sp.json"
ARQUIVO_CONFERENCIA = PASTA_SAIDA / "setores_sp_conferencia.csv"


# ============================================================
# CONFIGURAÇÕES
# ============================================================

# Código IBGE do município de São Paulo
CD_MUNICIPIO_SP = "3550308"


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def normalizar_nome_coluna(nome):
    """
    Remove acentos, espaços e caracteres especiais do nome
    da coluna.

    Exemplo:
        "População Total" -> "POPULACAO_TOTAL"
    """

    nome = str(nome).strip()

    nome = unicodedata.normalize("NFKD", nome)
    nome = "".join(
        c for c in nome
        if not unicodedata.combining(c)
    )

    nome = nome.upper()

    nome = re.sub(
        r"[^A-Z0-9]+",
        "_",
        nome
    )

    return nome.strip("_")


def normalizar_colunas(df):
    df = df.copy()

    df.columns = [
        normalizar_nome_coluna(coluna)
        for coluna in df.columns
    ]

    return df


def encontrar_coluna(df, candidatos, obrigatoria=True):
    """
    Procura uma coluna utilizando vários nomes possíveis.
    """

    for candidato in candidatos:

        candidato_normalizado = normalizar_nome_coluna(
            candidato
        )

        if candidato_normalizado in df.columns:
            return candidato_normalizado

    if obrigatoria:
        raise ValueError(
            "\nNão foi possível encontrar uma das colunas:\n"
            + "\n".join(candidatos)
            + "\n\nColunas encontradas:\n"
            + "\n".join(df.columns)
        )

    return None


def normalizar_codigo_setor(valor):
    """
    Transforma CD_SETOR em texto.

    É fundamental não tratar o código do setor como número,
    pois ele é um identificador.
    """

    if pd.isna(valor):
        return None

    texto = str(valor).strip()

    if not texto:
        return None

    texto = texto.replace(" ", "")

    # Caso comum gerado pelo Excel:
    # 355030801000001.0
    if texto.endswith(".0"):
        texto = texto[:-2]

    # Caso tenha vindo com vírgula decimal
    if "," in texto and "E" not in texto.upper():
        texto = texto.replace(",", ".")

    # Tenta tratar notação científica.
    # ATENÇÃO:
    # se o Excel já tiver arredondado o código, os dígitos
    # originais não podem ser recuperados.
    if "E" in texto.upper():

        try:
            numero = Decimal(
                texto.replace(",", ".")
            )

            texto = str(
                int(numero)
            )

        except InvalidOperation:
            return texto

    # Mantém somente números
    somente_numeros = re.sub(
        r"\D",
        "",
        texto
    )

    if somente_numeros:
        return somente_numeros

    return texto


def converter_numero(valor):
    """
    Converte números no formato brasileiro e internacional.

    Exemplos:
        0,0717967
        177068,09
        1.234,56
        1234.56
    """

    if pd.isna(valor):
        return None

    texto = str(valor).strip()

    if not texto:
        return None

    if texto.lower() in {
        "nan",
        "none",
        "null",
        ".",
        "-"
    }:
        return None

    texto = texto.replace("R$", "")
    texto = texto.replace(" ", "")

    # Formato brasileiro:
    # 1.234,56
    if "," in texto:

        texto = texto.replace(".", "")
        texto = texto.replace(",", ".")

    try:
        return float(texto)

    except ValueError:
        return None


def ler_excel(caminho):
    print(
        f"\nLendo: {caminho.name}"
    )

    df = pd.read_excel(
        caminho,
        dtype=str
    )

    df = normalizar_colunas(df)

    print(
        f"  {len(df):,} registros"
    )

    return df


def preparar_codigo_setor(df):
    coluna_setor = encontrar_coluna(
        df,
        [
            "CD_SETOR",
            "CDSETOR",
            "CD_SETOR_CENSITARIO",
            "COD_SETOR",
            "CODIGO_SETOR",
            "SETOR"
        ]
    )

    if coluna_setor != "CD_SETOR":

        df = df.rename(
            columns={
                coluna_setor: "CD_SETOR"
            }
        )

    df["CD_SETOR"] = (
        df["CD_SETOR"]
        .apply(normalizar_codigo_setor)
    )

    return df


def filtrar_sao_paulo(df):
    """
    Usa os primeiros 7 dígitos de CD_SETOR,
    que identificam o município.
    """

    antes = len(df)

    df = df[
        df["CD_SETOR"]
        .fillna("")
        .str.startswith(
            CD_MUNICIPIO_SP
        )
    ].copy()

    depois = len(df)

    print(
        f"  São Paulo: {depois:,} de {antes:,} registros"
    )

    return df


# ============================================================
# MALHA
# ============================================================

def preparar_malha():
    print("\n==============================")
    print("PREPARANDO MALHA")
    print("==============================")

    df = ler_excel(
        ARQUIVO_MALHA
    )

    df = preparar_codigo_setor(df)
    df = filtrar_sao_paulo(df)

    coluna_geometria = encontrar_coluna(
        df,
        [
            "GEOMETRY",
            "GEOMETRIA",
            "WKT",
            "GEOM",
            "THE_GEOM"
        ],
        obrigatoria=False
    )

    # Caso não exista uma coluna chamada explicitamente
    # GEOMETRY/WKT, procura automaticamente uma coluna
    # que contenha POLYGON ou MULTIPOLYGON.
    if coluna_geometria is None:

        for coluna in df.columns:

            amostra = (
                df[coluna]
                .dropna()
                .astype(str)
                .head(30)
            )

            encontrou = amostra.str.match(
                r"^\s*(POLYGON|MULTIPOLYGON)",
                case=False
            ).any()

            if encontrou:
                coluna_geometria = coluna
                break

    if coluna_geometria is None:
        raise ValueError(
            "Não consegui localizar a coluna com os POLYGONs "
            "da malha."
        )

    print(
        f"  Coluna de geometria: {coluna_geometria}"
    )

    def converter_wkt(valor):

        if pd.isna(valor):
            return None

        try:
            geometria = wkt.loads(
                str(valor)
            )

            # Corrige alguns problemas simples de topologia
            if not geometria.is_valid:
                geometria = geometria.buffer(0)

            return geometria

        except Exception:
            return None

    df["geometry"] = (
        df[coluna_geometria]
        .apply(converter_wkt)
    )

    sem_geometria = df["geometry"].isna().sum()

    print(
        f"  Geometrias inválidas/nulas: {sem_geometria:,}"
    )

    df = df[
        df["geometry"].notna()
    ].copy()

    # Não queremos códigos repetidos
    df = (
        df
        .drop_duplicates(
            subset=["CD_SETOR"]
        )
    )

    gdf = gpd.GeoDataFrame(
        df[
            [
                "CD_SETOR",
                "geometry"
            ]
        ],
        geometry="geometry",
        crs="EPSG:4326"
    )

    return gdf


# ============================================================
# POPULAÇÃO / RAÇA / GÊNERO
# ============================================================

def preparar_populacao():
    print("\n==============================")
    print("PREPARANDO POPULAÇÃO")
    print("==============================")

    df = ler_excel(
        ARQUIVO_POPULACAO
    )

    df = preparar_codigo_setor(df)
    df = filtrar_sao_paulo(df)

    colunas_desejadas = [
        "AREA_KM2",
        "CD_DIST",
        "POPULACAO_TOTAL",
        "POPULACAO_BRANCA",
        "POPULACAO_PRETA",
        "POPULACAO_AMARELA",
        "POPULACAO_PARDA",
        "POPULACAO_INDIGENA",
        "POPULACAO_MASCULINA",
        "POPULACAO_FEMININA"
    ]

    resultado = pd.DataFrame()

    resultado["CD_SETOR"] = (
        df["CD_SETOR"]
    )

    for coluna in colunas_desejadas:

        if coluna in df.columns:

            resultado[coluna] = (
                df[coluna]
                .apply(converter_numero)
            )

        else:

            print(
                f"  Aviso: coluna não encontrada: {coluna}"
            )

            resultado[coluna] = None

    resultado = (
        resultado
        .drop_duplicates(
            subset=["CD_SETOR"]
        )
    )

    return resultado


# ============================================================
# RENDA
# ============================================================

def preparar_renda():
    print("\n==============================")
    print("PREPARANDO RENDA")
    print("==============================")

    df = ler_excel(
        ARQUIVO_RENDA
    )

    df = preparar_codigo_setor(df)
    df = filtrar_sao_paulo(df)

    coluna_renda = None

    # Primeiro procura palavras relacionadas a rendimento
    for coluna in df.columns:

        nome = normalizar_nome_coluna(
            coluna
        )

        if (
            "RENDIMENTO" in nome
            and (
                "RESPONS" in nome
                or "DOMICIL" in nome
            )
        ):
            coluna_renda = coluna
            break

    # Fallback
    if coluna_renda is None:

        candidatos = [
            coluna
            for coluna in df.columns
            if coluna != "CD_SETOR"
        ]

        if len(candidatos) == 1:
            coluna_renda = candidatos[0]

    if coluna_renda is None:

        raise ValueError(
            "\nNão consegui identificar a coluna de renda.\n"
            "Colunas disponíveis:\n"
            + "\n".join(df.columns)
        )

    print(
        f"  Coluna de renda: {coluna_renda}"
    )

    resultado = df[
        [
            "CD_SETOR",
            coluna_renda
        ]
    ].copy()

    resultado = resultado.rename(
        columns={
            coluna_renda: "RENDA_RESPONSAVEL"
        }
    )

    resultado["RENDA_RESPONSAVEL"] = (
        resultado["RENDA_RESPONSAVEL"]
        .apply(converter_numero)
    )

    resultado = (
        resultado
        .drop_duplicates(
            subset=["CD_SETOR"]
        )
    )

    return resultado


# ============================================================
# IPVS
# ============================================================

def preparar_ipvs():
    print("\n==============================")
    print("PREPARANDO IPVS")
    print("==============================")

    df = ler_excel(
        ARQUIVO_IPVS
    )

    df = preparar_codigo_setor(df)
    df = filtrar_sao_paulo(df)

    coluna_vulnerabilidade = encontrar_coluna(
        df,
        [
            "VULNERABILIDADE",
            "IPVS",
            "CLASSIFICACAO_IPVS"
        ]
    )

    resultado = df[
        [
            "CD_SETOR",
            coluna_vulnerabilidade
        ]
    ].copy()

    resultado = resultado.rename(
        columns={
            coluna_vulnerabilidade:
                "VULNERABILIDADE"
        }
    )

    resultado["VULNERABILIDADE"] = (
        resultado["VULNERABILIDADE"]
        .astype(str)
        .str.strip()
        .replace(
            {
                "nan": None,
                "None": None
            }
        )
    )

    resultado = (
        resultado
        .drop_duplicates(
            subset=["CD_SETOR"]
        )
    )

    return resultado


# ============================================================
# GERAR INDICADORES
# ============================================================

def gerar_indicadores(
    malha,
    populacao,
    renda,
    ipvs
):
    print("\n==============================")
    print("UNINDO INDICADORES")
    print("==============================")

    # Começamos pelos setores que realmente existem na malha.
    dados = pd.DataFrame(
        {
            "CD_SETOR":
                malha["CD_SETOR"]
        }
    )

    dados = dados.merge(
        populacao,
        on="CD_SETOR",
        how="left"
    )

    dados = dados.merge(
        renda,
        on="CD_SETOR",
        how="left"
    )

    dados = dados.merge(
        ipvs,
        on="CD_SETOR",
        how="left"
    )

    print(
        f"  Setores finais: {len(dados):,}"
    )

    return dados


# ============================================================
# SALVAR GEOJSON
# ============================================================

def salvar_geojson(gdf):
    print("\nSalvando GeoJSON...")

    PASTA_SAIDA.mkdir(
        parents=True,
        exist_ok=True
    )

    # Somente CD_SETOR + geometria.
    # Os indicadores ficam no JSON separado.
    gdf[
        [
            "CD_SETOR",
            "geometry"
        ]
    ].to_file(
        ARQUIVO_GEOJSON,
        driver="GeoJSON"
    )

    tamanho_mb = (
        ARQUIVO_GEOJSON.stat().st_size
        / 1024
        / 1024
    )

    print(
        f"  {ARQUIVO_GEOJSON}"
    )

    print(
        f"  Tamanho: {tamanho_mb:.2f} MB"
    )


# ============================================================
# SALVAR INDICADORES JSON
# ============================================================

def valor_json(valor):
    if pd.isna(valor):
        return None

    return valor


def salvar_indicadores(dados):
    print("\nSalvando indicadores...")

    indicadores = {}

    for _, linha in dados.iterrows():

        codigo = linha["CD_SETOR"]

        indicadores[codigo] = {

            "area_km2":
                valor_json(
                    linha.get("AREA_KM2")
                ),

            "cd_dist":
                valor_json(
                    linha.get("CD_DIST")
                ),

            "populacao":
                valor_json(
                    linha.get(
                        "POPULACAO_TOTAL"
                    )
                ),

            "branca":
                valor_json(
                    linha.get(
                        "POPULACAO_BRANCA"
                    )
                ),

            "preta":
                valor_json(
                    linha.get(
                        "POPULACAO_PRETA"
                    )
                ),

            "amarela":
                valor_json(
                    linha.get(
                        "POPULACAO_AMARELA"
                    )
                ),

            "parda":
                valor_json(
                    linha.get(
                        "POPULACAO_PARDA"
                    )
                ),

            "indigena":
                valor_json(
                    linha.get(
                        "POPULACAO_INDIGENA"
                    )
                ),

            "masculina":
                valor_json(
                    linha.get(
                        "POPULACAO_MASCULINA"
                    )
                ),

            "feminina":
                valor_json(
                    linha.get(
                        "POPULACAO_FEMININA"
                    )
                ),

            "renda":
                valor_json(
                    linha.get(
                        "RENDA_RESPONSAVEL"
                    )
                ),

            "ipvs":
                valor_json(
                    linha.get(
                        "VULNERABILIDADE"
                    )
                )
        }

    with open(
        ARQUIVO_INDICADORES,
        "w",
        encoding="utf-8"
    ) as arquivo:

        json.dump(
            indicadores,
            arquivo,
            ensure_ascii=False,
            separators=(",", ":")
        )

    tamanho_mb = (
        ARQUIVO_INDICADORES.stat().st_size
        / 1024
        / 1024
    )

    print(
        f"  {ARQUIVO_INDICADORES}"
    )

    print(
        f"  Tamanho: {tamanho_mb:.2f} MB"
    )


# ============================================================
# ARQUIVO DE CONFERÊNCIA
# ============================================================

def salvar_conferencia(dados):
    dados.to_csv(
        ARQUIVO_CONFERENCIA,
        index=False,
        encoding="utf-8-sig",
        sep=";"
    )

    print(
        f"\nArquivo de conferência:"
        f"\n  {ARQUIVO_CONFERENCIA}"
    )


# ============================================================
# RELATÓRIO
# ============================================================

def mostrar_relatorio(dados):
    total = len(dados)

    print("\n==============================")
    print("RELATÓRIO")
    print("==============================")

    print(
        f"Setores: {total:,}"
    )

    campos = {
        "POPULACAO_TOTAL":
            "População",

        "RENDA_RESPONSAVEL":
            "Renda",

        "VULNERABILIDADE":
            "IPVS"
    }

    for coluna, nome in campos.items():

        if coluna not in dados.columns:
            continue

        preenchidos = (
            dados[coluna]
            .notna()
            .sum()
        )

        percentual = (
            preenchidos / total * 100
            if total
            else 0
        )

        print(
            f"{nome}: "
            f"{preenchidos:,}/{total:,} "
            f"({percentual:.1f}%)"
        )


# ============================================================
# MAIN
# ============================================================

def main():
    print(
        "\n========================================="
    )

    print(
        "PREPARAÇÃO DOS SETORES CENSITÁRIOS"
    )

    print(
        "Município: São Paulo - SP"
    )

    print(
        "========================================="
    )

    # Confere arquivos
    arquivos = [
        ARQUIVO_MALHA,
        ARQUIVO_RENDA,
        ARQUIVO_IPVS,
        ARQUIVO_POPULACAO
    ]

    faltando = [
        arquivo
        for arquivo in arquivos
        if not arquivo.exists()
    ]

    if faltando:

        print(
            "\nERRO: arquivos não encontrados:"
        )

        for arquivo in faltando:
            print(
                f"  - {arquivo}"
            )

        return

    PASTA_SAIDA.mkdir(
        parents=True,
        exist_ok=True
    )

    malha = preparar_malha()

    populacao = preparar_populacao()

    renda = preparar_renda()

    ipvs = preparar_ipvs()

    dados = gerar_indicadores(
        malha,
        populacao,
        renda,
        ipvs
    )

    salvar_geojson(
        malha
    )

    salvar_indicadores(
        dados
    )

    salvar_conferencia(
        dados
    )

    mostrar_relatorio(
        dados
    )

    print(
        "\n========================================="
    )

    print(
        "PROCESSAMENTO FINALIZADO"
    )

    print(
        "========================================="
    )


if __name__ == "__main__":
    main()