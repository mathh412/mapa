let regioesGeoJSON, subprefeiturasGeoJSON, distritosGeoJSON, geojsonPerimetros, geojsonItens;

// ============================================================
// INTEGRAÇÃO COM O DASHBOARD QUANDO O MAPA ESTÁ EM UM IFRAME
// ============================================================

const SPP_BRIDGE_SOURCE = 'spp-mapa';
const SPP_BRIDGE_VERSION = '2.1.1';

const EQUIPMENT_TYPES = {
    education: {
        label: 'CEU / Educação',
        color: '#2563a6',
        path: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15'
    },

    park: {
        label: 'Parque',
        color: '#28754c',
        path: 'M12 3 5 12h3l-4 5h16l-4-5h3z M12 17v5'
    },

    terminal: {
        label: 'Terminal',
        color: '#6850a1',
        path: 'M6 19v3m12-3v3M5 4q7-3 14 0v15H5z M5 11h14 M8 15h1m6 0h1'
    },

    market: {
        label: 'Mercado',
        color: '#a76517',
        path: 'M3 9h18l-2 12H5z M7 9l5-7 5 7 M9 13v5m6-5v5'
    },

    sport: {
        label: 'Esporte',
        color: '#b74c27',
        path: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3v18 M6 5q12 7 0 14 M18 5q-12 7 0 14'
    },

    cemetery: {
        label: 'Cemitério',
        color: '#626975',
        path: 'M6 20V9a6 6 0 0 1 12 0v11 M3 21h18 M9 11h6 M9 15h6'
    },

    events: {
        label: 'Espaço de eventos',
        color: '#ab4481',
        path: 'M3 4h18v17H3z M3 4l6 7-6 6 M21 4l-6 7 6 6 M8 21v-4h8v4'
    },

    publicspace: {
        label: 'Espaço de convivência',
        color: '#167b80',
        path: 'M4 7h16v7H4z M3 17h18 M6 14v7m12-7v7 M8 7v7m8-7v7'
    },

    housing: {
        label: 'Habitação',
        color: '#926844',
        path: 'M4 21V4h16v17z M8 8h1m6 0h1M8 12h1m6 0h1M10 21v-5h4v5'
    },

    unknown: {
        label: 'Tipo não informado',
        color: '#667783',
        path: 'M4 21V4h16v17z M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4 M12 17h.01'
    }
};


const EQUIPMENT_GROUP_TYPES = {
    ceus1: 'education',
    ceus2: 'education',

    parques1: 'park',
    parques3: 'park',
    campomarte: 'park',

    termleste: 'terminal',
    termnoroeste: 'terminal',
    termsul: 'terminal',

    mercadoskinjo: 'market',
    mercadopaulistanokinjo: 'market',
    mercadosantoamaro: 'market',

    pacaembu: 'sport',

    cemb1consolare: 'cemetery',
    cemb2cortel: 'cemetery',
    cemb3maya: 'cemetery',
    cemb4velar: 'cemetery',

    anhembi: 'events',

    anhangabau: 'publicspace',
    baixoantartica: 'publicspace',
    baixolapa: 'publicspace',
    baixopompeia: 'publicspace',

    dompedro: 'housing'
};


function equipmentType(f) {

    const key =
        EQUIPMENT_GROUP_TYPES[
            f.group
            ||
            f.properties?.__grupo
            ||
            f.__grupo
        ]
        ||
        'unknown';

    return {
        key,
        ...EQUIPMENT_TYPES[key]
    };

}


function equipmentIcon(f) {

    const t =
        equipmentType(f);

    return `
        <span
            class="equipment-icon"
            style="--equipment-color:${t.color}"
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="${t.path}"/>
            </svg>
        </span>
    `;

}


function equipmentLegend(rows) {

    const counts = {};

    for (
        const f
        of rows
    ) {

        const t =
            equipmentType(f);

        counts[t.key] =
            (
                counts[t.key]
                ||
                0
            )
            +
            1;

    }


    return (
        Object
            .entries(counts)
            .sort(
                (
                    a,
                    b
                ) =>
                    EQUIPMENT_TYPES[
                        a[0]
                    ]
                    .label
                    .localeCompare(
                        EQUIPMENT_TYPES[
                            b[0]
                        ].label
                    )
            )
            .map(
                (
                    [
                        key,
                        count
                    ]
                ) => {

                    const f = {
                        group:
                            Object
                                .keys(
                                    EQUIPMENT_GROUP_TYPES
                                )
                                .find(
                                    grupo =>
                                        EQUIPMENT_GROUP_TYPES[
                                            grupo
                                        ]
                                        ===
                                        key
                                )
                    };


                    return `
                        <span class="equipment-legend-item">

                            ${equipmentIcon(f)}

                            <span>
                                ${EQUIPMENT_TYPES[key].label}
                            </span>

                            <b>
                                ${count}
                            </b>

                        </span>
                    `;

                }
            )
            .join("")
        ||
        '<span>Nenhum equipamento neste recorte.</span>'
    );

}


// ============================================================
// FILTROS
// ============================================================

// A lista de grupos vem exclusivamente de grupos/catalogo.json.


const sppPlural = {
    grupo: 'grupos',
    local: 'locais',
    regiao: 'regioes',
    subprefeitura: 'subprefeituras',
    distrito: 'distritos',
    conjunto: 'conjuntos',
    bloco: 'blocos',
    estrutura: 'estruturas',
    tipo: 'tipos'
};


const initialParams =
    new URLSearchParams(
        location.search
    );


let sppFilters =
    Object.fromEntries(
        [
            'grupo',
            'local',
            'regiao',
            'subprefeitura',
            'distrito',
            'conjunto',
            'bloco',
            'estrutura',
            'tipo',
            'vazio'
        ]
        .map(
            chave => [
                chave,

                [
                    'regiao',
                    'subprefeitura',
                    'distrito',
                    'vazio'
                ]
                .includes(
                    chave
                )
                    ?
                    initialParams.get(
                        chave
                    )
                    ||
                    ''
                    :
                    [
                        ...initialParams.getAll(
                            chave
                        ),

                        ...initialParams.getAll(
                            sppPlural[
                                chave
                            ]
                        )
                    ]
                    .flatMap(
                        valor =>
                            valor.split(',')
                    )
            ]
        )
    );


let sppMap =
    null;

let sppBasePerimetros =
    null;

let sppBaseItens =
    null;

let sppCatalog =
    [];


const sppList =
    value =>
        (
            Array.isArray(
                value
            )
                ?
                value
                :
                String(
                    value
                    ||
                    ''
                )
                .split(',')
        )
        .map(
            normalizarTexto
        )
        .filter(
            Boolean
        );


const sppEquals =
    (
        a,
        b
    ) =>
        normalizarTexto(a)
            .replace(
                /^zona /,
                ''
            )
        ===
        normalizarTexto(b)
            .replace(
                /^zona /,
                ''
            );


function sppGroupRegion(
    value
) {

    const key =
        normalizarTexto(
            value
        )
        .replace(
            /[\s_-]+/g,
            ''
        );


    return {

        zonasul:
            'Sul',

        sul:
            'Sul',

        zonanorte:
            'Norte',

        norte:
            'Norte',

        zonaleste:
            'Leste',

        leste:
            'Leste',

        zonaoeste:
            'Oeste',

        oeste:
            'Oeste',

        zonacentral:
            'Centro',

        zonacentro:
            'Centro',

        centro:
            'Centro',

        central:
            'Centro'

    }[
        key
    ]
    ||
    '';

}


function sppGroupMatches(
    groups,
    group,
    region
) {

    return (
        groups.includes(
            'todos'
        )
        ||
        groups.some(
            value => {

                const zone =
                    sppGroupRegion(
                        value
                    );


                return zone
                    ?
                    sppEquals(
                        zone,
                        region
                    )
                    :
                    value ===
                        normalizarTexto(
                            group
                        );

            }
        )
    );

}


function sppApplyFilters(
    message
) {

    for (
        const k
        of [
            'grupo',
            'local',
            'regiao',
            'subprefeitura',
            'distrito',
            'conjunto',
            'bloco',
            'estrutura',
            'tipo',
            'vazio'
        ]
    ) {

        if (
            k in message
        ) {

            sppFilters[k] =
                message[k];

        }
        else if (
            sppPlural[k]
            in
            message
        ) {

            sppFilters[k] =
                message[
                    sppPlural[
                        k
                    ]
                ];

        }

    }


    if (
        !sppBasePerimetros
    ) {
        return;
    }


    if (
        sppMap
    ) {

        sppMap.stop();
        sppMap.remove();

        sppMap =
            null;

    }


    geojsonPerimetros = {
        type:
            'FeatureCollection',

        features:
            sppBasePerimetros.slice()
    };


    geojsonItens = {
        type:
            'FeatureCollection',

        features:
            sppBaseItens.slice()
    };


    inicializarSistema(
        sppList(
            sppFilters.bloco
        ).length
        +
        sppList(
            sppFilters.conjunto
        ).length
        +
        sppList(
            sppFilters.estrutura
        ).length
        >
        0
    );

}


// ============================================================
// BRIDGE
// ============================================================

function origemPaiPreferida() {

    try {

        if (
            !document.referrer
        ) {
            return '*';
        }


        const origem =
            new URL(
                document.referrer
            ).origin;


        return (
            origem
            &&
            origem !==
                'null'
        )
            ?
            origem
            :
            '*';

    }
    catch (_) {

        return '*';

    }

}


const SPP_PARENT_ORIGIN =
    origemPaiPreferida();


function enviarAcaoParaPai(
    type,
    dados = {}
) {

    const mensagem = {

        source:
            SPP_BRIDGE_SOURCE,

        version:
            SPP_BRIDGE_VERSION,

        type,

        ...dados

    };


    try {

        window.dispatchEvent(
            new CustomEvent(
                'spp-mapa:' + type,
                {
                    detail:
                        mensagem
                }
            )
        );

    }
    catch (_) {}


    if (
        !window.parent
        ||
        window.parent ===
            window
    ) {
        return;
    }


    try {

        window.parent.postMessage(
            mensagem,
            "*"
        );

    }
    catch (_) {

        window.parent.postMessage(
            mensagem,
            '*'
        );

    }

}


function grupoDaFeature(
    feature
) {

    if (
        !feature
    ) {
        return '';
    }


    return (
        feature.__grupo
        ||
        feature.properties?.grupo
        ||
        feature.properties?.Grupo
        ||
        ''
    );

}


function avisarLocalSelecionado(
    nomeLocal,
    feature,
    origem = 'mapa'
) {

    const local =
        nomeEquipamento(
            feature
        )
        ||
        nomeLocal
        ||
        '';


    const localNormalizado =
        String(
            local
        )
        .trim();


    if (
        !localNormalizado
        ||
        localNormalizado ===
            'Local Mapeado'
        ||
        localNormalizado ===
            'Locais filtrados'
    ) {
        return;
    }


    enviarAcaoParaPai(
        'local-selected',
        {

            local:
                localNormalizado,

            grupo:
                grupoDaFeature(
                    feature
                ),

            distrito:
                feature
                    ?.properties
                    ?.distrito
                ||
                '',

            origem

        }
    );

}


