// ============================================================
// CATÁLOGO CENTRAL DE PARCERIAS
// ============================================================

Object.assign(PARCERIAS, {
    ceus1: {
        nome: "CEUs 1",
        arquivo: "../grupos/ceus1/perimetros.geojson",
        categoria: "Educação"
    },

    ceus2: {
        nome: "CEUs 2",
        arquivo: "../grupos/ceus2/perimetros.geojson",
        categoria: "Educação"
    },

    parques1: {
        nome: "Parques 1",
        arquivo: "../grupos/parques1/perimetros.geojson",
        categoria: "Parques"
    },

    parques3: {
        nome: "Parques 3",
        arquivo: "../grupos/parques3/perimetros.geojson",
        categoria: "Parques"
    },

    termleste: {
        nome: "Terminais Leste",
        arquivo: "../grupos/termleste/perimetros.geojson",
        categoria: "Terminais"
    },

    termnoroeste: {
        nome: "Terminais Noroeste",
        arquivo: "../grupos/termnoroeste/perimetros.geojson",
        categoria: "Terminais"
    },

    termsul: {
        nome: "Terminais Sul",
        arquivo: "../grupos/termsul/perimetros.geojson",
        categoria: "Terminais"
    },

    dompedro: {
        nome: "Dom Pedro",
        arquivo: "../grupos/dompedro/perimetros.geojson",
        categoria: "Terminais"
    },

    anhembi: {
        nome: "Complexo do Anhembi",
        arquivo: "../grupos/anhembi/perimetros.geojson",
        categoria: "Equipamentos"
    },

    pacaembu: {
        nome: "Pacaembu",
        arquivo: "../grupos/pacaembu/perimetros.geojson",
        categoria: "Equipamentos"
    },

    anhangabau: {
        nome: "Vale do Anhangabaú",
        arquivo: "../grupos/anhangabau/perimetros.geojson",
        categoria: "Espaços Urbanos"
    },

    baixoantartica: {
        nome: "Baixo do Viaduto Antártica",
        arquivo: "../grupos/baixoantartica/perimetros.geojson",
        categoria: "Baixos de Viaduto"
    },

    baixolapa: {
        nome: "Baixo do Viaduto Lapa",
        arquivo: "../grupos/baixolapa/perimetros.geojson",
        categoria: "Baixos de Viaduto"
    },

    baixopompeia: {
        nome: "Baixo do Viaduto Pompéia",
        arquivo: "../grupos/baixopompeia/perimetros.geojson",
        categoria: "Baixos de Viaduto"
    },

    cemb1consolare: {
        nome: "Cemitérios - Bloco 1 / Consolare",
        arquivo: "../grupos/cemb1consolare/perimetros.geojson",
        categoria: "Cemitérios"
    },

    cemb2cortel: {
        nome: "Cemitérios - Bloco 2 / Cortel",
        arquivo: "../grupos/cemb2cortel/perimetros.geojson",
        categoria: "Cemitérios"
    },

    cemb3maya: {
        nome: "Cemitérios - Bloco 3 / Maya",
        arquivo: "../grupos/cemb3maya/perimetros.geojson",
        categoria: "Cemitérios"
    },

    cemb4velar: {
        nome: "Cemitérios - Bloco 4 / Velar",
        arquivo: "../grupos/cemb4velar/perimetros.geojson",
        categoria: "Cemitérios"
    },

    mercadosantoamaro: {
        nome: "Mercado de Santo Amaro",
        arquivo: "../grupos/mercadosantoamaro/perimetros.geojson",
        categoria: "Mercados"
    },

    mercadopaulistanokinjo: {
        nome: "Mercado Paulistano / Kinjo",
        arquivo: "../grupos/mercadopaulistanokinjo/perimetros.geojson",
        categoria: "Mercados"
    }
});

console.log(
    "Catálogo de parcerias carregado:",
    Object.keys(PARCERIAS).length,
    "parcerias"
);
