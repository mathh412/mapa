# Mapa Interativo de Parcerias e Equipamentos de São Paulo

Aplicação web para visualização geográfica de equipamentos, concessões, PPPs e demais projetos mapeados no município de São Paulo.

O mapa permite navegar pelas divisões administrativas da cidade até chegar aos equipamentos cadastrados, exibindo seus perímetros, informações gerais e, quando disponíveis, divisões internas como blocos, conjuntos e estruturas.

## Funcionalidades

- Navegação hierárquica por **Região → Subprefeitura → Distrito → Local → Perímetro → Divisões Internas**.
- Contagem de locais por região, subprefeitura e distrito.
- Exibição de pinos para os equipamentos existentes em cada distrito.
- Visualização do perímetro de cada equipamento.
- Exibição de informações como modalidade da concessão, concessionária, investimento, prazo, poder concedente e área.
- Suporte a divisões internas por:
  - Blocos;
  - Conjuntos;
  - Estruturas.
- Suporte a geometrias `Polygon` e `MultiPolygon`.
- Tooltips e popups interativos.
- Filtros por parâmetros na URL.
- Carregamento dos arquivos GeoJSON diretamente do repositório no GitHub.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- [Leaflet 1.9.4](https://leafletjs.com/)
- [Turf.js 6.5](https://turfjs.org/)
- GeoJSON
- Esri World Light Gray Base Map

## Estrutura do projeto

```text
mapa/
├── index.html
│
├── divisaoadm/
│   ├── regioes.geojson
│   ├── subprefeituras.geojson
│   └── distritos.geojson
│
└── grupos/
    ├── anhangabau/
    ├── anhembi/
    ├── baixoantartica/
    ├── baixolapa/
    ├── baixopompeia/
    ├── cemb1consolare/
    ├── cemb2cortel/
    ├── cemb3maya/
    ├── cemb4velar/
    ├── ceus1/
    ├── ceus2/
    ├── dompedro/
    ├── mercadopaulistanokinjo/
    ├── mercadosantoamaro/
    ├── pacaembu/
    ├── parques1/
    ├── parques3/
    ├── termleste/
    ├── termnoroeste/
    └── termsul/
```

Cada pasta dentro de `grupos/` representa um grupo de equipamentos ou parceria.

### Arquivos de cada grupo

O arquivo principal de cada grupo é:

```text
perimetros.geojson
```

Ele contém os equipamentos e seus respectivos perímetros.

Opcionalmente, um grupo pode possuir:

```text
blocos.geojson
conjuntos.geojson
estruturas.geojson
```

Esses arquivos são carregados automaticamente quando existem. A ausência de um deles não impede o funcionamento dos demais.

## Modelo dos perímetros

Cada equipamento deve ser representado por uma `Feature`.

Quando um equipamento possui mais de uma área separada, os polígonos devem ser agrupados dentro de um único `MultiPolygon`.

Exemplo simplificado:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": []
  },
  "properties": {
    "Equipamento": "Nome do equipamento",
    "Modalidade da Concessão": "Concessão",
    "Concessionária": "Nome da concessionária",
    "Investimento": 1000000,
    "Prazo da Concessão": 30,
    "Poder Concedente": "Órgão responsável",
    "Área": 10000
  }
}
```

### Sistema de coordenadas

Os arquivos utilizados pelo mapa devem estar em coordenadas geográficas compatíveis com o Leaflet:

```text
EPSG:4326 / WGS84
```

Na estrutura GeoJSON, os pontos seguem a ordem:

```text
[longitude, latitude]
```

Exemplo:

```text
[-46.6333, -23.5505]
```

## Navegação do mapa

A navegação ocorre em níveis:

```text
Regiões
   ↓
Subprefeituras
   ↓
Distritos
   ↓
Locais
   ↓
Perímetro
   ↓
Divisões Internas
```

As regiões, subprefeituras e distritos exibem a quantidade de equipamentos existentes dentro de cada polígono.

Ao selecionar um distrito, são apresentados os pinos dos equipamentos associados àquele local.

Ao selecionar um equipamento, seu perímetro é exibido. Caso existam blocos, conjuntos ou estruturas vinculados ao equipamento, eles podem ser acessados a partir do perímetro.

## Filtros pela URL

O mapa pode ser carregado já filtrado através de parâmetros na URL.

### Grupo

```text
?grupo=parques1
```

Também é possível utilizar:

```text
?grupos=parques1
```

### Local

```text
?grupo=parques1&local=Parque Ibirapuera
```

### Conjunto

```text
?grupo=dompedro&conjunto=4
```

O filtro de conjunto aceita o número, o nome completo ou o texto associado ao conjunto.

### Bloco

```text
?grupo=ceus1&bloco=1
```

### Estrutura

```text
?grupo=parques1&estrutura=Estacionamento
```

Os parâmetros também aceitam múltiplos valores separados por vírgula ou repetindo o parâmetro.

Exemplo:

```text
?grupo=dompedro&conjunto=2,4
```

## Como adicionar um novo grupo

Crie uma nova pasta dentro de:

```text
grupos/
```

Por exemplo:

```text
grupos/novogrupo/
```

Adicione obrigatoriamente:

```text
grupos/novogrupo/perimetros.geojson
```

E, se existirem divisões internas:

```text
grupos/novogrupo/blocos.geojson
grupos/novogrupo/conjuntos.geojson
grupos/novogrupo/estruturas.geojson
```

Depois, o grupo pode ser acessado diretamente pela URL:

```text
?grupo=novogrupo
```

Não é necessário cadastrar manualmente o grupo dentro do JavaScript: o código monta os caminhos dos arquivos a partir do valor informado no parâmetro `grupo`.

## Relação entre perímetros e divisões internas

Para que uma divisão interna seja vinculada ao perímetro correto, o valor da propriedade:

```text
Equipamento
```

deve ser o mesmo no `perimetros.geojson` e no respectivo arquivo de divisões internas.

Exemplo:

```json
{
  "properties": {
    "Estrutura": "Estacionamento",
    "Equipamento": "Parque Ibirapuera"
  }
}
```

## Executando localmente

Como o projeto carrega arquivos GeoJSON via requisições HTTP, é recomendado executar o projeto através de um servidor local.

Com Python:

```bash
python -m http.server 8000
```

Depois, acesse no navegador:

```text
http://localhost:8000
```

Para abrir um grupo diretamente:

```text
http://localhost:8000/?grupo=parques1
```

## Organização dos dados

A pasta `divisaoadm/` contém as divisões administrativas utilizadas na navegação:

- Regiões;
- Subprefeituras;
- Distritos.

A pasta `grupos/` contém os dados específicos dos projetos e equipamentos.

O `index.html` é responsável por carregar os arquivos, relacionar os equipamentos às divisões administrativas, contabilizar os locais, aplicar filtros e controlar toda a navegação e renderização do mapa.

## Observações

Os arquivos GeoJSON devem permanecer com nomes padronizados para que sejam encontrados automaticamente pelo mapa:

```text
perimetros.geojson
blocos.geojson
conjuntos.geojson
estruturas.geojson
```

Os três arquivos de divisões administrativas também devem manter seus nomes:

```text
regioes.geojson
subprefeituras.geojson
distritos.geojson
```

---

Projeto desenvolvido para visualização interativa de dados geográficos e equipamentos vinculados a parcerias e concessões do município de São Paulo.