window.addEventListener(
    'message',
    function (
        event
    ) {

        if (
            event.source !==
                window.parent
            ||
            window.parent ===
                window
        ) {
            return;
        }


        if (
            SPP_PARENT_ORIGIN !==
                '*'
            &&
            event.origin !==
                SPP_PARENT_ORIGIN
            &&
            event.origin !== "null"
        ) {
            return;
        }


        const mensagem =
            event.data;


        if (
            !mensagem
            ||
            mensagem.source !==
                'spp-dashboard'
        ) {
            return;
        }


        if (
            mensagem.type ===
            'ping'
        ) {

            enviarAcaoParaPai(
                'map-ready',
                {

                    fase:
                        'ping',

                    url:
                        window.location.href

                }
            );


            return;

        }


        if (
            mensagem.type ===
                'set-filter'
            ||
            mensagem.type ===
                'set-filters'
            ||
            mensagem.type ===
                'focus-local'
        ) {

            sppApplyFilters(
                mensagem
            );


            return;

        }


        if (
            mensagem.type ===
                'clear-filter'
            ||
            mensagem.type ===
                'clear-filters'
        ) {

            sppApplyFilters(
                {

                    tipo:
                        [],

                    regiao:
                        "",

                    subprefeitura:
                        "",

                    distrito:
                        "",

                    vazio:
                        false,

                    grupo:
                        mensagem.manterGrupo
                            ?
                            sppFilters.grupo
                            :
                            [],

                    local:
                        [],

                    conjunto:
                        [],

                    bloco:
                        [],

                    estrutura:
                        []

                }
            );

        }

    }
);


window.SPPMapaBridge = {

    version:
        SPP_BRIDGE_VERSION,

    enviar:
        enviarAcaoParaPai,

    aplicarFiltros:
        sppApplyFilters

};


document.addEventListener(
    'DOMContentLoaded',
    function () {

        enviarAcaoParaPai(
            'map-ready',
            {

                fase:
                    'dom',

                url:
                    window.location.href

            }
        );

    },
    {
        once:
            true
    }
);


// ============================================================
// NORMALIZAÇÃO
// ============================================================

function normalizarTexto(
    texto
) {

    return String(
        texto ??
        ''
    )
    .normalize(
        'NFD'
    )
    .replace(
        /[\u0300-\u036f]/g,
        ''
    )
    .replace(
        /\u00A0/g,
        ' '
    )
    .replace(
        /\s+/g,
        ' '
    )
    .replace(
        /\(\s+/g,
        '('
    )
    .replace(
        /\s+\)/g,
        ')'
    )
    .toLowerCase()
    .trim();

}


// ============================================================
// NÍVEL INICIAL CONTROLADO PELA URL
// ============================================================

function normalizarNivelURL(
    valor
) {

    const chave =
        normalizarTexto(
            valor ||
            ''
        )
        .replace(
            /_/g,
            '-'
        )
        .replace(
            /\s+/g,
            '-'
        );


    const aliases = {

        regiao:
            'regiao',

        regioes:
            'regiao',

        subprefeitura:
            'subprefeitura',

        subprefeituras:
            'subprefeitura',

        distrito:
            'distrito',

        distritos:
            'distrito',

        local:
            'local',

        locais:
            'local',

        equipamento:
            'local',

        equipamentos:
            'local',

        perimetro:
            'perimetro',

        perimetros:
            'perimetro',

        interno:
            'interno',

        interna:
            'interno',

        'divisao-interna':
            'interno',

        'divisoes-internas':
            'interno',

        'areas-internas':
            'interno'

    };


    return aliases[
        chave
    ]
    ||
    '';

}


// ============================================================
// ITENS INTERNOS
// ============================================================

