# Mapa Interativo de Parcerias e Equipamentos de São Paulo

Aplicação geográfica interativa utilizada para visualização de parcerias, concessões, PPPs, equipamentos públicos e seus respectivos perímetros no Município de São Paulo.

O projeto também funciona como componente geográfico do [`DASHBOARD_SOCIAL`](https://github.com/mathh412/DASHBOARD_SOCIAL), podendo ser carregado como `iframe` e controlado por outra aplicação através de `window.postMessage()`.

---

## Funcionalidades

- navegação pelas divisões administrativas de São Paulo;
- regiões;
- subprefeituras;
- distritos;
- equipamentos;
- perímetros;
- divisões internas;
- contagem de equipamentos por divisão administrativa;
- localização dos equipamentos no mapa;
- suporte a `Polygon` e `MultiPolygon`;
- filtros pela URL;
- abertura direta em qualquer nível;
- nível persistente;
- nível travado;
- múltiplos grupos simultaneamente;
- integração com dashboards por `iframe`;
- recebimento de filtros por `postMessage`;
- recebimento de buffers e camadas analíticas;
- suporte a blocos, conjuntos e estruturas internas;
- tooltips e popups;
- modo `embed`.

---

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Leaflet 1.9.4
- Turf.js 6.5
- GeoJSON
- GitHub Pages

---

## Estrutura do projeto

```text
mapa/
├── README.md
├── index.html
│
├── css/
│   └── mapa.css
│
├── js/
│   ├── mapa.js
│   ├── nivel-persistente.js
│   └── bridge-analitico.js
│
├── divisaoadm/
│   ├── regioes.geojson
│   ├── subprefeituras.geojson
│   └── distritos.geojson
│
├── grupos/
│   ├── anhangabau/
│   ├── anhembi/
│   ├── baixoantartica/
│   ├── baixolapa/
│   ├── baixopompeia/
│   ├── cemb1consolare/
│   ├── cemb2cortel/
│   ├── cemb3maya/
│   ├── cemb4velar/
│   ├── ceus1/
│   ├── ceus2/
│   ├── dompedro/
│   ├── mercadopaulistanokinjo/
│   ├── mercadosantoamaro/
│   ├── pacaembu/
│   ├── parques1/
│   ├── parques3/
│   ├── termleste/
│   ├── termnoroeste/
│   └── termsul/
│
└── scripts/
```

---

## Arquitetura JavaScript

### `mapa.js`

Motor principal da aplicação.

Responsável por:

- inicialização do Leaflet;
- carregamento dos GeoJSON;
- filtros;
- navegação administrativa;
- pinos;
- perímetros;
- divisões internas;
- estilos;
- tooltips;
- popups;
- comunicação básica com aplicações externas;
- controle de estado do mapa.

---

### `nivel-persistente.js`

Camada adicional responsável por manter o nível solicitado mesmo quando filtros ou estados do mapa são atualizados.

Suporta os níveis:

```text
regiao
subprefeitura
distrito
local
perimetro
interno
```

Esse arquivo é carregado depois de:

```text
mapa.js
```

e antes de:

```text
bridge-analitico.js
```

---

### `bridge-analitico.js`

Integra o mapa com aplicações externas.

Recebe através de `postMessage`:

- buffers;
- setores censitários;
- GeoJSONs;
- camadas analíticas;
- comandos de remoção;
- comandos de enquadramento.

As camadas analíticas são registradas por nome para evitar duplicações durante atualizações.

O bridge utiliza panes específicos do Leaflet, incluindo:

```text
sppAnaliseBuffer
sppAnaliseSetores
sppAnaliseFrente
```

---

## Ordem dos scripts

O `index.html` carrega os scripts nesta ordem:

```text
Leaflet
   ↓
Turf.js
   ↓
mapa.js
   ↓
nivel-persistente.js
   ↓
bridge-analitico.js
```

Essa ordem deve ser preservada.

---

## Navegação padrão

No modo normal, a navegação pode seguir:

```text
Região
   ↓
Subprefeitura
   ↓
Distrito
   ↓
Local
   ↓
Perímetro
   ↓
Divisões Internas
```

Cada nível é exibido apenas quando aplicável aos dados carregados.

---

## Níveis do mapa

É possível definir diretamente o nível inicial através de:

```text
nivel
```

### Região

```text
?nivel=regiao
```

### Subprefeitura

```text
?nivel=subprefeitura
```

### Distrito

```text
?nivel=distrito
```

### Local / Equipamento

```text
?nivel=local
```

Também são reconhecidas variações como:

```text
equipamento
equipamentos
pin
pins
```

### Perímetro

```text
?nivel=perimetro
```

### Divisões internas

```text
?nivel=interno
```

Também podem ser reconhecidas variações relacionadas a:

```text
divisao-interna
divisoes-internas
area-interna
areas-internas
```

---

## Nível travado

O mapa possui suporte ao parâmetro:

```text
nivel_travado=1
```

Exemplo:

```text
?nivel=perimetro&nivel_travado=1
```

Quando o nível está travado:

- o mapa permanece no nível informado;
- não é possível voltar para a camada anterior;
- não é possível avançar para a próxima camada;
- zoom continua funcionando;
- pan continua funcionando;
- hover continua funcionando;
- tooltips continuam funcionando.

O travamento é aplicado apenas quando um `nivel` válido também está informado.

Também são aceitos valores equivalentes a verdadeiro, como:

```text
1
true
sim
yes
on
```

---

## Modo embed

Quando utilizado dentro de outro sistema:

```text
?embed=1
```

o mapa entra no modo de integração.

Exemplo:

```text
?embed=1&grupo=ceus1&nivel=perimetro&nivel_travado=1
```

Esse é o formato utilizado pelo Dashboard Social.

---

## Filtros pela URL

### Grupo

```text
?grupo=ceus1
```

Múltiplos grupos podem ser informados:

```text
?grupo=ceus1,ceus2,parques1
```

---

### Local

```text
?grupo=ceus1&local=CEU Cidade Ademar
```

Múltiplos locais também podem ser enviados.

Exemplo:

```text
?grupo=ceus1&local=CEU Cidade Ademar,CEU Grajaú
```

---

### Região

```text
?regiao=Leste
```

---

### Subprefeitura

```text
?subprefeitura=Itaquera
```

---

### Distrito

```text
?distrito=Cidade Líder
```

---

### Bloco

```text
?grupo=ceus1&bloco=1
```

---

### Conjunto

```text
?grupo=dompedro&conjunto=4
```

---

### Estrutura

```text
?grupo=parques1&estrutura=Estacionamento
```

Os filtros podem aceitar valores separados por vírgula ou parâmetros repetidos, conforme o tipo de filtro.

---

## Exemplo para Dashboard

```text
https://mathh412.github.io/mapa/?embed=1&grupo=ceus1&nivel=perimetro&nivel_travado=1
```

Nesse modo:

```text
Dashboard
   │
   │ set-filters / focus-local
   ▼
Mapa
   │
   │ map-ready / seleção
   ▼
Dashboard
```

---

## Comunicação via `postMessage`

O mapa reconhece mensagens provenientes do dashboard.

Entre os tipos utilizados estão:

```text
ping
set-filter
set-filters
focus-local
clear-filter
clear-filters
```

O mapa também envia eventos de volta para a aplicação pai, incluindo:

```text
map-ready
```

A origem da mensagem é validada quando uma origem pai conhecida está configurada.

---

## Camadas analíticas

O `bridge-analitico.js` permite que outra aplicação adicione camadas no mesmo mapa Leaflet.

Exemplo conceitual:

```javascript
iframe.contentWindow.postMessage(
    {
        source: "spp-dashboard",
        type: "set-analysis-layer",
        layer: "buffer",
        tipo: "buffer",
        geojson: buffer
    },
    origem
);
```

Também é possível remover as camadas analíticas:

```text
clear-analysis-layers
```

Essa arquitetura permite que o mapa continue responsável pela geografia base enquanto o dashboard controla análises como:

- buffers;
- setores censitários;
- áreas de influência;
- perímetros destacados;
- resultados comparativos.

---

## Dados administrativos

A pasta:

```text
divisaoadm/
```

contém os limites administrativos utilizados pelo mapa.

```text
regioes.geojson
subprefeituras.geojson
distritos.geojson
```

---

## Organização dos grupos

Cada parceria ou conjunto de equipamentos possui uma pasta dentro de:

```text
grupos/
```

Exemplo:

```text
grupos/ceus1/
```

O arquivo obrigatório é:

```text
perimetros.geojson
```

Arquivos opcionais de divisões internas incluem:

```text
blocos.geojson
conjuntos.geojson
estruturas.geojson
```

Nem todos os grupos precisam possuir todos esses arquivos.

Por exemplo, atualmente `ceus1` possui:

```text
perimetros.geojson
blocos.geojson
```

Enquanto `dompedro` possui:

```text
perimetros.geojson
conjuntos.geojson
```

---

## Modelo do `perimetros.geojson`

Cada equipamento deve ser representado por uma `Feature`.

Exemplo:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": []
  },
  "properties": {
    "Equipamento": "Nome do equipamento",
    "distrito": "Distrito"
  }
}
```

Quando um equipamento possui diversas áreas físicas separadas, é recomendado agrupá-las na mesma `Feature` utilizando:

```text
MultiPolygon
```

---

## Divisões internas

Arquivos como:

```text
blocos.geojson
conjuntos.geojson
estruturas.geojson
```

devem possuir uma propriedade que permita identificar o equipamento ao qual pertencem.

Exemplo:

```json
{
  "properties": {
    "Equipamento": "CEU Cidade Ademar",
    "Bloco": "Bloco Educacional"
  }
}
```

O valor de:

```text
Equipamento
```

deve ser compatível com o valor existente no respectivo `perimetros.geojson`.

---

## Sistema de coordenadas

Os GeoJSONs utilizados no navegador devem estar em:

```text
EPSG:4326 / WGS84
```

As coordenadas GeoJSON seguem a ordem:

```text
[longitude, latitude]
```

Exemplo:

```text
[-46.6333, -23.5505]
```

---

## Como adicionar uma nova parceria

Crie:

```text
grupos/novogrupo/
```

Adicione:

```text
grupos/novogrupo/perimetros.geojson
```

Caso existam divisões internas:

```text
grupos/novogrupo/blocos.geojson
grupos/novogrupo/conjuntos.geojson
grupos/novogrupo/estruturas.geojson
```

O grupo passa a poder ser chamado pela URL:

```text
?grupo=novogrupo
```

Se o grupo também precisar aparecer no `DASHBOARD_SOCIAL`, ele deve ser adicionado ao catálogo:

```text
DASHBOARD_SOCIAL/js/parcerias.js
```

Exemplo:

```javascript
novogrupo: {
    nome: "Nova Parceria",
    arquivo: `${URL_BASE_MAPA}/novogrupo/perimetros.geojson`,
    categoria: "Categoria"
}
```

---

## Padrão visual SPP

As principais cores utilizadas são:

```text
Azul SPP:        #00506E
Azul secundário: #3B7D95
Cinza de fundo:  #F2F2F2
Laranja SPP:     #F08200
```

Os perímetros dos equipamentos utilizam o laranja SPP para diferenciá-los das demais informações territoriais.

As divisões internas permanecem em azul e utilizam o laranja como destaque durante interação.

---

## Executando localmente

Como a aplicação utiliza `fetch`, não é recomendado abrir diretamente o `index.html` pelo protocolo `file://`.

