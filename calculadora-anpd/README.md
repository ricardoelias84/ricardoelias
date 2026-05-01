# Calculadora ANPD

Aplicação web estática da Active Solutions para simular uma estimativa técnica de multa administrativa com base na metodologia de dosimetria da Resolução CD/ANPD nº 4/2023.

Fonte oficial: [Resolução CD/ANPD nº 4/2023](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-regulamento-de-dosimetria/Resolucaon4CDANPD24.02.2023.pdf/view).

## Aviso de limitação

O resultado é uma estimativa técnica baseada nos dados informados pela pessoa usuária. A aplicação concreta de sanções depende de processo administrativo, contraditório, ampla defesa e decisão fundamentada da ANPD. A calculadora não substitui análise jurídica, parecer técnico ou decisão da autoridade.

## Como rodar localmente

Como a stack do site atual é HTML, CSS e JavaScript vanilla, a calculadora segue o mesmo padrão.

Opção direta:

```text
Abra calculadora-anpd/index.html no navegador.
```

Com servidor local:

```bash
cd C:\Users\Ricardo\Documents\NAVE
python -m http.server 8080
```

Depois acesse:

```text
http://localhost:8080/calculadora-anpd/
```

## Modo popup

Para usar a calculadora dentro de modal, popup ou iframe, abra a URL com `?popup=1`:

```text
http://localhost:8080/calculadora-anpd/?popup=1
```

Nesse modo, a calculadora remove o cabeçalho, o bloco inicial grande e o botão flutuante interno de WhatsApp, mantendo apenas o fluxo da simulação. A home do projeto já usa esse modo ao abrir a calculadora em modal e repassa automaticamente os parâmetros UTM presentes na URL principal.

Testes:

```bash
node --test calculadora-anpd\tests\*.test.js
```

## Estrutura do projeto

```text
calculadora-anpd/
  index.html
  styles.css
  src/
    app.js
    lib/
      dosimetry.js
  tests/
    dosimetry.test.js
  package.json
  README.md
```

O motor de cálculo fica isolado em `src/lib/dosimetry.js` e expõe funções puras como `calculateBaseAliquot`, `calculateRawFine`, `calculateFinalFine` e `calculateDosimetry`.

## Fórmulas utilizadas

Para pessoa jurídica com faturamento:

```text
A_base = ((A2 - A1) / 3) * GD + A1
V_base = A_base * (Faturamento - Tributos)
```

Alíquotas:

```text
Leve:  A1 = 0,08% | A2 = 0,15%
Média: A1 = 0,13% | A2 = 0,50%
Grave: A1 = 0,45% | A2 = 1,50%
```

Para pessoa natural ou pessoa jurídica sem faturamento:

```text
V_base = ((V2 - V1) / 3) * GD + V1
```

Valores absolutos:

```text
Leve:  V1 = R$ 1.500,00 | V2 = R$ 3.500,00
Média: V1 = R$ 3.000,00 | V2 = R$ 7.000,00
Grave: V1 = R$ 6.750,00 | V2 = R$ 15.750,00
```

Ajustes:

```text
V_multa = V_base * (1 + Agravantes - Atenuantes)
```

Se o fator final ficar abaixo de zero, a calculadora considera zero antes da aplicação dos limites e exibe alerta.

Limites:

```text
V_min = maior valor entre o mínimo da tabela e o dobro da vantagem econômica, quando estimável.
V_max = menor valor entre 2% do faturamento excluídos tributos e R$ 50.000.000,00.
```

Na versão atual, o teto `V_max` é aplicado quando há faturamento informado. Para pessoa natural ou pessoa jurídica sem faturamento, o limite máximo aparece como não aplicável nesta simulação, porque a especificação desta entrega trouxe apenas os mínimos para esse caminho.

## RD Station Marketing

O código de monitoramento solicitado foi instalado em `index.html`, antes de `</body>`:

```html
<script
  type="text/javascript"
  async
  src="https://d335luupugsy2.cloudfront.net/js/loader-scripts/82ca99f2-7497-4895-bf31-a34c50722113-loader.js"
></script>
```

A configuração fica em `window.CALCULADORA_ANPD_CONFIG`, dentro de `index.html`:

```js
window.CALCULADORA_ANPD_CONFIG = {
  specialistWhatsApp: '5511991559361',
  rdAdapterUrl: '',
  rdStationToken: '',
  rdStationEndpoint: 'https://api.rd.services/platform/contacts',
  rdFieldsEndpoint: 'https://api.rd.services/platform/contacts/fields',
  rdEnsureCustomFields: false,
  sendExactRevenueToRd: false,
  productEventHook: '',
};
```

Recomendação de produção: usar `rdAdapterUrl` com um endpoint server-side. Evite expor tokens sensíveis no navegador.

## Campos personalizados mínimos no RD

Crie apenas estes campos personalizados:

```text
cf_tipo_organizacao_avaliada
cf_faixa_faturamento
cf_classificacao_cenario
cf_grau_dano
cf_percentual_agravantes
cf_percentual_atenuantes
cf_valor_final_estimado
cf_landing_page_origem
cf_utm_source
cf_utm_medium
cf_utm_campaign
cf_utm_term
cf_utm_content
```

## Dados enviados ao RD

Dados de contato:

```text
Nome
Email
WhatsApp
Empresa
Cargo
```

Resumo mínimo da simulação:

```text
Tipo da organização avaliada
Faixa de faturamento
Classificação do cenário
Grau do dano
Percentual total de agravantes
Percentual total de atenuantes
Valor final estimado da multa
Data e hora da simulação
```

Origem:

```text
landing_page_origem = calculadora-anpd
utm_source
utm_medium
utm_campaign
utm_term
utm_content
referrer
URL da página com apenas parâmetros UTM preservados
```

## Dados não enviados ao RD por minimização

```text
Tributos informados
Vantagem econômica exata
Memória completa detalhada
Descrição livre do caso
Dados pessoais de titulares
Dados sensíveis
CPF, RG ou documentos pessoais
Nome de vítimas ou titulares envolvidos
Bases de dados afetadas
Logs
Evidências
Arquivos
Informações confidenciais sobre falhas, vulnerabilidades ou incidentes reais
```

O faturamento exato é usado apenas localmente no navegador. O RD recebe a faixa:

```text
Até R$ 360 mil
De R$ 360 mil a R$ 4,8 milhões
De R$ 4,8 milhões a R$ 30 milhões
De R$ 30 milhões a R$ 300 milhões
Acima de R$ 300 milhões
Não informado / não aplicável
```

Se uma integração técnica exigir envio do faturamento exato, altere `sendExactRevenueToRd` para `true`. O padrão é `false`.

## Captura de UTMs

Os parâmetros abaixo são lidos da URL no carregamento da página:

```text
utm_source
utm_medium
utm_campaign
utm_term
utm_content
```

Eles são gravados em campos ocultos do formulário junto com:

```text
landing_page_origem
referrer
```

O valor de `landing_page_origem` é sempre `calculadora-anpd`.

## WhatsApp

O botão flutuante usa:

```text
Número: 11991559361
URL: https://wa.me/5511991559361?text=Ol%C3%A1%21%20Estou%20usando%20a%20calculadora%20de%20dosimetria%20da%20ANPD%20e%20gostaria%20de%20ajuda%20para%20entender%20melhor%20o%20resultado.
```

Para alterar o número, edite `specialistWhatsApp` em `index.html`.

## Aviso de privacidade

O texto fica em `renderPrivacyNoticeCard()` dentro de `src/app.js`. Alterações devem manter:

```text
Aviso antes da primeira etapa
Linguagem neutra
Orientação para não inserir dados sensíveis ou detalhes confidenciais
Limitação jurídica clara
Botão de aceite
Botão para falar com especialista
```

## Como desligar ou alterar campos enviados ao RD

Para desligar o envio:

```js
rdAdapterUrl: '',
rdStationToken: '',
```

Para alterar campos enviados, revise apenas:

```text
buildLeadPayload()
buildRdContactPayload()
RD_CUSTOM_FIELDS
```

Mantenha o princípio de minimização: não adicione campos livres, documentos, evidências, dados sensíveis ou informações confidenciais.

## Próximos passos sugeridos

- Validar a interpretação jurídica das fórmulas com especialista.
- Implementar um endpoint server-side para `rdAdapterUrl`.
- Conectar o envio ao banner de cookies caso o site passe a bloquear scripts de marketing até consentimento.
- Adicionar testes de interface com navegador quando houver pipeline de frontend.