function normalizarFiltroItem(
    texto
) {

    return normalizarTexto(
        texto
    )
    .replace(
        /^(bloco|blocos|conjunto|conjuntos|estrutura|estruturas)\s*[:#\-]?\s*/,
        ''
    )
    .replace(
        /[()\[\]{}]/g,
        ' '
    )
    .replace(
        /[–—]/g,
        '-'
    )
    .replace(
        /\s+/g,
        ' '
    )
    .trim();

}


function itemCorrespondeFiltro(
    feature,
    filtro
) {

    const nomeCompleto =
        normalizarFiltroItem(
            nomeItem(
                feature
            )
        );


    const alvo =
        normalizarFiltroItem(
            filtro
        );


    if (
        !alvo
    ) {
        return false;
    }


    if (
        nomeCompleto ===
        alvo
    ) {
        return true;
    }


    const numeroNome =
        nomeCompleto
            .match(
                /^(\d+)(?=\s|$|-)/
            )
            ?.[1];


    const numeroFiltro =
        alvo
            .match(
                /^\d+$/
            )
            ?.[0];


    if (
        numeroFiltro
        &&
        numeroNome ===
            numeroFiltro
    ) {
        return true;
    }


    const alvoSemSeparador =
        alvo.replace(
            /^(\d+)\s*-\s*/,
            '$1 '
        );


    const nomeSemSeparador =
        nomeCompleto.replace(
            /^(\d+)\s*-\s*/,
            '$1 '
        );


    if (
        nomeSemSeparador ===
        alvoSemSeparador
    ) {
        return true;
    }


    const nomeSemNumero =
        nomeCompleto
            .replace(
                /^\d+\s*/,
                ''
            )
            .replace(
                /^[-:]\s*/,
                ''
            )
            .trim();


    return (
        nomeSemNumero
        &&
        nomeSemNumero ===
            alvo
    );

}


function propriedade(
    p,
    nomes
) {

    for (
        const nome
        of nomes
    ) {

        const chave =
            Object
                .keys(
                    p ||
                    {}
                )
                .find(
                    k =>
                        normalizarTexto(
                            k
                        )
                        ===
                        normalizarTexto(
                            nome
                        )
                        &&
                        p[k] !==
                            null
                        &&
                        p[k] !==
                            undefined
                        &&
                        String(
                            p[k]
                        )
                        .trim()
                        !==
                        ''
                );


        if (
            chave !==
            undefined
        ) {

            return String(
                p[chave]
            )
            .trim();

        }

    }


    return '';

}


function nomeEquipamento(
    f
) {

    return propriedade(
        f.properties,
        [
            'Equipamento',
            'nm_equipamento'
        ]
    );

}


function tipoItem(
    f
) {

    const p =
        f.properties ||
        {};


    const declarado =
        normalizarTexto(
            propriedade(
                p,
                [
                    'Tipo',
                    'Tipo de item',
                    'tipo_item',
                    'tipo_estrutura'
                ]
            )
        );


    const tipos = {

        bloco:
            'Bloco',

        blocos:
            'Bloco',

        conjunto:
            'Conjunto',

        conjuntos:
            'Conjunto',

        estrutura:
            'Estrutura',

        estruturas:
            'Estrutura'

    };


    if (
        tipos[
            declarado
        ]
    ) {

        return tipos[
            declarado
        ];

    }


    if (
        f.__tipoArquivo
        &&
        f.__tipoArquivo !==
            'Bloco'
    ) {

        return f.__tipoArquivo;

    }


    for (
        const tipo
        of [
            'Estrutura',
            'Conjunto',
            'Bloco'
        ]
    ) {

        if (
            propriedade(
                p,
                [
                    tipo,
                    'nm_' +
                    normalizarTexto(
                        tipo
                    )
                ]
            )
        ) {

            return tipo;

        }

    }


    return (
        f.__tipoArquivo
        ||
        'Estrutura'
    );

}


function nomeItem(
    f
) {

    const tipo =
        tipoItem(
            f
        );


    return (
        propriedade(
            f.properties,
            [
                tipo,
                'nm_' +
                    normalizarTexto(
                        tipo
                    ),
                'Nome',
                'name'
            ]
        )
        ||
        tipo +
            ' sem nome'
    );

}


function pertenceAoEquipamento(
    item,
    equipamento
) {

    const nome =
        normalizarTexto(
            nomeEquipamento(
                item
            )
        );


    return (
        nome !==
            ''
        &&
        nome ===
            normalizarTexto(
                nomeEquipamento(
                    equipamento
                )
            )
        &&
        item.__grupo ===
            equipamento.__grupo
    );

}


function agruparPropriedades(
    propriedades,
    ignorarChave = () =>
        false
) {

    const raiz =
        new Map();


    for (
        const [
            chave,
            valor
        ]
        of Object.entries(
            propriedades ||
            {}
        )
    ) {

        if (
            ignorarChave(
                chave
            )
            ||
            valor ===
                null
            ||
            valor ===
                undefined
        ) {
            continue;
        }


        if (
            typeof valor ===
            'object'
        ) {

            if (
                !Array.isArray(
                    valor
                )
                ||
                valor.some(
                    item =>
                        item !==
                            null
                        &&
                        typeof item ===
                            'object'
                )
            ) {

                continue;

            }

        }


        const somenteNome =
            typeof valor ===
                'string'
            &&
            (
                valor.trim() ===
                    ''
                ||
                normalizarTexto(
                    valor
                )
                ===
                'vazio'
            );


        const caminho =
            chave
                .split('-')
                .map(
                    parte =>
                        parte.trim()
                )
                .filter(
                    Boolean
                );


        let filhos =
            raiz;


        caminho.forEach(
            (
                nome,
                indice
            ) => {

                if (
                    !filhos.has(
                        nome
                    )
                ) {

                    filhos.set(
                        nome,
                        {

                            nome,

                            valores:
                                [],

                            filhos:
                                new Map()

                        }
                    );

                }


                const no =
                    filhos.get(
                        nome
                    );


                if (
                    indice ===
                        caminho.length -
                            1
                    &&
                    !somenteNome
                ) {

                    no.valores.push(
                        valor
                    );

                }


                filhos =
                    no.filhos;

            }
        );

    }


    return raiz;

}


function renderizarGrupos(
    grupos
) {

    if (
        !grupos.size
    ) {
        return '';
    }


    let html =
        '<ul class="arvore-detalhes">';


    for (
        const no
        of grupos.values()
    ) {

        html += `
            <li>

                <span
                    class="${
                        no.filhos.size
                            ?
                            'grupo-detalhes'
                            :
                            'campo-detalhes'
                    }"
                >
                    ${escaparHTML(no.nome)}
                </span>
        `;


        if (
            no.valores.length
        ) {

            html +=
                ': '
                +
                no.valores
                    .map(
                        escaparHTML
                    )
                    .join(
                        '; '
                    );

        }


        html +=
            renderizarGrupos(
                no.filhos
            )
            +
            '</li>';

    }


    return (
        html
        +
        '</ul>'
    );

}


function escaparHTML(
    valor
) {

    return String(
        valor ??
        ''
    )
    .replace(
        /[&<>"']/g,
        caractere => ({

            '&':
                '&amp;',

            '<':
                '&lt;',

            '>':
                '&gt;',

            '"':
                '&quot;',

            "'":
                '&#39;'

        }[
            caractere
        ])
    );

}


function separarAreasParaExibicao(
    feature
) {

    const areas =
        feature
            .properties
            ?.Areas;


    if (
        feature
            .geometry
            ?.type
        !==
        'MultiPolygon'
        ||
        !Array.isArray(
            areas
        )
    ) {

        return [
            feature
        ];

    }


    return feature
        .geometry
        .coordinates
        .map(
            (
                coordinates,
                indice
            ) => {

                const area =
                    areas[
                        indice
                    ];


                const properties = {
                    ...feature.properties
                };


                delete properties.Areas;


                if (
                    area
                ) {

                    for (
                        const chave
                        of Object.keys(
                            properties
                        )
                    ) {

                        if (
                            normalizarTexto(
                                chave
                            )
                            .startsWith(
                                'etapas -'
                            )
                            ||
                            normalizarTexto(
                                chave
                            )
                            .startsWith(
                                'geometria - areas -'
                            )
                        ) {

                            delete properties[
                                chave
                            ];

                        }

                    }


                    for (
                        const etapa
                        of (
                            area.etapas ||
                            []
                        )
                    ) {

                        properties[
                            'Etapas - ' +
                            etapa
                        ] =
                            '';

                    }

                }


                return {

                    ...feature,

                    properties,

                    geometry: {
                        type:
                            'Polygon',

                        coordinates
                    },

                    __featureOrigem:
                        feature,

                    __nomeArea:
                        area?.nome
                        ||
                        'Área ' +
                        (
                            indice +
                            1
                        )

                };

            }
        );

}


function itemAtendeFiltros(
    feature,
    filtros
) {

    const ativos =
        Object
            .values(
                filtros
            )
            .some(
                nomes =>
                    nomes.length >
                    0
            );


    if (
        !ativos
    ) {
        return true;
    }


    const nomes =
        filtros[
            normalizarTexto(
                tipoItem(
                    feature
                )
            )
        ]
        ||
        [];


    return nomes.some(
        filtro =>
            itemCorrespondeFiltro(
                feature,
                filtro
            )
    );

}


// ============================================================
// CARREGAMENTO DOS GEOJSON
// ============================================================

async function carregarMapa() {
try {
    const baseUrl = new URL('./', document.baseURI).href;
    const respostaCatalogo = await fetch(new URL('grupos/catalogo.json', baseUrl), { cache: 'no-cache' });
    if (!respostaCatalogo.ok) throw new Error('Não foi possível carregar o catálogo de parcerias.');
    const catalogo = await respostaCatalogo.json();
    if (catalogo.versao !== 1 || !Array.isArray(catalogo.grupos)) {
        throw new Error('Formato de catálogo inválido.');
    }
    const gruposCatalogo = new Map();
    for (const entrada of catalogo.grupos) {
        if (!entrada || !/^[a-z0-9][a-z0-9_-]*$/.test(entrada.codigo)
            || typeof entrada.ativo !== 'boolean' || !Array.isArray(entrada.arquivos)
            || gruposCatalogo.has(entrada.codigo)) throw new Error('Grupo inválido no catálogo.');
        gruposCatalogo.set(entrada.codigo, entrada);
        if (EQUIPMENT_TYPES[entrada.tipo]) EQUIPMENT_GROUP_TYPES[entrada.codigo] = entrada.tipo;
    }
    const grupos = [...gruposCatalogo.values()].filter(g => g.ativo).map(g => g.codigo);
    const locaisFiltrados =
        [];


    const filtrosItens = {

        conjunto:
            [],

        bloco:
            [],

        estrutura:
            []

    };


    const temFiltroItens =
        Object
            .values(
                filtrosItens
            )
            .some(
                nomes =>
                    nomes.length >
                    0
            );




    const urlRegioes =
        baseUrl +
        'divisaoadm/regioes.geojson';


    const urlSubprefeituras =
        baseUrl +
        'divisaoadm/subprefeituras.geojson';


    const urlDistritos =
        baseUrl +
        'divisaoadm/distritos.geojson';


    async function fetchSeguro(
        url
    ) {

        if (
            !url
        ) {

            return {
                type:
                    "FeatureCollection",

                features:
                    []
            };

        }


        try {

            const response =
                await fetch(
                    url
                );


            if (
                !response.ok
            ) {

                return {
                    type:
                        "FeatureCollection",

                    features:
                        []
                };

            }


            return await response.json();

        }
        catch (
            err
        ) {

            return {
                type:
                    "FeatureCollection",

                features:
                    []
            };

        }

    }


    async function carregarGrupo(
        grupo,
        arquivo,
        tipo = null
    ) {
        // Arquivos opcionais ausentes não geram requisições HTTP.
        if (!gruposCatalogo.get(grupo).arquivos.includes(arquivo)) {
            return { type: 'FeatureCollection', features: [] };
        }
        const geo =
            await fetchSeguro(
                baseUrl
                +
                'grupos/'
                +
                grupo
                +
                '/'
                +
                arquivo
            );


        return {

            type:
                'FeatureCollection',

            features:
                Array.isArray(
                    geo?.features
                )
                    ?
                    geo.features
                        .filter(
                            feature =>
                                feature
                                &&
                                feature.type ===
                                    'Feature'
                                &&
                                feature.geometry
                        )
                        .map(
                            feature => ({

                                ...feature,

                                properties:
                                    feature.properties
                                    ||
                                    {},

                                __grupo:
                                    grupo,

                                __tipoArquivo:
                                    tipo

                            })
                        )
                    :
                    []

        };

    }


    const promessasBase = [

        fetchSeguro(
            urlRegioes
        ),

        fetchSeguro(
            urlSubprefeituras
        ),

        fetchSeguro(
            urlDistritos
        )

    ];


    const promessasPerimetros =
        grupos.map(
            grupo =>
                carregarGrupo(
                    grupo,
                    'perimetros.geojson'
                )
        );


    const fontesItens = [

        {
            arquivo:
                'blocos.geojson',

            tipo:
                'Bloco'
        },

        {
            arquivo:
                'conjuntos.geojson',

            tipo:
                'Conjunto'
        },

        {
            arquivo:
                'estruturas.geojson',

            tipo:
                'Estrutura'
        }

    ];


    const promessasItens =
        grupos.flatMap(
            grupo =>
                fontesItens.map(
                    fonte =>
                        carregarGrupo(
                            grupo,
                            fonte.arquivo,
                            fonte.tipo
                        )
                )
        );


    await Promise
        .all(
            [

                Promise.all(
                    promessasBase
                ),

                Promise.all(
                    promessasPerimetros
                ),

                Promise.all(
                    promessasItens
                )

            ]
        )
        .then(
            (
                [
                    [
                        reg,
                        sub,
                        dist
                    ],

                    arrayPerimetros,

                    arrayItens
                ]
            ) => {

                regioesGeoJSON =
                    reg;


                subprefeiturasGeoJSON =
                    sub;


                distritosGeoJSON =
                    dist;


                let featuresPerimetros =
                    [];


                arrayPerimetros.forEach(
                    geo => {

                        if (
                            geo
                            &&
                            geo.features
                        ) {

                            featuresPerimetros =
                                featuresPerimetros.concat(
                                    geo.features
                                );

                        }

                    }
                );


                if (
                    locaisFiltrados.length >
                    0
                ) {

                    featuresPerimetros =
                        featuresPerimetros.filter(
                            feature => {

                                const nome =
                                    normalizarTexto(
                                        nomeEquipamento(
                                            feature
                                        )
                                    );


                                return locaisFiltrados.includes(
                                    nome
                                );

                            }
                        );

                }


                let featuresItens =
                    [];


                arrayItens.forEach(
                    geo => {

                        if (
                            geo
                            &&
                            geo.features
                        ) {

                            featuresItens =
                                featuresItens.concat(
                                    geo.features
                                );

                        }

                    }
                );


                featuresItens =
                    featuresItens.filter(
                        feature =>
                            itemAtendeFiltros(
                                feature,
                                filtrosItens
                            )
                    );


                if (
                    temFiltroItens
                ) {

                    featuresPerimetros =
                        featuresPerimetros.filter(
                            perimetro =>
                                featuresItens.some(
                                    item =>
                                        pertenceAoEquipamento(
                                            item,
                                            perimetro
                                        )
                                )
                        );

                }


                geojsonPerimetros = {

                    type:
                        'FeatureCollection',

                    features:
                        featuresPerimetros

                };


                geojsonItens = {

                    type:
                        'FeatureCollection',

                    features:
                        featuresItens

                };


                const loadingEl =
                    document.getElementById(
                        'loading'
                    );


                if (
                    loadingEl
                ) {

                    loadingEl.style.display =
                        'none';

                }


                document
                    .getElementById(
                        'indicador-camada'
                    )
                    .style
                    .display =
                        'block';


                inicializarSistema(
                    temFiltroItens
                );


                enviarAcaoParaPai(
                    'map-ready',
                    {

                        fase:
                            'dados',

                        grupos:
                            grupos.slice(),

                        locais:
                            locaisFiltrados.slice(),

                        quantidadeLocais:
                            geojsonPerimetros
                                .features
                                .length,

                        catalogo:
                            sppCatalog

                    }
                );

            }
        )
        .catch(
            err => {

                document
                    .getElementById(
                        'loading'
                    )
                    .innerHTML =
                        `
                            <span style="color:#C62828;">

                                Erro ao processar arquivos da nuvem:
                                <br>

                                ${err.message}

                            </span>
                        `;

            }
        );

}
catch (
    fatalErr
) {

    document
        .getElementById(
            'loading'
        )
        .innerHTML =
            `
                <span style="color:#C62828;">

                    Erro Crítico no Script:
                    <br>

                    ${fatalErr.message}

                </span>
            `;

}


}

carregarMapa();

// ============================================================
// SISTEMA DO MAPA
// ============================================================

function inicializarSistema(
    abrirItensFiltrados = false
) {

    const dictDistritoParaSub = {

        "água rasa":
            "Mooca",

        "alto de pinheiros":
            "Pinheiros",

        "anhanguera":
            "Perus",

        "aricanduva":
            "Aricanduva",

        "artur alvim":
            "Penha",

        "barra funda":
            "Lapa",

        "bela vista":
            "Sé",

        "belém":
            "Mooca",

        "bom retiro":
            "Sé",

        "brás":
            "Mooca",

        "brasilândia":
            "Freguesia do Ó",

        "butantã":
            "Butantã",

        "cachoeirinha":
            "Casa Verde",

        "cambuci":
            "Sé",

        "campo belo":
            "Santo Amaro",

        "campo grande":
            "Santo Amaro",

        "campo limpo":
            "Campo Limpo",

        "cangaiba":
            "Penha",

        "capão redondo":
            "Campo Limpo",

        "carrão":
            "Aricanduva",

        "casa verde":
            "Casa Verde",

        "cidade ademar":
            "Cidade Ademar",

        "cidade dutra":
            "Capela do Socorro",

        "cidade líder":
            "Itaquera",

        "cidade tiradentes":
            "Cidade Tiradentes",

        "consolação":
            "Sé",

        "cursino":
            "Ipiranga",

        "ermelino matarazzo":
            "Ermelino Matarazzo",

        "freguesia do ó":
            "Freguesia do Ó",

        "grajaú":
            "Capela do Socorro",

        "guaianases":
            "Guaianases",

        "iguatemi":
            "São Mateus",

        "ipiranga":
            "Ipiranga",

        "itaim bibi":
            "Pinheiros",

        "itaim paulista":
            "Itaim Paulista",

        "itaquera":
            "Itaquera",

        "jabaquara":
            "Jabaquara",

        "jaçanã":
            "Jaçanã",

        "jaguara":
            "Lapa",

        "jaguaré":
            "Lapa",

        "jaraguá":
            "Pirituba",

        "jardim ângela":
            "MBoi Mirim",

        "jardim helena":
            "São Miguel",

        "jardim paulista":
            "Pinheiros",

        "jardim são luís":
            "MBoi Mirim",

        "josé bonifácio":
            "Itaquera",

        "lajeado":
            "Guaianases",

        "lapa":
            "Lapa",

        "liberdade":
            "Sé",

        "limão":
            "Casa Verde",

        "mandaqui":
            "Santana",

        "marsilac":
            "Parelheiros",

        "moema":
            "Vila Mariana",

        "mooca":
            "Mooca",

        "morumbi":
            "Butantã",

        "parelheiros":
            "Parelheiros",

        "pari":
            "Mooca",

        "parque do carmo":
            "Itaquera",

        "pedreira":
            "Cidade Ademar",

        "penha":
            "Penha",

        "perdizes":
            "Lapa",

        "perus":
            "Perus",

        "pinheiros":
            "Pinheiros",

        "pirituba":
            "Pirituba",

        "ponte rasa":
            "Ermelino Matarazzo",

        "raposo tavares":
            "Butantã",

        "república":
            "Sé",

        "rio pequeno":
            "Butantã",

        "sacomã":
            "Ipiranga",

        "santa cecília":
            "Sé",

        "santana":
            "Santana",

        "santo amaro":
            "Santo Amaro",

        "são domingos":
            "Pirituba",

        "são lucas":
            "Vila Prudente",

        "são mateus":
            "São Mateus",

        "são miguel":
            "São Miguel",

        "são rafael":
            "São Mateus",

        "sapopemba":
            "Sapopemba",

        "saúde":
            "Vila Mariana",

        "sé":
            "Sé",

        "socorro":
            "Capela do Socorro",

        "tatuapé":
            "Mooca",

        "tremembé":
            "Jaçanã",

        "tucuruvi":
            "Santana",

        "vila andrade":
            "Campo Limpo",

        "vila curuçá":
            "Itaim Paulista",

        "vila formosa":
            "Aricanduva",

        "vila guilherme":
            "Vila Maria-Vila Guilherme",

        "vila jacuí":
            "São Miguel",

        "vila leopoldina":
            "Lapa",

        "vila maria":
            "Vila Maria-Vila Guilherme",

        "vila mariana":
            "Vila Mariana",

        "vila matilde":
            "Penha",

        "vila medeiros":
            "Vila Maria-Vila Guilherme",

        "vila prudente":
            "Vila Prudente",

        "vila sônia":
            "Butantã"

    };


    const dictSubParaRegiao = {

        "sé":
            "Centro",

        "centro":
            "Centro",

        "butantã":
            "Oeste",

        "lapa":
            "Oeste",

        "pinheiros":
            "Oeste",

        "casa verde":
            "Norte",

        "cachoeirinha":
            "Norte",

        "freguesia do ó":
            "Norte",

        "brasilândia":
            "Norte",

        "jaçanã":
            "Norte",

        "tremembé":
            "Norte",

        "perus":
            "Norte",

        "anhanguera":
            "Norte",

        "pirituba":
            "Norte",

        "jaraguá":
            "Norte",

        "santana":
            "Norte",

        "tucuruvi":
            "Norte",

        "vila maria":
            "Norte",

        "vila guilherme":
            "Norte",

        "vila maria-vila guilherme":
            "Norte",

        "aricanduva":
            "Leste",

        "cidade tiradentes":
            "Leste",

        "ermelino matarazzo":
            "Leste",

        "guaianases":
            "Leste",

        "itaquera":
            "Leste",

        "itaim paulista":
            "Leste",

        "mooca":
            "Leste",

        "penha":
            "Leste",

        "são mateus":
            "Leste",

        "são miguel":
            "Leste",

        "sapopemba":
            "Leste",

        "vila prudente":
            "Leste",

        "campo limpo":
            "Sul",

        "capela do socorro":
            "Sul",

        "cidade ademar":
            "Sul",

        "ipiranga":
            "Sul",

        "jabaquara":
            "Sul",

        "mboi mirim":
            "Sul",

        "parelheiros":
            "Sul",

        "santo amaro":
            "Sul",

        "vila mariana":
            "Sul"

    };


    function extrairNomeSub(
        feature
    ) {

        if (
            !feature
            ||
            !feature.properties
        ) {
            return "Desconhecida";
        }


        const p =
            feature.properties;


        const nome =
            p.name
            ||
            p.nome
            ||
            p.sp_nome
            ||
            p.NOME_SUB
            ||
            p.sp_name
            ||
            p.Name
            ||
            p.NOME
            ||
            p.subprefeitura
            ||
            p.SUBPREFEITURA;


        return nome
            ?
            nome
                .toString()
                .trim()
            :
            "Desconhecida";

    }


    function extrairNomeDistrito(
        feature
    ) {

        if (
            !feature
            ||
            !feature.properties
        ) {
            return "Desconhecido";
        }


        const p =
            feature.properties;


        const nome =
            p.nm_distrito_municipal
            ||
            p.ds_nome
            ||
            p.nome
            ||
            p.name
            ||
            p.NOME
            ||
            p.distrito
            ||
            p.DISTRITO;


        return nome
            ?
            nome
                .toString()
                .trim()
            :
            "Desconhecido";

    }


    function extrairNomeRegiao(
        feature
    ) {

        if (
            !feature
            ||
            !feature.properties
        ) {
            return "Desconhecida";
        }


        const p =
            feature.properties;


        const regioesValidas = [
            'centro',
            'norte',
            'sul',
            'leste',
            'oeste'
        ];


        const nomeRaw =
            p.Regiao
            ||
            p.regiao
            ||
            p.nome
            ||
            p.name
            ||
            p.nm_regiao
            ||
            p.Name
            ||
            p.NOME
            ||
            p.REGIAO;


        if (
            nomeRaw
        ) {

            const nLow =
                nomeRaw
                    .toString()
                    .toLowerCase();


            for (
                const r
                of regioesValidas
            ) {

                if (
                    nLow.includes(
                        r
                    )
                ) {

                    return (
                        r.charAt(
                            0
                        )
                        .toUpperCase()
                        +
                        r.slice(
                            1
                        )
                    );

                }

            }

        }


        for (
            const key
            in p
        ) {

            const val =
                p[key];


            if (
                typeof val ===
                'string'
            ) {

                const vLow =
                    val.toLowerCase();


                for (
                    const r
                    of regioesValidas
                ) {

                    if (
                        vLow.includes(
                            r
                        )
                        ||
                        vLow ===
                            r
                    ) {

                        return (
                            r.charAt(
                                0
                            )
                            .toUpperCase()
                            +
                            r.slice(
                                1
                            )
                        );

                    }

                }

            }

        }


        return "Desconhecida";

    }


    function buscarSubprefeitura(
        nomeDistrito
    ) {

        if (
            !nomeDistrito
        ) {
            return undefined;
        }


        return dictDistritoParaSub[
            nomeDistrito
                .toLowerCase()
                .trim()
        ];

    }


    function buscarRegiao(
        nomeSub
    ) {

        if (
            !nomeSub
        ) {
            return "Desconhecida";
        }


        const nNorm =
            nomeSub
                .toLowerCase()
                .trim();


        if (
            dictSubParaRegiao[
                nNorm
            ]
        ) {

            return dictSubParaRegiao[
                nNorm
            ];

        }


        for (
            const key
            in dictSubParaRegiao
        ) {

            if (
                nNorm.includes(
                    key
                )
                ||
                key.includes(
                    nNorm
                )
            ) {

                return dictSubParaRegiao[
                    key
                ];

            }

        }


        return "Desconhecida";

    }


    if (
        subprefeiturasGeoJSON
        &&
        subprefeiturasGeoJSON.features
    ) {

        subprefeiturasGeoJSON
            .features
            .forEach(
                feature => {

                    const nomeSub =
                        extrairNomeSub(
                            feature
                        );


                    feature.properties.regiao =
                        buscarRegiao(
                            nomeSub
                        );

                }
            );

    }


    if (
        distritosGeoJSON
        &&
        distritosGeoJSON.features
    ) {

        distritosGeoJSON
            .features
            .forEach(
                feature => {

                    const nomeDist =
                        extrairNomeDistrito(
                            feature
                        );


                    feature.properties.subprefeitura =
                        buscarSubprefeitura(
                            nomeDist
                        );

                }
            );

    }


    if (
        geojsonPerimetros
        &&
        geojsonPerimetros.features
    ) {

        geojsonPerimetros
            .features
            .forEach(
                local => {

                    if (
                        !local.properties.distrito
                    ) {

                        try {

                            const centroide =
                                turf.centroid(
                                    local
                                );


                            for (
                                const f
                                of distritosGeoJSON.features
                            ) {

                                if (
                                    turf.booleanPointInPolygon(
                                        centroide,
                                        f
                                    )
                                ) {

                                    local.properties.distrito =
                                        extrairNomeDistrito(
                                            f
                                        );


                                    break;

                                }

                            }

                        }
                        catch (
                            e
                        ) {}

                    }

                }
            );

    }


    if (
        !sppBasePerimetros
    ) {

        sppBasePerimetros =
            geojsonPerimetros
                .features
                .slice();


        sppBaseItens =
            geojsonItens
                .features
                .slice();


        sppCatalog =
            sppBasePerimetros.map(
                f => ({

                    grupo:
                        grupoDaFeature(
                            f
                        ),

                    local:
                        nomeEquipamento(
                            f
                        ),

                    distrito:
                        f.properties.distrito
                        ||
                        '',

                    subprefeitura:
                        buscarSubprefeitura(
                            f.properties.distrito
                        )
                        ||
                        '',

                    regiao:
                        buscarRegiao(
                            buscarSubprefeitura(
                                f.properties.distrito
                            )
                        )
                        ||
                        '',

                    properties:
                        f.properties,

                    geometry:
                        f.geometry,

                    center:
                        turf
                            .centroid(
                                f
                            )
                            .geometry
                            .coordinates

                })
            );

    }


    const wantedGroups =
        sppList(
            sppFilters.grupo
        );


    const wantedLocals =
        sppList(
            sppFilters.local
        );


    const wantedItems = {

        conjunto:
            sppList(
                sppFilters.conjunto
            ),

        bloco:
            sppList(
                sppFilters.bloco
            ),

        estrutura:
            sppList(
                sppFilters.estrutura
            )

    };


    const hasItems =
        Object
            .values(
                wantedItems
            )
            .some(
                array =>
                    array.length
            );


    const nivelInicialURL =
        normalizarNivelURL(
            new URLSearchParams(
                window.location.search
            ).get(
                'nivel'
            )
        );

    const nivelTravado =
    Boolean(
        nivelInicialURL
    )
    &&
    [
        '1',
        'true',
        'sim',
        'yes',
        'on'
    ]
    .includes(
        normalizarTexto(
            new URLSearchParams(
                window.location.search
            )
            .get(
                'nivel_travado'
            )
            ||
            ''
        )
    );


    abrirItensFiltrados =
        hasItems;


    geojsonItens.features =
        sppBaseItens.filter(
            f =>
                itemAtendeFiltros(
                    f,
                    wantedItems
                )
        );


    geojsonPerimetros.features =
        sppBasePerimetros.filter(
            f => {

                const district =
                    f.properties.distrito;


                const sub =
                    buscarSubprefeitura(
                        district
                    );


                const region =
                    buscarRegiao(
                        sub
                    );


                return (
                    !(
                        sppFilters.vazio ===
                            true
                        ||
                        sppFilters.vazio ===
                            'true'
                    )
                    &&
                    sppGroupMatches(
                        wantedGroups,
                        grupoDaFeature(
                            f
                        ),
                        region
                    )
                    &&
                    (
                        !sppList(
                            sppFilters.tipo
                        ).length
                        ||
                        sppList(
                            sppFilters.tipo
                        ).some(
                            tipo =>
                                tipo ===
                                    equipmentType(
                                        f
                                    ).key
                                ||
                                tipo ===
                                    normalizarTexto(
                                        equipmentType(
                                            f
                                        ).label
                                    )
                        )
                    )
                    &&
                    (
                        !wantedLocals.length
                        ||
                        wantedLocals.includes(
                            normalizarTexto(
                                nomeEquipamento(
                                    f
                                )
                            )
                        )
                    )
                    &&
                    (
                        !sppFilters.regiao
                        ||
                        sppEquals(
                            sppFilters.regiao,
                            region
                        )
                    )
                    &&
                    (
                        !sppFilters.subprefeitura
                        ||
                        sppEquals(
                            sppFilters.subprefeitura,
                            sub
                        )
                    )
                    &&
                    (
                        !sppFilters.distrito
                        ||
                        sppEquals(
                            sppFilters.distrito,
                            district
                        )
                    )
                    &&
                    (
                        !hasItems
                        ||
                        geojsonItens.features.some(
                            item =>
                                pertenceAoEquipamento(
                                    item,
                                    f
                                )
                        )
                    )
                );

            }
        );


    geojsonItens.features =
        geojsonItens
            .features
            .filter(
                item =>
                    geojsonPerimetros
                        .features
                        .some(
                            f =>
                                grupoDaFeature(
                                    f
                                )
                                ===
                                grupoDaFeature(
                                    item
                                )
                                &&
                                pertenceAoEquipamento(
                                    item,
                                    f
                                )
                        )
            );


    const map =
        sppMap =
            L.map(
                'map',
                {

                    maxZoom:
                        20,

                    zoomAnimation:
                        false,

                    fadeAnimation:
                        false,

                    markerZoomAnimation:
                        false

                }
            )
            .setView(
                [
                    -23.5505,
                    -46.6333
                ],
                11
            );


    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {

            attribution:
                'Tiles &copy; Esri',

            maxNativeZoom:
                16,

            maxZoom:
                20

        }
    )
    .addTo(
        map
    );


    const corAzul =
        "#00506E";

    const corLaranjaSPP =
        "#F08200";


    let currentState =
        0;


    let voltarAoPerimetroAtual =
        null;


    let regiaoAtual =
        null;

    let boundsRegiaoAtual =
        null;


    let subprefeituraAtual =
        null;

    let boundsSubprefeituraAtual =
        null;


    let distritoAtual =
        null;

    let boundsDistritoAtual =
        null;


    let boundsLocalAtual =
        null;


    let regioesLayer;


    let subprefeiturasLayer;

    let distritosLayer;


    let distritoSelecionadoLayer =
        L.layerGroup();


    let badgesReg =
        L.layerGroup();

    let badgesSub =
        L.layerGroup();

    let badgesDist =
        L.layerGroup();


    let pinsLocais =
        L.layerGroup();

    let perimetrosLayer =
        L.layerGroup();

    let itensLayer =
        L.layerGroup();


    let contagemRegiao = {};

    let contagemSub = {};

    let contagemDist = {};


    if (
        geojsonPerimetros.features
        &&
        geojsonPerimetros
            .features
            .length >
            0
    ) {

        geojsonPerimetros
            .features
            .forEach(
                f => {

                    const distrito =
                        f.properties.distrito;


                    if (
                        distrito
                    ) {

                        const sub =
                            buscarSubprefeitura(
                                distrito
                            );


                        if (
                            !contagemDist[
                                distrito
                            ]
                        ) {

                            contagemDist[
                                distrito
                            ] = {
                                total:
                                    0
                            };

                        }


                        contagemDist[
                            distrito
                        ].total +=
                            1;


                        if (
                            sub
                        ) {

                            if (
                                !contagemSub[
                                    sub
                                ]
                            ) {

                                contagemSub[
                                    sub
                                ] = {
                                    total:
                                        0
                                };

                            }


                            contagemSub[
                                sub
                            ].total +=
                                1;


                            const reg =
                                buscarRegiao(
                                    sub
                                );


                            if (
                                reg !==
                                "Desconhecida"
                            ) {

                                if (
                                    !contagemRegiao[
                                        reg
                                    ]
                                ) {

                                    contagemRegiao[
                                        reg
                                    ] = {
                                        total:
                                            0
                                    };

                                }


                                contagemRegiao[
                                    reg
                                ].total +=
                                    1;

                            }

                        }

                    }

                }
            );

    }


    function atualizarIndicadorCamada(
        texto
    ) {

        const indicador =
            document.getElementById(
                'indicador-camada'
            );


        if (
            indicador
        ) {

            indicador.innerHTML =
                `Camada Atual: <b>${texto}</b>`;

        }

    }


    function temDadosNoLocal(
        stats
    ) {

        return (
            stats
            &&
            stats.total >
                0
        );

    }


    function estiloRegiao(
        feature,
        nivel
    ) {

        let nome;

        let stats;


        if (
            nivel ===
            'regiao'
        ) {

            nome =
                extrairNomeRegiao(
                    feature
                );


            stats =
                contagemRegiao[
                    nome
                ];

        }
        else if (
            nivel ===
            'subprefeitura'
        ) {

            nome =
                extrairNomeSub(
                    feature
                );


            stats =
                contagemSub[
                    nome
                ];

        }
        else {

            nome =
                extrairNomeDistrito(
                    feature
                );


            stats =
                contagemDist[
                    nome
                ];

        }


        return temDadosNoLocal(
            stats
        )
            ?
            {

                color:
                    corAzul,

                weight:
                    1.5,

                fillColor:
                    corAzul,

                fillOpacity:
                    0.35

            }
            :
            {

                color:
                    corAzul,

                weight:
                    1,

                fillColor:
                    corAzul,

                fillOpacity:
                    0

            };

    }


    function estiloHover(
        feature,
        nivel
    ) {

        const base =
            estiloRegiao(
                feature,
                nivel
            );


        return {

            ...base,

            weight:
                3,

            fillOpacity:
                Math.max(
                    base.fillOpacity,
                    0.15
                )
                +
                0.15

        };

    }


    function criarBadgeIcon(
        stats
    ) {

        return L.divIcon(
            {

                className:
                    'custom-icon',

                html:
                    `
                        <div class="badge-local">
                            ${stats.total || 0}
                        </div>
                    `,

                iconSize:
                    [
                        30,
                        30
                    ],

                iconAnchor:
                    [
                        15,
                        15
                    ]

            }
        );

    }


    function obterCentroInterno(
        feature
    ) {

        try {

            const centroDeMassa =
                turf.centerOfMass(
                    feature
                );


            const centroEstaDentro =
                turf.booleanPointInPolygon(
                    centroDeMassa,
                    feature
                );


            const ponto =
                centroEstaDentro
                    ?
                    centroDeMassa
                    :
                    turf.pointOnFeature(
                        feature
                    );


            const [
                lng,
                lat
            ] =
                ponto
                    .geometry
                    .coordinates;


            return L.latLng(
                lat,
                lng
            );

        }
        catch (
            erro
        ) {

            return L
                .geoJSON(
                    feature
                )
                .getBounds()
                .getCenter();

        }

    }


    // ========================================================
    // REGIÕES
    // ========================================================

    // Enquadra as regiões no tamanho real do iframe, em vez do zoom fixo inicial.
    function enquadrarRegioes() {
        if (currentState !== 0 || !regioesLayer) return;
        const bounds = regioesLayer.getBounds();
        const size = map.getSize();
        if (!bounds.isValid() || size.x <= 0 || size.y <= 0) return;
        map.fitBounds(bounds, {
            paddingTopLeft: [24, 72],
            paddingBottomRight: [24, 64],
            maxZoom: 10,
            animate: false
        });
    }
    map.on('resize', enquadrarRegioes);

    function renderizarRegioes() {

        atualizarLegendaTipos();


        currentState =
            0;


        atualizarIndicadorCamada(
            "Regiões"
        );


        if (
            !regioesGeoJSON
            ||
            !regioesGeoJSON.features
            ||
            regioesGeoJSON.features.length ===
                0
        ) {

            renderizarSubprefeituras();

            return;

        }


        if (
            regioesLayer
        ) {

            map.removeLayer(
                regioesLayer
            );

        }


        if (
            subprefeiturasLayer
        ) {

            map.removeLayer(
                subprefeiturasLayer
            );

        }


        badgesReg.clearLayers();
        badgesSub.clearLayers();


        regioesLayer =
            L.geoJSON(
                regioesGeoJSON,
                {

                    style:
                        f =>
                            estiloRegiao(
                                f,
                                'regiao'
                            ),


                    onEachFeature:
                        function (
                            feature,
                            layer
                        ) {

                            const nomeRegiao =
                                extrairNomeRegiao(
                                    feature
                                );


                            const stats =
                                contagemRegiao[
                                    nomeRegiao
                                ];


                            layer.on(
                                'mouseover',
                                () =>
                                    layer.setStyle(
                                        estiloHover(
                                            feature,
                                            'regiao'
                                        )
                                    )
                            );


                            layer.on(
                                'mouseout',
                                () =>
                                    regioesLayer
                                        .resetStyle(
                                            layer
                                        )
                            );


                            if (
                                temDadosNoLocal(
                                    stats
                                )
                            ) {

                                L.marker(
                                    obterCentroInterno(
                                        feature
                                    ),
                                    {

                                        icon:
                                            criarBadgeIcon(
                                                stats
                                            ),

                                        interactive:
                                            false

                                    }
                                )
                                .addTo(
                                    badgesReg
                                );

                            }


                            layer.on(
                                'click',
                                function (
                                    e
                                ) {

                                    L.DomEvent.stopPropagation(
                                        e
                                    );

                                    if (nivelTravado) {return;}
                                    
                                    regiaoAtual =
                                        nomeRegiao;


                                    boundsRegiaoAtual =
                                        e
                                            .target
                                            .getBounds();


                                    enviarAcaoParaPai(
                                        'region-selected',
                                        {
                                            regiao:
                                                nomeRegiao
                                        }
                                    );


                                    map.removeLayer(
                                        regioesLayer
                                    );


                                    badgesReg.removeFrom(
                                        map
                                    );


                                    map.fitBounds(
                                        boundsRegiaoAtual
                                    );


                                    renderizarSubprefeituras(
                                        nomeRegiao
                                    );

                                }
                            );


                            if (
                                nomeRegiao !==
                                "Desconhecida"
                            ) {

                                layer.bindTooltip(
                                    nomeRegiao,
                                    {
                                        sticky:
                                            true
                                    }
                                );

                            }

                        }

                }
            )
            .addTo(
                map
            );


        badgesReg.addTo(
            map
        );

        map.invalidateSize({ pan: false });
        enquadrarRegioes();

    }


    // ========================================================
    // SUBPREFEITURAS
    // ========================================================

    function renderizarSubprefeituras(
        nomeRegiaoFiltro = null
    ) {

        atualizarLegendaTipos(
            'regiao',
            nomeRegiaoFiltro
        );


        currentState =
            1;


        atualizarIndicadorCamada(
            nomeRegiaoFiltro
                ?
                `Subprefeituras (${nomeRegiaoFiltro})`
                :
                "Subprefeituras"
        );


        if (
            subprefeiturasLayer
        ) {

            map.removeLayer(
                subprefeiturasLayer
            );

        }


        if (
            distritosLayer
        ) {

            map.removeLayer(
                distritosLayer
            );

        }


        badgesSub.clearLayers();
        badgesDist.clearLayers();


        subprefeiturasLayer =
            L.geoJSON(
                subprefeiturasGeoJSON,
                {

                    filter:
                        f => {

                            if (
                                !nomeRegiaoFiltro
                            ) {
                                return true;
                            }


                            const reg =
                                f.properties.regiao;


                            if (
                                !reg
                                ||
                                reg ===
                                    "Desconhecida"
                            ) {
                                return false;
                            }


                            return (
                                reg
                                    .toLowerCase()
                                    .includes(
                                        nomeRegiaoFiltro
                                            .toLowerCase()
                                    )
                                ||
                                nomeRegiaoFiltro
                                    .toLowerCase()
                                    .includes(
                                        reg.toLowerCase()
                                    )
                            );

                        },


                    style:
                        f =>
                            estiloRegiao(
                                f,
                                'subprefeitura'
                            ),


                    onEachFeature:
                        function (
                            feature,
                            layer
                        ) {

                            const nomeSub =
                                extrairNomeSub(
                                    feature
                                );


                            const stats =
                                contagemSub[
                                    nomeSub
                                ];


                            layer.on(
                                'mouseover',
                                () =>
                                    layer.setStyle(
                                        estiloHover(
                                            feature,
                                            'subprefeitura'
                                        )
                                    )
                            );


                            layer.on(
                                'mouseout',
                                () =>
                                    subprefeiturasLayer
                                        .resetStyle(
                                            layer
                                        )
                            );


                            if (
                                temDadosNoLocal(
                                    stats
                                )
                            ) {

                                L.marker(
                                    obterCentroInterno(
                                        feature
                                    ),
                                    {

                                        icon:
                                            criarBadgeIcon(
                                                stats
                                            ),

                                        interactive:
                                            false

                                    }
                                )
                                .addTo(
                                    badgesSub
                                );

                            }


                            layer.on(
                                'click',
                                function (
                                    e
                                ) {

                                    L.DomEvent.stopPropagation(
                                        e
                                    );

                                    if (nivelTravado) {return;}
                                    
                                    subprefeituraAtual =
                                        nomeSub;


                                    boundsSubprefeituraAtual =
                                        e
                                            .target
                                            .getBounds();


                                    enviarAcaoParaPai(
                                        'subprefeitura-selected',
                                        {

                                            subprefeitura:
                                                nomeSub,

                                            regiao:
                                                regiaoAtual
                                                ||
                                                ''

                                        }
                                    );


                                    map.removeLayer(
                                        subprefeiturasLayer
                                    );


                                    badgesSub.removeFrom(
                                        map
                                    );


                                    map.fitBounds(
                                        boundsSubprefeituraAtual
                                    );


                                    renderizarDistritos(
                                        nomeSub
                                    );

                                }
                            );


                            layer.bindTooltip(
                                nomeSub,
                                {
                                    sticky:
                                        true
                                }
                            );

                        }

                }
            )
            .addTo(
                map
            );


        badgesSub.addTo(
            map
        );

    }


    // ========================================================
    // DISTRITOS
    // ========================================================

    function renderizarDistritos(
        nomeSubClicada = null
    ) {

        atualizarLegendaTipos(
            nomeSubClicada
                ?
                'subprefeitura'
                :
                'geral',

            nomeSubClicada
            ||
            ''
        );


        currentState =
            2;


        atualizarIndicadorCamada(
            nomeSubClicada
                ?
                `Distritos (${nomeSubClicada})`
                :
                'Distritos'
        );


        if (
            distritosLayer
        ) {

            map.removeLayer(
                distritosLayer
            );

        }


        badgesDist.clearLayers();


        distritosLayer =
            L.geoJSON(
                distritosGeoJSON,
                {

                    filter:
                        f => {

                            if (
                                !nomeSubClicada
                            ) {
                                return true;
                            }


                            const subF =
                                f
                                    .properties
                                    .subprefeitura;


                            return (
                                subF
                                &&
                                subF
                                    .toLowerCase()
                                ===
                                nomeSubClicada
                                    .toLowerCase()
                            );

                        },


                    style:
                        f =>
                            estiloRegiao(
                                f,
                                'distrito'
                            ),


                    onEachFeature:
                        function (
                            feature,
                            layer
                        ) {

                            const nomeDistrito =
                                extrairNomeDistrito(
                                    feature
                                );


                            const subDoDistrito =
                                feature
                                    .properties
                                    .subprefeitura
                                ||
                                buscarSubprefeitura(
                                    nomeDistrito
                                );


                            const stats =
                                contagemDist[
                                    nomeDistrito
                                ];


                            layer.on(
                                'mouseover',
                                () =>
                                    layer.setStyle(
                                        estiloHover(
                                            feature,
                                            'distrito'
                                        )
                                    )
                            );


                            layer.on(
                                'mouseout',
                                () =>
                                    distritosLayer
                                        .resetStyle(
                                            layer
                                        )
                            );


                            if (
                                temDadosNoLocal(
                                    stats
                                )
                            ) {

                                L.marker(
                                    obterCentroInterno(
                                        feature
                                    ),
                                    {

                                        icon:
                                            criarBadgeIcon(
                                                stats
                                            ),

                                        interactive:
                                            false

                                    }
                                )
                                .addTo(
                                    badgesDist
                                );

                            }


                            layer.on(
                                'click',
                                function (
                                    e
                                ) {

                                    L.DomEvent.stopPropagation(
                                        e
                                    );

                                    if (nivelTravado) {return;}
                                    
                                    subprefeituraAtual =
                                        subDoDistrito;


                                    distritoAtual =
                                        nomeDistrito;


                                    boundsDistritoAtual =
                                        e
                                            .target
                                            .getBounds();


                                    enviarAcaoParaPai(
                                        'district-selected',
                                        {

                                            distrito:
                                                nomeDistrito,

                                            subprefeitura:
                                                subDoDistrito
                                                ||
                                                '',

                                            regiao:
                                                regiaoAtual
                                                ||
                                                ''

                                        }
                                    );


                                    if (
                                        temDadosNoLocal(
                                            stats
                                        )
                                    ) {

                                        mostrarPinsDistrito(
                                            nomeDistrito,
                                            boundsDistritoAtual
                                        );

                                    }
                                    else {

                                        map.fitBounds(
                                            boundsDistritoAtual
                                        );

                                    }

                                }
                            );


                            layer.bindTooltip(
                                nomeDistrito,
                                {
                                    sticky:
                                        true
                                }
                            );

                        }

                }
            )
            .addTo(
                map
            );


        badgesDist.addTo(
            map
        );

    }


    // ========================================================
    // PINS / LOCAIS
    // ========================================================

    function mostrarPinsDistrito(
        nomeDistrito,
        boundsDistrito
    ) {

        atualizarLegendaTipos(
            'distrito',
            nomeDistrito
        );


        currentState =
            3;


        distritoAtual =
            nomeDistrito;


        boundsDistritoAtual =
            boundsDistrito;


        atualizarIndicadorCamada(
            `Locais (${nomeDistrito})`
        );


        if (
            distritosLayer
        ) {

            map.removeLayer(
                distritosLayer
            );

        }


        badgesDist.removeFrom(
            map
        );


        distritoSelecionadoLayer.clearLayers();
        pinsLocais.clearLayers();
        perimetrosLayer.clearLayers();
        itensLayer.clearLayers();


        map.closePopup();


        const featDistrito =
            distritosGeoJSON
                .features
                .find(
                    f =>
                        extrairNomeDistrito(
                            f
                        )
                        ===
                        nomeDistrito
                );


        if (
            featDistrito
        ) {

            L.geoJSON(
                featDistrito,
                {

                    style: {

                        color:
                            corAzul,

                        weight:
                            1.5,

                        fillColor:
                            corAzul,

                        fillOpacity:
                            0.1,

                        dashArray:
                            "4, 4"

                    },

                    interactive:
                        false

                }
            )
            .addTo(
                distritoSelecionadoLayer
            );

        }


        distritoSelecionadoLayer.addTo(
            map
        );


        map.fitBounds(
            boundsDistrito
        );


        const typeIcon =
            f =>
                L.divIcon(
                    {

                        className:
                            'custom-type-pin',

                        html:
                            equipmentIcon(
                                f
                            ),

                        iconSize:
                            [
                                32,
                                32
                            ],

                        iconAnchor:
                            [
                                16,
                                16
                            ],

                        tooltipAnchor:
                            [
                                0,
                                -18
                            ]

                    }
                );


        geojsonPerimetros
            .features
            .filter(
                f =>
                    f.properties.distrito ===
                    nomeDistrito
            )
            .forEach(
                f => {

                    const centroid =
                        turf
                            .centroid(
                                f
                            )
                            .geometry
                            .coordinates;


                    const nomeLocal =
                        nomeEquipamento(
                            f
                        )
                        ||
                        'Local Mapeado';


                    const marker =
                        L.marker(
                            [
                                centroid[1],
                                centroid[0]
                            ],
                            {

                                icon:
                                    typeIcon(
                                        f
                                    ),

                                title:
                                    nomeLocal,

                                alt:
                                    nomeLocal

                            }
                        );


                    marker.bindTooltip(
                        escaparHTML(
                            nomeLocal
                        ),
                        {

                            permanent:
                                false,

                            direction:
                                'top',

                            className:
                                'tooltip-hover-local'

                        }
                    );


                    marker.on(
                        'click',
                        function (
                            e
                        ) {

                            L.DomEvent.stopPropagation(
                                e
                            );

                            if (nivelTravado) {return;}
                            
                            avisarLocalSelecionado(
                                nomeLocal,
                                f,
                                'pin'
                            );


                            mostrarPerimetroLocal(
                                nomeLocal,
                                f
                            );

                        }
                    );


                    marker.addTo(
                        pinsLocais
                    );

                }
            );


        pinsLocais.addTo(
            map
        );

    }


    // ========================================================
    // PERÍMETRO INDIVIDUAL
    // ========================================================

   function mostrarPerimetroLocal(
    nomeLocal,
    featurePerimetro,
    abrirDiretamente = false
) {

    atualizarLegendaTipos(
        'local',
        nomeLocal,
        featurePerimetro.type ===
            'FeatureCollection'
            ?
            featurePerimetro.features
            :
            [
                featurePerimetro
            ]
    );


    voltarAoPerimetroAtual =
        () =>
            mostrarPerimetroLocal(
                nomeLocal,
                featurePerimetro
            );


    currentState =
        4;


    atualizarIndicadorCamada(
        `Perímetro (${escaparHTML(nomeLocal)})`
    );


    pinsLocais.removeFrom(
        map
    );


    perimetrosLayer.clearLayers();
    itensLayer.clearLayers();


    map.closePopup();


    const perimetrosDoLocal =
        featurePerimetro.type ===
            'FeatureCollection'
            ?
            featurePerimetro.features
            :
            [
                featurePerimetro
            ];


    const itensDoLocal = {

        type:
            'FeatureCollection',

        features:
            (
                geojsonItens.features
                ||
                []
            )
            .filter(
                f =>
                    perimetrosDoLocal.some(
                        perimetro =>
                            pertenceAoEquipamento(
                                f,
                                perimetro
                            )
                    )
            )

    };


    const temItens =
        itensDoLocal
            .features
            .length >
        0;


    // ========================================================
    // PERÍMETRO — LARANJA SPP
    // ========================================================

    const camadaPerimetro =
        L.geoJSON(
            featurePerimetro,
            {

                style: {

                    color:
                        corLaranjaSPP,

                    weight:
                        3,

                    opacity:
                        1,

                    fillColor:
                        corLaranjaSPP,

                    fillOpacity:
                        0.16,

                    dashArray:
                        "5, 5",

                    lineJoin:
                        "round",

                    lineCap:
                        "round"

                }

            }
        )
        .addTo(
            perimetrosLayer
        );


    // ========================================================
    // DIVISÕES INTERNAS
    // ========================================================

    let itensExibidos =
        false;


    function mostrarItensLocal() {

        if (
            itensExibidos
            ||
            !temItens
        ) {
            return;
        }


        itensExibidos =
            true;


        currentState =
            5;


        map.closePopup();


        atualizarIndicadorCamada(
            "Divisões Internas"
        );


        // ====================================================
        // BORDA DO PERÍMETRO CONTINUA LARANJA SPP
        // ====================================================

        camadaPerimetro.setStyle(
            {

                color:
                    corLaranjaSPP,

                weight:
                    4,

                opacity:
                    1,

                fillColor:
                    corLaranjaSPP,

                fillOpacity:
                    0,

                dashArray:
                    null,

                lineJoin:
                    "round",

                lineCap:
                    "round"

            }
        );


        L.geoJSON(
            {

                type:
                    'FeatureCollection',

                features:
                    itensDoLocal
                        .features
                        .flatMap(
                            separarAreasParaExibicao
                        )

            },
            {

                style:
                    () => ({

                        color:
                            '#FFFFFF',

                        weight:
                            1,

                        opacity:
                            0.95,

                        fillColor:
                            corAzul,

                        fillOpacity:
                            0.48

                    }),


                pointToLayer:
                    (
                        f,
                        latlng
                    ) =>
                        L.circleMarker(
                            latlng,
                            {

                                color:
                                    '#FFFFFF',

                                weight:
                                    1,

                                fillColor:
                                    corAzul,

                                fillOpacity:
                                    0.48,

                                radius:
                                    7

                            }
                        ),


                onEachFeature:
                    (
                        f,
                        layer
                    ) => {

                        const titulo =
                            nomeItem(
                                f
                            );


                        layer.bindTooltip(
                            `
                                <b>
                                    ${escaparHTML(nomeLocal)}
                                </b>

                                <br>

                                ${escaparHTML(tipoItem(f))}:
                                ${escaparHTML(titulo)}
                            `,
                            {

                                sticky:
                                    true,

                                className:
                                    'tooltip-area-interna'

                            }
                        );


                        layer.on(
                            'mouseover',
                            function () {

                                if (
                                    this.setStyle
                                ) {

                                    this.setStyle(
                                        {

                                            fillColor:
                                                corLaranjaSPP,

                                            fillOpacity:
                                                0.78

                                        }
                                    );

                                }

                            }
                        );


                        layer.on(
                            'mouseout',
                            function () {

                                if (
                                    this.setStyle
                                ) {

                                    this.setStyle(
                                        {

                                            fillColor:
                                                corAzul,

                                            fillOpacity:
                                                0.48

                                        }
                                    );

                                }

                            }
                        );

                    }

            }
        )
        .addTo(
            itensLayer
        );


        itensLayer.addTo(
            map
        );


        const boundsItens =
            L.latLngBounds(
                []
            );


        itensLayer.eachLayer(
            camada => {

                if (
                    camada.getBounds
                    &&
                    camada
                        .getBounds()
                        .isValid()
                ) {

                    boundsItens.extend(
                        camada.getBounds()
                    );

                }

            }
        );


        if (
            boundsItens.isValid()
        ) {

            map.fitBounds(
                boundsItens,
                {

                    padding:
                        [
                            30,
                            30
                        ],

                    maxZoom:
                        20

                }
            );

        }

    }


    camadaPerimetro.on(
        'click',
        function (
            e
        ) {

            L.DomEvent.stopPropagation(
                e
            );

            if(nivelTravado) {return;}
            
            avisarLocalSelecionado(
                nomeLocal,
                featurePerimetro,
                'perimetro'
            );


            mostrarItensLocal();

        }
    );


    perimetrosLayer.addTo(
        map
    );


    boundsLocalAtual =
        camadaPerimetro.getBounds();


    if (
        abrirDiretamente
        &&
        temItens
    ) {

        mostrarItensLocal();

    }
    else {

        map.fitBounds(
            boundsLocalAtual,
            {

                padding:
                    [
                        30,
                        30
                    ],

                maxZoom:
                    16

            }
        );

    }

}

    // ========================================================
    // LIMPEZA DE CAMADAS PARA SALTO DIRETO
    // ========================================================

    function limparCamadasParaNivelDireto() {

        map.closePopup();


        if (
            regioesLayer
            &&
            map.hasLayer(
                regioesLayer
            )
        ) {

            map.removeLayer(
                regioesLayer
            );

        }


        if (
            subprefeiturasLayer
            &&
            map.hasLayer(
                subprefeiturasLayer
            )
        ) {

            map.removeLayer(
                subprefeiturasLayer
            );

        }


        if (
            distritosLayer
            &&
            map.hasLayer(
                distritosLayer
            )
        ) {

            map.removeLayer(
                distritosLayer
            );

        }


        if (
            map.hasLayer(
                distritoSelecionadoLayer
            )
        ) {

            map.removeLayer(
                distritoSelecionadoLayer
            );

        }


        badgesReg.clearLayers();
        badgesSub.clearLayers();
        badgesDist.clearLayers();


        pinsLocais.clearLayers();
        perimetrosLayer.clearLayers();
        itensLayer.clearLayers();
        distritoSelecionadoLayer.clearLayers();

    }


    // ========================================================
    // NÍVEL LOCAL DIRETO
    // ========================================================

    function mostrarLocaisFiltradosDireto(
        features
    ) {

        if (
            !features
            ||
            !features.length
        ) {
            return;
        }


        limparCamadasParaNivelDireto();


        currentState =
            3;


        atualizarIndicadorCamada(
            features.length ===
                1
                ?
                "Local"
                :
                `Locais (${features.length})`
        );


        const icon =
            feature =>
                L.divIcon(
                    {

                        className:
                            'custom-type-pin',

                        html:
                            equipmentIcon(
                                feature
                            ),

                        iconSize:
                            [
                                32,
                                32
                            ],

                        iconAnchor:
                            [
                                16,
                                16
                            ]

                    }
                );


        features.forEach(
            feature => {

                const centro =
                    turf
                        .centroid(
                            feature
                        )
                        .geometry
                        .coordinates;


                const nome =
                    nomeEquipamento(
                        feature
                    )
                    ||
                    "Local Mapeado";


                const marker =
                    L.marker(
                        [
                            centro[1],
                            centro[0]
                        ],
                        {
                            icon:
                                icon(
                                    feature
                                )
                        }
                    );


                marker.bindTooltip(
                    escaparHTML(
                        nome
                    )
                );


                marker.on(
                    "click",
                    e => {

                        L.DomEvent.stopPropagation(
                            e
                        );

                        if(nivelTravado){return;}
                        
                        mostrarPerimetroLocal(
                            nome,
                            feature
                        );

                    }
                );


                marker.addTo(
                    pinsLocais
                );

            }
        );


        pinsLocais.addTo(
            map
        );


        const bounds =
            L.geoJSON(
                {

                    type:
                        "FeatureCollection",

                    features

                }
            )
            .getBounds();


        if (
            bounds.isValid()
        ) {

            map.fitBounds(
                bounds,
                {

                    padding:
                        [
                            40,
                            40
                        ],

                    maxZoom:
                        15

                }
            );

        }

    }


    // ========================================================
    // NÍVEL PERÍMETRO DIRETO
    // ========================================================

   function mostrarPerimetrosFiltradosDireto(
    features
) {

    if (
        !features
        ||
        !features.length
    ) {
        return;
    }


    limparCamadasParaNivelDireto();


    currentState =
        4;


    voltarAoPerimetroAtual =
        () =>
            mostrarPerimetrosFiltradosDireto(
                features
            );


    atualizarIndicadorCamada(
        features.length ===
            1
            ?
            "Perímetro"
            :
            `Perímetros (${features.length})`
    );


    const camada =
        L.geoJSON(
            {

                type:
                    "FeatureCollection",

                features

            },
            {

                // =================================================
                // PERÍMETRO — LARANJA SPP
                // =================================================

                style:
                    () => ({

                        color:
                            corLaranjaSPP,

                        weight:
                            3,

                        opacity:
                            1,

                        fillColor:
                            corLaranjaSPP,

                        fillOpacity:
                            0.16,

                        lineJoin:
                            "round",

                        lineCap:
                            "round"

                    }),


                onEachFeature:
                    (
                        feature,
                        layer
                    ) => {

                        const nome =
                            nomeEquipamento(
                                feature
                            )
                            ||
                            "Equipamento";


                        // =========================================
                        // TOOLTIP
                        // =========================================

                        layer.bindTooltip(
                            escaparHTML(
                                nome
                            ),
                            {

                                sticky:
                                    true,

                                direction:
                                    "top",

                                className:
                                    "tooltip-hover-local"

                            }
                        );


                        // =========================================
                        // HOVER
                        // =========================================
                        //
                        // A cor não muda.
                        // Continua sendo o laranja oficial SPP.
                        // O destaque ocorre pela espessura e
                        // transparência.
                        // =========================================

                        layer.on(
                            "mouseover",
                            function () {

                                this.setStyle(
                                    {

                                        color:
                                            corLaranjaSPP,

                                        weight:
                                            4.5,

                                        opacity:
                                            1,

                                        fillColor:
                                            corLaranjaSPP,

                                        fillOpacity:
                                            0.30

                                    }
                                );


                                if (
                                    this.bringToFront
                                ) {

                                    this.bringToFront();

                                }

                            }
                        );


                        // =========================================
                        // MOUSEOUT
                        // =========================================

                        layer.on(
                            "mouseout",
                            function () {

                                this.setStyle(
                                    {

                                        color:
                                            corLaranjaSPP,

                                        weight:
                                            3,

                                        opacity:
                                            1,

                                        fillColor:
                                            corLaranjaSPP,

                                        fillOpacity:
                                            0.16

                                    }
                                );

                            }
                        );


                        // =========================================
                        // CLIQUE
                        // =========================================

                        layer.on(
                            "click",
                            function (
                                event
                            ) {

                                L.DomEvent.stopPropagation(
                                    event
                                );

                                if(nivelTravado) {return;}
                                
                                avisarLocalSelecionado(
                                    nome,
                                    feature,
                                    "perimetro"
                                );


                                mostrarPerimetroLocal(
                                    nome,
                                    feature,
                                    false
                                );

                            }
                        );

                    }

            }
        );


    camada.addTo(
        perimetrosLayer
    );


    perimetrosLayer.addTo(
        map
    );


    // ========================================================
    // ENQUADRAMENTO
    // ========================================================

    const bounds =
        camada.getBounds();


    if (
        bounds.isValid()
    ) {

        boundsLocalAtual =
            bounds;


        map.fitBounds(
            bounds,
            {

                padding:
                    [
                        40,
                        40
                    ],

                maxZoom:
                    16

            }
        );

    }


    atualizarLegendaTipos(
        "local",

        features.length ===
            1
            ?
            nomeEquipamento(
                features[0]
            )
            :
            "Equipamentos filtrados",

        features
    );

}


    // ========================================================
    // NÍVEL INTERNO DIRETO
    // ========================================================

    function mostrarDivisoesInternasDireto(
        features
    ) {

        if (
            !features
            ||
            !features.length
        ) {
            return;
        }


        if (
            features.length !==
            1
        ) {

            mostrarPerimetrosFiltradosDireto(
                features
            );


            return;

        }


        const feature =
            features[0];


        mostrarPerimetroLocal(
            nomeEquipamento(
                feature
            )
            ||
            "Local Mapeado",
            feature,
            true
        );

    }


    // ========================================================
    // LEGENDA
    // ========================================================

    let typeLegendBox =
        null;


    function atualizarLegendaTipos(
        nivel = 'geral',
        valor = '',
        locais = null
    ) {

        const rows =
            (
                locais
                ||
                geojsonPerimetros.features
            )
            .filter(
                f => {

                    const district =
                        f.properties?.distrito
                        ||
                        '';


                    const sub =
                        buscarSubprefeitura(
                            district
                        );


                    const region =
                        buscarRegiao(
                            sub
                        );


                    if (
                        nivel ===
                            'regiao'
                        &&
                        valor
                    ) {

                        return sppEquals(
                            region,
                            valor
                        );

                    }


                    if (
                        nivel ===
                            'subprefeitura'
                        &&
                        valor
                    ) {

                        return sppEquals(
                            sub,
                            valor
                        );

                    }


                    if (
                        nivel ===
                            'distrito'
                        &&
                        valor
                    ) {

                        return sppEquals(
                            district,
                            valor
                        );

                    }


                    return true;

                }
            );


        if (
            !typeLegendBox
        ) {
            return;
        }


        const scope =
            valor
            ||
            'Recorte atual';


        typeLegendBox.innerHTML =
            `
                <details>

                    <summary>
                        Tipos de equipamento ·
                        ${escaparHTML(scope)}
                    </summary>

                    <div class="equipment-legend-list">

                        ${equipmentLegend(rows)}

                    </div>

                    <p>
                        ${rows.length}
                        equipamento(s) neste recorte.
                    </p>

                </details>
            `;

    }


    const typeLegend =
        L.control(
            {
                position:
                    'bottomright'
            }
        );


    typeLegend.onAdd =
        () => {

            typeLegendBox =
                L.DomUtil.create(
                    'div',
                    'equipment-map-legend'
                );


            // Cliques na legenda pertencem ao controle, não à navegação do mapa.
            L.DomEvent.disableClickPropagation(typeLegendBox);

            atualizarLegendaTipos();


            return typeLegendBox;

        };


    typeLegend.addTo(
        map
    );


    // ========================================================
    // CONTROLE VOLTAR
    // ========================================================

    // Restore the return navigation shared by the back button and map background.
    function voltarCamada() {
        if (nivelTravado || currentState <= 0) return;
        const estadoAnterior = currentState;
        enviarAcaoParaPai('map-navigation', { estadoAnterior });
        map.closePopup();
        switch (estadoAnterior) {
            case 5:
                if (typeof voltarAoPerimetroAtual === 'function') voltarAoPerimetroAtual();
                else mostrarPerimetrosFiltradosDireto(geojsonPerimetros.features);
                break;
            case 4:
                if (distritoAtual && boundsDistritoAtual) mostrarPinsDistrito(distritoAtual, boundsDistritoAtual);
                else mostrarLocaisFiltradosDireto(geojsonPerimetros.features);
                break;
            case 3:
                renderizarDistritos(subprefeituraAtual);
                if (boundsSubprefeituraAtual) map.fitBounds(boundsSubprefeituraAtual);
                break;
            case 2:
                renderizarSubprefeituras(regiaoAtual);
                if (boundsRegiaoAtual) map.fitBounds(boundsRegiaoAtual);
                break;
            case 1:
                renderizarRegioes();

                break;
        }
    }
    map.on('click', voltarCamada);


    const backControl =
        L.control(
            {
                position:
                    'topleft'
            }
        );


    backControl.onAdd =
        () => {

            const box =
                L.DomUtil.create(
                    'div',
                    'leaflet-bar spp-back-control'
                );


            const button =
                L.DomUtil.create(
                    'button',
                    '',
                    box
                );


            button.type =
                'button';


            button.textContent =
                '←';


            button.onclick =
                () =>
                    map.fire(
                        'click'
                    );


            return box;

        };

    if(!nivelTravado){
        backControl.addTo(
            map
        );
    }

    // ========================================================
    // NÍVEIS ATIVOS
    // ========================================================

    const regsAtivas =
        Object
            .keys(
                contagemRegiao
            )
            .filter(
                key =>
                    contagemRegiao[
                        key
                    ].total >
                    0
            );


    const subsAtivas =
        Object
            .keys(
                contagemSub
            )
            .filter(
                key =>
                    contagemSub[
                        key
                    ].total >
                    0
            );


    const distsAtivos =
        Object
            .keys(
                contagemDist
            )
            .filter(
                key =>
                    contagemDist[
                        key
                    ].total >
                    0
            );


    const numLocais =
        geojsonPerimetros.features
            ?
            geojsonPerimetros
                .features
                .length
            :
            0;


    const requestedDistrict =
        distritosGeoJSON
            .features
            .find(
                f =>
                    sppFilters.distrito
                    &&
                    sppEquals(
                        extrairNomeDistrito(
                            f
                        ),
                        sppFilters.distrito
                    )
            );


    const requestedSub =
        subprefeiturasGeoJSON
            .features
            .find(
                f =>
                    sppFilters.subprefeitura
                    &&
                    sppEquals(
                        extrairNomeSub(
                            f
                        ),
                        sppFilters.subprefeitura
                    )
            );


    const effectiveRegion =
        sppFilters.regiao
        ||
        (
            wantedGroups.length ===
                1
                ?
                sppGroupRegion(
                    wantedGroups[
                        0
                    ]
                )
                :
                ''
        );


    // ========================================================
    // ROTEADOR DE NÍVEIS
    // ========================================================

    function aplicarNivelInicialSolicitado() {

        if (
            !nivelInicialURL
        ) {
            return false;
        }


        if (
            nivelInicialURL ===
            'regiao'
        ) {

            renderizarRegioes();

            return true;

        }


        if (
            nivelInicialURL ===
            'subprefeitura'
        ) {

            const regiao =
                sppFilters.regiao
                ||
                (
                    regsAtivas.length ===
                        1
                        ?
                        regsAtivas[
                            0
                        ]
                        :
                        effectiveRegion
                )
                ||
                null;


            regiaoAtual =
                regiao;


            renderizarSubprefeituras(
                regiao
            );


            return true;

        }


        if (
            nivelInicialURL ===
            'distrito'
        ) {

            const sub =
                sppFilters.subprefeitura
                ||
                (
                    subsAtivas.length ===
                        1
                        ?
                        subsAtivas[
                            0
                        ]
                        :
                        null
                );


            subprefeituraAtual =
                sub;


            renderizarDistritos(
                sub
            );


            return true;

        }


        if (
            nivelInicialURL ===
            'local'
        ) {

            if (
                !numLocais
            ) {
                return false;
            }


            mostrarLocaisFiltradosDireto(
                geojsonPerimetros.features
            );


            return true;

        }


        if (
            nivelInicialURL ===
            'perimetro'
        ) {

            if (
                !numLocais
            ) {
                return false;
            }


            mostrarPerimetrosFiltradosDireto(
                geojsonPerimetros.features
            );


            return true;

        }


        if (
            nivelInicialURL ===
            'interno'
        ) {

            if (
                !numLocais
            ) {
                return false;
            }


            mostrarDivisoesInternasDireto(
                geojsonPerimetros.features
            );


            return true;

        }


        return false;

    }


    // ========================================================
    // EXECUÇÃO INICIAL
    // ========================================================

    const nivelAplicado =
        aplicarNivelInicialSolicitado();


    if (
        !nivelAplicado
    ) {

        if (
            !numLocais
        ) {

            renderizarRegioes();

        }
        else if (
            numLocais ===
            1
        ) {

            const feature =
                geojsonPerimetros
                    .features[
                        0
                    ];


            mostrarPerimetroLocal(
                nomeEquipamento(
                    feature
                )
                ||
                'Local Mapeado',
                feature,
                abrirItensFiltrados
            );

        }
        else if (
            distsAtivos.length ===
            1
        ) {

            const dist =
                distsAtivos[
                    0
                ];


            const featureDistrito =
                distritosGeoJSON
                    .features
                    .find(
                        f =>
                            extrairNomeDistrito(
                                f
                            )
                            ===
                            dist
                    );


            if (
                featureDistrito
            ) {

                mostrarPinsDistrito(
                    dist,
                    L.geoJSON(
                        featureDistrito
                    ).getBounds()
                );

            }

        }
        else if (
            subsAtivas.length ===
            1
        ) {

            renderizarDistritos(
                subsAtivas[
                    0
                ]
            );

        }
        else if (
            regsAtivas.length ===
            1
        ) {

            renderizarSubprefeituras(
                regsAtivas[
                    0
                ]
            );

        }
        else {

            renderizarRegioes();

        }

    }

}