Utilize um servidor HTTP local.

Com Python:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

Exemplo:

```text
http://localhost:8000/?grupo=ceus1
```

Com nível fixo:

```text
http://localhost:8000/?grupo=ceus1&nivel=perimetro&nivel_travado=1
```

---

## Deploy

O projeto pode ser hospedado diretamente no GitHub Pages.

Versão publicada:

```text
https://mathh412.github.io/mapa/
```

Como os dados estão organizados em arquivos estáticos, não é necessário um backend para executar o mapa.

---

## Integração com o Dashboard Social

Repositório:

```text
https://github.com/mathh412/DASHBOARD_SOCIAL
```

O mapa funciona como a camada geográfica do dashboard.

A responsabilidade de cada projeto é separada:

```text
MAPA
├── divisões administrativas
├── equipamentos
├── perímetros
├── divisões internas
└── renderização Leaflet

DASHBOARD_SOCIAL
├── setores censitários
├── indicadores
├── buffers
├── análises territoriais
├── gráficos
└── comparação
```

A comunicação entre os dois ocorre por:

```text
iframe + window.postMessage()
```

---

## Observações para manutenção

Ao alterar o projeto:

- mantenha a ordem dos scripts do `index.html`;
- preserve os nomes dos arquivos GeoJSON;
- preserve o parâmetro `Equipamento` utilizado para relacionamento;
- utilize `MultiPolygon` quando um equipamento possuir áreas separadas;
- mantenha os nomes de grupo compatíveis com `DASHBOARD_SOCIAL/js/parcerias.js`;
- teste URLs com e sem `nivel_travado`;
- valide o mapa standalone e em modo `embed`.

---

Projeto desenvolvido para visualização e integração de informações geográficas relacionadas a parcerias, concessões e equipamentos do Município de São Paulo.
