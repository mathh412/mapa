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

Os arquivos obrigatórios são:

```text
config.json
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

## Catálogo central e novas parcerias

O mapa é a fonte única de parcerias. Os dois projetos consomem `grupos/catalogo.json`, gerado a partir dos `config.json`. Não edite o catálogo gerado nem cadastre parcerias no JavaScript do dashboard.

1. Crie `grupos/novaparceria/config.json`:

```json
{
  "codigo": "novaparceria",
  "nome": "Nova Parceria",
  "categoria": "Equipamentos",
  "ativo": true,
  "tipo": "unknown"
}
```

2. Adicione `perimetros.geojson` (FeatureCollection com pelo menos um equipamento para grupos ativos). Cada equipamento é uma Feature; use MultiPolygon para áreas separadas do mesmo equipamento. Preserve `Equipamento` e `distrito` nas propriedades e o vínculo das divisões internas.
3. Se existirem, adicione `blocos.geojson`, `conjuntos.geojson` e/ou `estruturas.geojson`.
4. Com Node.js 22 ou superior, execute na raiz do mapa:

```sh
node scripts/gerar-catalogo.mjs
node scripts/gerar-catalogo.mjs --check
```

O código deve coincidir com o nome da pasta e usar letras minúsculas, números, hífen ou sublinhado. `nome`, `categoria` e `ativo` são obrigatórios. `ativo: false` retira a parceria das duas aplicações após publicação. O campo opcional `tipo` escolhe o ícone: education, park, terminal, market, sport, cemetery, events, publicspace, housing ou unknown. Os tipos atuais foram preservados.

O gerador valida os JSONs e a estrutura básica dos GeoJSONs, lista os arquivos existentes em `arquivos` e produz saída determinística (sem datas variáveis). Não substitui uma validação topológica de polígonos. Pastas sem config, códigos divergentes e arquivos inválidos interrompem a geração. O mapa só solicita os arquivos listados, evitando 404 de opcionais ausentes. Catálogo e dados do mapa são lidos do mesmo site, permitindo testes locais por HTTP.

### Atualização automática e publicação

O workflow `.github/workflows/atualizar-catalogo.yml` executa na branch `main` quando mudam grupos, gerador, workflow ou arquivos do site, e também permite execução manual. Ele gera e valida o catálogo, salva apenas o catálogo quando mudou e publica o site completo no GitHub Pages. Não força push: se a branch avançar durante a execução, o push falha e deve-se executar novamente sobre a versão atual.

Antes de ativar esse fluxo, configure **Settings → Pages → Source → GitHub Actions**, permita ao workflow escrita em Contents e confira as regras da branch main e do ambiente github-pages. Regras que impedem commits do bot precisam ser compatibilizadas pelo mantenedor; não são contornadas pelo workflow.

O deploy ocorre explicitamente porque commits feitos com GITHUB_TOKEN não disparam outra compilação do Pages. Referências: [origem de publicação](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) e [workflows de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Publique o mapa e o catálogo antes de publicar a versão do dashboard que passa a consumi-lo. Depois, novas parcerias exigem alterações somente neste repositório. Elas aparecem no dashboard ao recarregar a página após a atualização do catálogo remoto; caches do provedor podem atrasar a propagação. Filtros de grupo na URL continuam limitando quais parcerias aparecem.

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
- mantenha codigo e pasta consistentes e regenere `grupos/catalogo.json`;
- teste URLs com e sem `nivel_travado`;
- valide o mapa standalone e em modo `embed`.

---

Projeto desenvolvido para visualização e integração de informações geográficas relacionadas a parcerias, concessões e equipamentos do Município de São Paulo.
