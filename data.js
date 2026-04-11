(function () {
  const scoreMap = { A: 0, B: 1, C: 2, D: 3, E: 4 };

  const runtimeDefaults = {
    rdAdapterUrl: '',
    specialistWhatsApp: '5511991559361',
    rdSource: 'NAVE',
    rdTag: 'nave-assessment',
    appVersion: '2.3.0',
  };

  window.NAVE_RUNTIME_CONFIG = {
    ...runtimeDefaults,
    ...(window.NAVE_RUNTIME_CONFIG || {}),
  };

  const functionOrder = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];

  const functions = [
    {
      key: 'GV',
      code: 'GV',
      label: 'Governar',
      missionLabel: 'Missão 1',
      shortLabel: 'Governança',
      heroTitle: 'Governança que orienta risco, prioridade e decisão.',
      heroText:
        'Aqui a jornada mede se segurança e privacidade já influenciam estratégia, exceções, terceiros e prestação de contas executiva.',
      guidance:
        'As respostas mais maduras desta missão costumam mostrar dono, critério, cadência, registro e aprendizado.',
      accent: '#0061a6',
      accentSoft: 'rgba(105, 175, 254, 0.18)',
      glow: 'rgba(0, 97, 166, 0.22)',
    },
    {
      key: 'ID',
      code: 'ID',
      label: 'Identificar',
      missionLabel: 'Missão 2',
      shortLabel: 'Visibilidade',
      heroTitle: 'Visibilidade clara antes da proteção.',
      heroText:
        'Sem inventário, criticidade, mapa de dados e leitura de exposição, o negócio fica cego para o que realmente precisa proteger primeiro.',
      guidance:
        'O foco aqui é provar que ativos, dados, terceiros e superfícies expostas são conhecidos e priorizados.',
      accent: '#0f88b7',
      accentSoft: 'rgba(15, 136, 183, 0.16)',
      glow: 'rgba(15, 136, 183, 0.2)',
    },
    {
      key: 'PR',
      code: 'PR',
      label: 'Proteger',
      missionLabel: 'Missão 3',
      shortLabel: 'Controles',
      heroTitle: 'Controles que evitam abuso e reduzem impacto.',
      heroText:
        'Esta missão avalia se identidade, acesso, hardening, aplicações e exposição externa já operam com disciplina consistente.',
      guidance:
        'Maturidade forte aparece quando privilégio mínimo, padrões de publicação, MFA e patching deixam de depender de heróis.',
      accent: '#00a676',
      accentSoft: 'rgba(0, 166, 118, 0.15)',
      glow: 'rgba(0, 166, 118, 0.2)',
    },
    {
      key: 'DE',
      code: 'DE',
      label: 'Detectar',
      missionLabel: 'Missão 4',
      shortLabel: 'Detecção',
      heroTitle: 'Sinais certos, lidos no tempo certo.',
      heroText:
        'A diferença entre perceber cedo e perceber tarde muda totalmente o custo, a extensão e a pressão de um incidente.',
      guidance:
        'O objetivo é medir rastreabilidade, cobertura, correlação e a capacidade real de transformar eventos em ação.',
      accent: '#38bdf8',
      accentSoft: 'rgba(56, 189, 248, 0.14)',
      glow: 'rgba(56, 189, 248, 0.2)',
    },
    {
      key: 'RS',
      code: 'RS',
      label: 'Responder',
      missionLabel: 'Missão 5',
      shortLabel: 'Resposta',
      heroTitle: 'Resposta coordenada sob pressão.',
      heroText:
        'Incidentes exigem papéis claros, registros confiáveis, decisões rápidas e comunicação madura com negócio, terceiros e privacidade.',
      guidance:
        'As melhores respostas mostram playbooks, comitê, evidência preservada e menos improviso nas primeiras horas.',
      accent: '#ff8a3d',
      accentSoft: 'rgba(255, 138, 61, 0.16)',
      glow: 'rgba(255, 138, 61, 0.18)',
    },
    {
      key: 'RC',
      code: 'RC',
      label: 'Recuperar',
      missionLabel: 'Missão 6',
      shortLabel: 'Recuperação',
      heroTitle: 'Retomada segura, testada e previsível.',
      heroText:
        'Recuperar não é apenas voltar a funcionar: é restaurar com prioridade, critério, segurança mínima e continuidade do negócio.',
      guidance:
        'A maturidade aparece quando backup, contingência e retorno seguro são testados e orientam decisão executiva.',
      accent: '#d6a53d',
      accentSoft: 'rgba(214, 165, 61, 0.16)',
      glow: 'rgba(214, 165, 61, 0.18)',
    },
  ];

  const functionUx = {
    GV: {
      executiveTitle: 'Decisao, risco e direcao clara',
      executiveSubtitle: 'Como a lideranca transforma seguranca e privacidade em prioridade de negocio.',
      rewardTitle: 'Direcao executiva destravada',
      rewardText:
        'Cada resposta desta missao ajuda o relatorio a distinguir intencao, disciplina real e capacidade de decisao sob risco.',
      supportPrompt:
        'Se existir duvida aqui, CEO, CIO, juridico, risco e governanca costumam ser as melhores fontes.',
      heroBadge: 'Rota Estrategica',
      heroSignal: 'alinhamento real',
      visualVariant: 'orbits',
    },
    ID: {
      executiveTitle: 'Clareza sobre o que realmente importa',
      executiveSubtitle: 'Visibilidade de ativos, dados, terceiros e exposicao antes que o risco surpreenda.',
      rewardTitle: 'Mapa critico em construcao',
      rewardText:
        'Ao avancar nesta missao, o relatorio comeca a separar ruido de ativos realmente relevantes para a operacao.',
      supportPrompt:
        'Aqui normalmente ajudam CIO, seguranca, infraestrutura, donos de sistema e quem conhece os dados criticos.',
      heroBadge: 'Radar Ativo',
      heroSignal: 'visibilidade crescente',
      visualVariant: 'grid',
    },
    PR: {
      executiveTitle: 'Controles que reduzem atrito e exposicao',
      executiveSubtitle: 'Identidade, acesso, hardening e publicacao segura com menos improviso operacional.',
      rewardTitle: 'Base de protecao consolidada',
      rewardText:
        'Quanto mais respostas reais surgem aqui, mais facil fica provar onde ha padrao e onde ainda existe dependencia de esforco manual.',
      supportPrompt:
        'Seguranca, infraestrutura, redes, cloud, identidade e aplicacoes costumam responder melhor em conjunto.',
      heroBadge: 'Escudo Operacional',
      heroSignal: 'protecao ativa',
      visualVariant: 'layers',
    },
    DE: {
      executiveTitle: 'Sinais uteis antes do dano aumentar',
      executiveSubtitle: 'Deteccao, rastreabilidade e leitura operacional para perceber cedo e agir melhor.',
      rewardTitle: 'Visao antecipada liberada',
      rewardText:
        'Cada checkpoint concluido melhora a leitura sobre o tempo de percepcao e a confiabilidade da evidencia operacional.',
      supportPrompt:
        'Seguranca, SOC, operacoes e infraestrutura normalmente trazem a visao mais confiavel aqui.',
      heroBadge: 'Pulso de Sinais',
      heroSignal: 'deteccao acionavel',
      visualVariant: 'signals',
    },
    RS: {
      executiveTitle: 'Resposta coordenada sob pressao',
      executiveSubtitle: 'Papeis, comunicacao, contencao e decisao para reduzir impacto nas primeiras horas.',
      rewardTitle: 'Sala de crise organizada',
      rewardText:
        'Quando esta missao avanca, o relatorio passa a mostrar quanto da resposta depende de preparo e quanto ainda depende de improviso.',
      supportPrompt:
        'Seguranca, lideranca executiva, juridico, comunicacao e privacidade costumam ser decisivos para responder esta parte.',
      heroBadge: 'Comando de Resposta',
      heroSignal: 'prontidao real',
      visualVariant: 'command',
    },
    RC: {
      executiveTitle: 'Retorno seguro sem escuro operacional',
      executiveSubtitle: 'Backup, continuidade e retomada com prioridade, criterio e previsibilidade.',
      rewardTitle: 'Retomada mais previsivel',
      rewardText:
        'Responder esta missao ajuda o relatorio a estimar se a empresa volta rapido por evidencia ou por esperanca.',
      supportPrompt:
        'Infraestrutura, continuidade, operacoes e lideranca do negocio costumam trazer a visao mais completa aqui.',
      heroBadge: 'Retorno Confiavel',
      heroSignal: 'continuidade sustentada',
      visualVariant: 'continuity',
    },
  };

  functions.forEach((item) => {
    Object.assign(item, functionUx[item.key] || {});
  });

  const functionServiceMap = {
    GV: ['securityGovernance', 'privacyGovernance', 'awareness'],
    ID: ['assetManagement', 'threatExposure', 'securityAssessment'],
    PR: ['endpointSecurity', 'networkSecurity', 'cloudSecurity', 'applicationSecurity', 'iam'],
    DE: ['soc', 'siem'],
    RS: ['incidentResponse', 'crisisManagement'],
    RC: ['backupRecovery', 'businessContinuity'],
  };

  const capabilities = [
    {
      key: 'access-protection',
      label: 'Proteção de acesso',
      shortLabel: 'Acesso',
      badge: 'Guardião do Acesso',
      description: 'MFA, menor privilégio, exceções, JML e proteção de acessos sensíveis.',
      serviceKeys: ['iam', 'securityGovernance'],
    },
    {
      key: 'monitoring-traceability',
      label: 'Monitoramento e rastreabilidade',
      shortLabel: 'Monitoramento',
      badge: 'Olho de Águia',
      description: 'Logs, correlação, preservação de evidência e leitura operacional do incidente.',
      serviceKeys: ['soc', 'siem'],
    },
    {
      key: 'hardening-updates',
      label: 'Hardening e atualização',
      shortLabel: 'Hardening',
      badge: 'Imunizador',
      description: 'Patching, baselines, verificação de correção e postura mínima segura.',
      serviceKeys: ['securityAssessment', 'endpointSecurity', 'networkSecurity', 'cloudSecurity'],
    },
    {
      key: 'critical-identity',
      label: 'Proteção de identidade crítica',
      shortLabel: 'Identidade crítica',
      badge: 'Coroa Protegida',
      description: 'Contas privilegiadas, segredos críticos e pontos de domínio com proteção reforçada.',
      serviceKeys: ['iam', 'securityGovernance'],
    },
    {
      key: 'external-exposure',
      label: 'Governança de exposição externa',
      shortLabel: 'Exposição externa',
      badge: 'Perímetro Inteligente',
      description: 'Perímetro, regras, ativos publicados e redução disciplinada da superfície de ataque.',
      serviceKeys: ['threatExposure', 'networkSecurity', 'applicationSecurity', 'securityAssessment'],
    },
    {
      key: 'application-security',
      label: 'Segurança de aplicação',
      shortLabel: 'AppSec',
      badge: 'App Seguro',
      description: 'Segurança no ciclo de vida de aplicações, APIs e superfícies web publicadas.',
      serviceKeys: ['applicationSecurity', 'securityAssessment'],
    },
    {
      key: 'personal-data-governance',
      label: 'Governança de dados pessoais',
      shortLabel: 'Privacidade',
      badge: 'Dados no Lugar',
      description: 'Mapeamento, minimização, resposta a titulares e governança operacional de privacidade.',
      serviceKeys: ['privacyGovernance', 'awareness'],
    },
    {
      key: 'third-party-response',
      label: 'Governança de terceiros e resposta',
      shortLabel: 'Terceiros',
      badge: 'Terceiros Sob Controle',
      description: 'Due diligence, cláusulas, SLAs, crise com fornecedores e coordenação de resposta.',
      serviceKeys: ['securityGovernance', 'privacyGovernance', 'incidentResponse', 'crisisManagement', 'businessContinuity'],
    },
  ];

  const capabilityAlias = Object.fromEntries(capabilities.map((item) => [item.label, item.key]));

  const services = {
    securityGovernance: {
      key: 'securityGovernance',
      name: 'Governança de Segurança',
      area: 'Govern',
      summary:
        'Estrutura segurança como função de negócio, conectando risco, estratégia, políticas aplicáveis e plano diretor.',
      description:
        'A Active Solutions organiza a governança prática de segurança para tirar a operação do modo reativo e criar um sistema contínuo de decisão, priorização e controle.',
      pain:
        'Segurança fragmentada, reativa e sem critério de priorização gera gasto mal direcionado, baixa eficácia e exposição real ao risco.',
      deliverables: [
        'Plano diretor e agenda de evolução por risco',
        'Políticas aplicáveis com papéis e exceções claras',
        'Modelo executivo de decisão e indicadores',
      ],
      contactPitch:
        'Ideal para empresas que precisam sair do improviso e transformar segurança em pauta executiva consistente.',
    },
    privacyGovernance: {
      key: 'privacyGovernance',
      name: 'Governança de Privacidade',
      area: 'Govern',
      summary:
        'Conecta conformidade, risco e operação para dar visibilidade real sobre o ciclo de vida dos dados pessoais.',
      description:
        'Vai além de adequação formal e transforma exigências legais em processos práticos, mensuráveis e integrados à tomada de decisão.',
      pain:
        'Dados pessoais tratados sem controle e sem visibilidade ampliam risco regulatório, reputacional e decisões sem clareza de impacto.',
      deliverables: [
        'Mapa de dados, ROPA e leitura operacional de risco',
        'Fluxos para retenção, bases legais e atendimento a titulares',
        'Governança contínua de privacidade com integração ao negócio',
      ],
      contactPitch:
        'Perfeito para estruturar privacidade como operação viva, e não como projeto pontual.',
    },
    awareness: {
      key: 'awareness',
      name: 'Conscientização (SBCP)',
      area: 'Govern',
      summary:
        'Programa contínuo de comportamento seguro com campanhas, simulações e reforço de cultura.',
      description:
        'A abordagem da Active transforma segurança em hábito operacional com estímulos direcionados e mensuração de evolução.',
      pain:
        'Sem intervenção estruturada, os erros se repetem mesmo com boa tecnologia e mantêm a organização exposta.',
      deliverables: [
        'Campanhas contínuas e trilhas segmentadas',
        'Simulações de phishing e medições de evolução',
        'Plano de reforço de cultura para segurança e privacidade',
      ],
      contactPitch:
        'Excelente para reduzir o risco humano sem infantilizar a experiência da organização.',
    },
    assetManagement: {
      key: 'assetManagement',
      name: 'Gestão de Ativos',
      area: 'Identify',
      summary:
        'Cria visibilidade contínua sobre ativos, donos, criticidade e relações operacionais.',
      description:
        'Vai além do inventário estático, identificando ativos desconhecidos, shadow IT e dependências que impactam o negócio.',
      pain:
        'Sem visibilidade, ativos críticos ficam expostos sem controle e criam pontos cegos exploráveis antes mesmo de serem percebidos.',
      deliverables: [
        'Inventário com criticidade e ownership',
        'Leitura de ciclo de vida, lacunas e ativos desconhecidos',
        'Base para priorização de proteção e recuperação',
      ],
      contactPitch:
        'É o melhor começo quando a empresa ainda não consegue responder o que realmente não pode parar.',
    },
    threatExposure: {
      key: 'threatExposure',
      name: 'Gestão de Riscos e Exposição a Ameaças',
      area: 'Identify',
      summary:
        'Relaciona vulnerabilidades, superfície de ataque e contexto operacional para priorização acionável.',
      description:
        'A Active correlaciona exposição, criticidade e impacto de negócio para focar energia onde a redução de risco é real.',
      pain:
        'Excesso de vulnerabilidades sem critério drena esforço enquanto exposições realmente críticas continuam abertas.',
      deliverables: [
        'Prioridade baseada em probabilidade, impacto e exposição',
        'Backlog acionável de redução de risco',
        'Leitura executiva da superfície de ataque',
      ],
      contactPitch:
        'Ideal para transformar volume bruto de achados em um plano claro de ação.',
    },
    securityAssessment: {
      key: 'securityAssessment',
      name: 'Avaliação de Segurança',
      area: 'Identify',
      summary:
        'Combina análise técnica e validação prática para separar falha teórica de risco concreto.',
      description:
        'Integra scans, validação ofensiva e evidência técnica para ajudar a empresa a corrigir primeiro o que realmente pode ser explorado.',
      pain:
        'Sem validação prática, vulnerabilidades são tratadas de forma genérica e falhas exploráveis permanecem abertas.',
      deliverables: [
        'Scan e leitura priorizada de vulnerabilidades',
        'Validação ofensiva em cenários reais de ataque',
        'Recomendação prática de correção com evidência',
      ],
      contactPitch:
        'Perfeito para transformar percepção de risco em prova concreta e plano de correção.',
    },
    endpointSecurity: {
      key: 'endpointSecurity',
      name: 'Segurança de Endpoints',
      area: 'Protect',
      summary:
        'Detecção comportamental e resposta automática para conter abuso, malware e movimentação lateral.',
      description:
        'Vai além do antivírus tradicional e foca em perceber atividade maliciosa mesmo sem assinatura conhecida.',
      pain:
        'Grande parte dos ataques começa no endpoint e evolui sem ser percebida até que o impacto já esteja em curso.',
      deliverables: [
        'Cobertura comportamental para estações e servidores',
        'Resposta automatizada e investigação de atividades suspeitas',
        'Ajuste contínuo para reduzir ruído e melhorar eficácia',
      ],
      contactPitch:
        'Excelente quando a prioridade é diminuir tempo entre comportamento suspeito e ação efetiva.',
    },
    networkSecurity: {
      key: 'networkSecurity',
      name: 'Segurança de Redes',
      area: 'Protect',
      summary:
        'Segmentação, arquitetura segura, revisão de regras e controle de tráfego para reduzir exposição.',
      description:
        'A rede passa a operar como camada de contenção e controle, dificultando propagação de ataque e ampliando visibilidade.',
      pain:
        'Sem controle de rede, um acesso inicial se espalha rapidamente e amplia o impacto de qualquer incidente.',
      deliverables: [
        'Arquitetura segura com segmentação e DMZ',
        'Revisão de regras, acessos remotos e exposição externa',
        'Contenção de movimentação lateral',
      ],
      contactPitch:
        'Muito aderente quando o ambiente precisa reduzir superfície de ataque e permissões antigas.',
    },
    cloudSecurity: {
      key: 'cloudSecurity',
      name: 'Segurança de Nuvens',
      area: 'Protect',
      summary:
        'Protege ambientes cloud com foco em configuração, identidade, workloads e postura contínua.',
      description:
        'A Active integra visibilidade, controle e resposta para impedir que exposições em cloud avancem sem percepção.',
      pain:
        'Erros de configuração e permissões excessivas seguem entre as principais causas de exposição em cloud.',
      deliverables: [
        'Monitoramento contínuo de postura de segurança em nuvem',
        'Proteção de workloads e leitura de configurações críticas',
        'Redução de exposição em ambientes multi-cloud',
      ],
      contactPitch:
        'Indicado para empresas com crescimento cloud acelerado e necessidade de governança operacional.',
    },
    applicationSecurity: {
      key: 'applicationSecurity',
      name: 'Segurança de Aplicações',
      area: 'Protect',
      summary:
        'Integra segurança ao ciclo de desenvolvimento, publicação e operação de aplicações.',
      description:
        'A solução antecipa risco desde o código até a produção, conectando dependências, configurações e postura de segurança.',
      pain:
        'Vulnerabilidades criadas no desenvolvimento entram em produção sem controle e ampliam a superfície de ataque.',
      deliverables: [
        'Padrões de segurança no ciclo de desenvolvimento',
        'Validação contínua de aplicações e APIs publicadas',
        'Redução de falhas antes que avancem para produção',
      ],
      contactPitch:
        'Muito útil quando o assessment mostra exposição pública, APIs críticas ou gaps de publicação segura.',
    },
    iam: {
      key: 'iam',
      name: 'Gerenciamento de Identidade e Acesso',
      area: 'Protect',
      summary:
        'Trata identidade como perímetro com MFA, RBAC, PAM, NAC e proteção de privilégios.',
      description:
        'A Active estrutura governança contínua sobre quem acessa o quê, em que condições e com qual risco.',
      pain:
        'Credenciais comprometidas são um dos vetores mais recorrentes de ataque e levam o invasor direto a sistemas críticos.',
      deliverables: [
        'Cobertura de MFA, RBAC e revisão de acessos sensíveis',
        'Proteção de contas privilegiadas e segredos críticos',
        'Modelo contínuo para JML, exceções e menor privilégio',
      ],
      contactPitch:
        'É a recomendação mais forte quando o risco está concentrado em acessos, identidade crítica e privilégios.',
    },
    soc: {
      key: 'soc',
      name: 'SOC',
      area: 'Detect',
      summary:
        'Monitoramento, detecção e resposta em tempo real com inteligência de ameaças e profundidade operacional.',
      description:
        'Mais do que reagir, o SOC antecipa, investiga e neutraliza ataques com contexto e velocidade.',
      pain:
        'Ataques evoluem em minutos. Sem monitoramento ativo e resposta coordenada, a defesa sempre chega atrasada.',
      deliverables: [
        'Monitoramento contínuo com analistas e inteligência',
        'Casos de uso acionáveis para investigação e resposta',
        'Operação com foco em tempo de detecção e contenção',
      ],
      contactPitch:
        'Indispensável quando a empresa precisa enxergar antes do dano e responder em tempo real.',
    },
    siem: {
      key: 'siem',
      name: 'SIEM',
      area: 'Detect',
      summary:
        'Centraliza e correlaciona eventos para transformar logs dispersos em inteligência acionável.',
      description:
        'Organiza fontes, contexto e relatórios para apoiar detecção, investigação e compliance com evidência consistente.',
      pain:
        'Logs dispersos e sem contexto atrasam investigação e impedem detecção eficiente.',
      deliverables: [
        'Centralização e correlação de eventos críticos',
        'Melhoria da rastreabilidade para resposta e auditoria',
        'Base consistente para investigação e métricas operacionais',
      ],
      contactPitch:
        'Excelente quando o assessment revela baixa rastreabilidade, retenção fraca ou dificuldade de reconstruir incidentes.',
    },
    incidentResponse: {
      key: 'incidentResponse',
      name: 'Resposta a Incidentes',
      area: 'Respond',
      summary:
        'Atuação coordenada para conter, investigar e responder a incidentes com profundidade técnica, forense e privacidade.',
      description:
        'Integra segurança, forense e privacidade para restaurar operação e reduzir impacto regulatório, financeiro e reputacional.',
      pain:
        'Sem resposta estruturada, incidentes escalam, ampliam o dano e expõem a empresa a riscos legais e financeiros.',
      deliverables: [
        'Playbooks e contenção técnica sob pressão',
        'Investigação com preservação de evidências',
        'Apoio a incidentes com dados pessoais e tomada de decisão crítica',
      ],
      contactPitch:
        'A escolha certa quando o assessment mostra improviso nas primeiras horas de um incidente.',
    },
    crisisManagement: {
      key: 'crisisManagement',
      name: 'Gestão de Crise',
      area: 'Respond',
      summary:
        'Orquestra liderança, jurídico, comunicação e tecnologia em eventos críticos.',
      description:
        'Ajuda a empresa a decidir rápido, comunicar com clareza e reduzir desencontro entre áreas durante a crise.',
      pain:
        'Sem coordenação, a crise escala, decisões se desencontram e o dano reputacional e financeiro se amplifica.',
      deliverables: [
        'Modelo de comitê de crise e papéis executivos',
        'Planos de comunicação e apoio à decisão',
        'Exercícios e evolução pós-incidente',
      ],
      contactPitch:
        'Muito aderente para empresas que precisam responder não só tecnicamente, mas também executivamente.',
    },
    backupRecovery: {
      key: 'backupRecovery',
      name: 'Backup e Recuperação',
      area: 'Recover',
      summary:
        'Estrutura RPO, RTO, testes e rotina de restauração previsível para ambientes críticos.',
      description:
        'A Active desenha e valida estratégias de recuperação para garantir retomada rápida, confiável e com evidência.',
      pain:
        'Sem recuperação confiável, um incidente vira parada total do negócio, com perda de dados e impacto financeiro direto.',
      deliverables: [
        'Estratégia de backup com testes periódicos de restauração',
        'Definição de RPO e RTO alinhada ao negócio',
        'Retorno seguro com critérios e evidência de validação',
      ],
      contactPitch:
        'Essencial quando a empresa já tem backup, mas ainda não confia plenamente na recuperação.',
    },
    businessContinuity: {
      key: 'businessContinuity',
      name: 'Plano de Continuidade de Negócios',
      area: 'Recover',
      summary:
        'Define estratégias e processos para manter operações críticas mesmo em cenários severos.',
      description:
        'Com base em BIA, prioridades, RTO e RPO, a Active estrutura continuidade como decisão de negócio e não só tecnologia.',
      pain:
        'Sem planejamento, qualquer incidente interrompe operações e gera perdas financeiras e reputacionais relevantes.',
      deliverables: [
        'BIA e priorização de serviços críticos',
        'Plano de contingência com dependências, SLAs e critérios de retomada',
        'Testes periódicos de continuidade e melhoria contínua',
      ],
      contactPitch:
        'Recomendado quando o desafio está em decidir ordem de recuperação e manter o negócio funcionando sob crise.',
    },
  };

  const answerScale = {
    A: { letter: 'A', label: 'Ausente', tone: 'critical' },
    B: { letter: 'B', label: 'Reativo', tone: 'warning' },
    C: { letter: 'C', label: 'Base real', tone: 'mid' },
    D: { letter: 'D', label: 'Consistente', tone: 'strong' },
    E: { letter: 'E', label: 'Adaptativo', tone: 'strong' },
  };

  const questionRows = [
    [
      "Q01",
      "GV",
      "Prote\u00e7\u00e3o de acesso; Governan\u00e7a de dados pessoais; Governan\u00e7a de terceiros e resposta",
      "Cen\u00e1rio",
      "Qual frase descreve melhor como Seguran\u00e7a e Privacidade entram na estrat\u00e9gia do neg\u00f3cio (n\u00e3o s\u00f3 na TI)?",
      [
        "Reativo (s\u00f3 quando d\u00e1 problema/auditoria).",
        "Inten\u00e7\u00e3o com regras irregulares.",
        "Direcionamento claro e objetivos m\u00ednimos.",
        "Integrado a decis\u00f5es de produto/mercado/terceiros.",
        "Integrado + metas/indicadores e revis\u00e3o executiva."
      ],
      3,
      "Atas/pauta executiva; OKRs/KPIs; or\u00e7amento priorizado por risco; pol\u00edtica aprovada e comunicada.",
      "FR+CA+CL"
    ],
    [
      "Q02",
      "GV",
      "Governan\u00e7a de terceiros e resposta; Governan\u00e7a de dados pessoais",
      "Dono",
      "Quando h\u00e1 um risco relevante (novo fornecedor com dados pessoais / acesso remoto liberado), quem tem autoridade clara para dizer \u201csim\u201d, \u201cn\u00e3o\u201d ou \u201csim, com condi\u00e7\u00f5es\u201d?",
      [
        "N\u00e3o \u00e9 claro.",
        "TI decide sem crit\u00e9rios e sem registro.",
        "Respons\u00e1vel/f\u00f3rum e crit\u00e9rios gerais; decis\u00f5es registradas.",
        "Decis\u00e3o considera neg\u00f3cio + risco e envolve \u00e1reas certas.",
        "Exce\u00e7\u00f5es com prazo/compensa\u00e7\u00f5es + rastro e aprendizado."
      ],
      2,
      "RACI; pol\u00edtica de exce\u00e7\u00f5es; workflow/tickets/atas de decis\u00e3o.",
      "CA+FR"
    ],
    [
      "Q03",
      "GV, ID",
      "Governan\u00e7a de terceiros e resposta; Prote\u00e7\u00e3o de acesso; Governan\u00e7a de dados pessoais",
      "Frequ\u00eancia",
      "Com que frequ\u00eancia a empresa revisa (e reprioriza) seus principais riscos digitais (ciber + privacidade) e planos de a\u00e7\u00e3o?",
      [
        "N\u00e3o revisa.",
        "S\u00f3 ap\u00f3s incidente/auditoria/exig\u00eancia.",
        "Eventual, sem cad\u00eancia forte.",
        "Cad\u00eancia definida e acompanhamento.",
        "Cad\u00eancia + ajuste por sinais/indicadores e melhoria cont\u00ednua."
      ],
      2,
      "Ritual e calend\u00e1rio; painel de riscos/a\u00e7\u00f5es; evid\u00eancia de reprioriza\u00e7\u00e3o.",
      "AV+GG+CA"
    ],
    [
      "Q04",
      "GV, PR",
      "Prote\u00e7\u00e3o de acesso; Governan\u00e7a de exposi\u00e7\u00e3o externa",
      "Gatilho",
      "Quando algu\u00e9m pede uma exce\u00e7\u00e3o (ex.: acesso sem dupla verifica\u00e7\u00e3o / exposi\u00e7\u00e3o \u201cs\u00f3 por hoje\u201d), o que acontece na pr\u00e1tica?",
      [
        "Libera informal, sem prazo.",
        "Registra \u00e0s vezes, sem padr\u00e3o.",
        "Registra e aprova, sem revis\u00e3o de exce\u00e7\u00f5es.",
        "Exce\u00e7\u00e3o com prazo, justificativa, compensa\u00e7\u00e3o e revis\u00e3o.",
        "Exce\u00e7\u00f5es viram aprendizado e reduzem ao longo do tempo."
      ],
      3,
      "Workflow de exce\u00e7\u00f5es; lista de exce\u00e7\u00f5es com prazo; evid\u00eancia de revis\u00e3o/encerramento.",
      "LA+CA"
    ],
    [
      "Q05",
      "GV, RS",
      "Governan\u00e7a de terceiros e resposta; Monitoramento e rastreabilidade",
      "Hist\u00f3rico",
      "Nos \u00faltimos 12 meses: qual frase descreve melhor o que a empresa faz ap\u00f3s incidente/quase-incidente relevante?",
      [
        "N\u00e3o tivemos/n\u00e3o sabemos; sem pr\u00e1tica de p\u00f3s-evento.",
        "Apaga inc\u00eandio e segue.",
        "Revis\u00e3o pontual e corrige o \u00f3bvio.",
        "P\u00f3s-evento estruturado + acompanhamento de a\u00e7\u00f5es.",
        "Tend\u00eancias/indicadores para prevenir recorr\u00eancia."
      ],
      2,
      "Post-mortem; plano de a\u00e7\u00e3o; evid\u00eancia de melhoria implantada; li\u00e7\u00f5es incorporadas.",
      "AV+LA"
    ],
    [
      "Q06",
      "GV",
      "Monitoramento e rastreabilidade; Hardening e atualiza\u00e7\u00e3o; Prote\u00e7\u00e3o de acesso; Governan\u00e7a de dados pessoais",
      "Evid\u00eancia simples",
      "Se voc\u00ea tivesse 10 minutos para mostrar ao Conselho que risco digital est\u00e1 sob controle, qual evid\u00eancia voc\u00ea apresenta hoje?",
      [
        "Nenhuma consistente; s\u00f3 relato verbal.",
        "Documentos existem, mas sem opera\u00e7\u00e3o.",
        "Relat\u00f3rios pontuais, sem vis\u00e3o recorrente.",
        "Painel simples e recorrente, usado para gest\u00e3o.",
        "Painel + metas/tend\u00eancia e uso em decis\u00e3o (prioridade/or\u00e7amento)."
      ],
      2,
      "Dashboard; lista de top riscos; indicadores (tempo de detec\u00e7\u00e3o/resposta, cobertura, terceiros, privacidade).",
      "CL+CA"
    ],
    [
      "Q07",
      "GV, ID, PR",
      "Governan\u00e7a de terceiros e resposta; Governan\u00e7a de dados pessoais",
      "Cen\u00e1rio",
      "Sobre fornecedores/parceiros que tratam dados ou suportam processos cr\u00edticos: qual cen\u00e1rio \u00e9 mais real?",
      [
        "Sem vis\u00e3o completa; cl\u00e1usulas gen\u00e9ricas.",
        "Lista parcial; avalia s\u00f3 quando exigem.",
        "Avalia antes de contratar, pouca verifica\u00e7\u00e3o/monitoramento.",
        "Classifica por risco; exige controles em contrato; revisa cr\u00edticos.",
        "Valida evid\u00eancias + plano conjunto de resposta para cr\u00edticos."
      ],
      3,
      "Invent\u00e1rio e classifica\u00e7\u00e3o; cl\u00e1usulas/DPA; registros de avalia\u00e7\u00e3o; plano de incidente com terceiros.",
      "FR+CA"
    ],
    [
      "Q08",
      "GV, RS",
      "Governan\u00e7a de terceiros e resposta; Governan\u00e7a de dados pessoais",
      "Gatilho",
      "Se amanh\u00e3 ocorrer incidente envolvendo dados pessoais, a empresa conseguiria decidir e executar comunica\u00e7\u00f5es necess\u00e1rias com qualidade e no prazo aplic\u00e1vel?",
      [
        "N\u00e3o; improviso.",
        "Talvez; risco de atraso/incompletude.",
        "Fluxo b\u00e1sico, pouco testado.",
        "Fluxo estruturado + checklist + registro.",
        "Registro por prazo definido + exerc\u00edcios e melhoria cont\u00ednua."
      ],
      3,
      "Playbook; checklist; templates; registro de incidentes e comunica\u00e7\u00f5es (com reten\u00e7\u00e3o adequada).",
      "LA+CA"
    ],
    [
      "Q09",
      "ID",
      "Governan\u00e7a de exposi\u00e7\u00e3o externa; Prote\u00e7\u00e3o de acesso; Governan\u00e7a de dados pessoais",
      "Cen\u00e1rio",
      "Se voc\u00ea pedir a lista dos \u201c10 servi\u00e7os/sistemas que n\u00e3o podem parar\u201d, qual cen\u00e1rio descreve melhor?",
      [
        "N\u00e3o existe lista confi\u00e1vel.",
        "Lista informal, sem donos.",
        "Lista com donos, sem depend\u00eancias claras.",
        "Lista com donos, criticidade e revis\u00e3o peri\u00f3dica.",
        "Lista ligada a continuidade/recupera\u00e7\u00e3o/investimento."
      ],
      3,
      "Invent\u00e1rio de cr\u00edticos; owners; depend\u00eancias; revis\u00e3o datada; prioridades de recupera\u00e7\u00e3o.",
      "AN+CA"
    ],
    [
      "Q10",
      "ID",
      "Governan\u00e7a de dados pessoais; Governan\u00e7a de terceiros e resposta",
      "Evid\u00eancia simples",
      "A empresa sabe onde (geograficamente e tecnicamente) os dados pessoais relevantes s\u00e3o tratados/armazenados (interno, nuvem, terceiros)?",
      [
        "N\u00e3o sabe.",
        "Parcial, sem vis\u00e3o consolidada.",
        "Maior parte, com lacunas.",
        "Vis\u00e3o consolidada e revisada, com respons\u00e1veis.",
        "Vis\u00e3o usada para decis\u00f5es e para responder r\u00e1pido a incidentes/solicita\u00e7\u00f5es."
      ],
      2,
      "Mapa de dados; lista de provedores/localidades; registros de processamento; revis\u00e3o datada.",
      "CL+CA"
    ],
    [
      "Q11",
      "ID, PR",
      "Governan\u00e7a de exposi\u00e7\u00e3o externa; Seguran\u00e7a de aplica\u00e7\u00e3o",
      "Frequ\u00eancia",
      "Com que disciplina a empresa sabe o que est\u00e1 exposto para fora e revisa se \u00e9 necess\u00e1rio?",
      [
        "N\u00e3o sabe.",
        "Sabe por mem\u00f3ria; revisa s\u00f3 quando d\u00e1 problema.",
        "Lista parcial; revis\u00f5es pontuais.",
        "Invent\u00e1rio + revis\u00e3o peri\u00f3dica com respons\u00e1veis.",
        "Monitoramento cont\u00ednuo e redu\u00e7\u00e3o ativa de superf\u00edcies."
      ],
      3,
      "Invent\u00e1rio de exposi\u00e7\u00e3o; varredura externa; decis\u00f5es de despublica\u00e7\u00e3o; revis\u00e3o de per\u00edmetro.",
      "GG+CA"
    ],
    [
      "Q12",
      "ID, GV",
      "Governan\u00e7a de dados pessoais",
      "Cen\u00e1rio",
      "Sobre dados pessoais, qual cen\u00e1rio descreve melhor o mapeamento de uso e finalidade?",
      [
        "Coleta/guarda por h\u00e1bito; finalidade/prazo pouco claros.",
        "No\u00e7\u00e3o geral, sem documenta\u00e7\u00e3o e sem reten\u00e7\u00e3o aplicada.",
        "Mapeado em alguns processos cr\u00edticos.",
        "Mapeamento consistente (o qu\u00ea, por qu\u00ea, base, prazo, onde, quem acessa).",
        "Mapeamento vivo e usado para minimizar coleta e responder a titulares."
      ],
      3,
      "Registro de opera\u00e7\u00f5es; mapa de dados; pol\u00edtica de reten\u00e7\u00e3o; evid\u00eancia de revis\u00e3o em projetos.",
      "FR+CA"
    ],
    [
      "Q13",
      "ID, PR",
      "Hardening e atualiza\u00e7\u00e3o",
      "Gatilho",
      "Quando surge vulnerabilidade relevante em tecnologia usada, qual cen\u00e1rio \u00e9 mais prov\u00e1vel?",
      [
        "Descobre tarde/por acaso; sem processo.",
        "Depende de quem percebe e do tempo.",
        "Processo b\u00e1sico, atrasos comuns.",
        "Prioriza\u00e7\u00e3o por risco e prazos por severidade, com acompanhamento at\u00e9 fechar.",
        "Verifica corre\u00e7\u00e3o, mede tempo e reduz recorr\u00eancia com baseline/hardening."
      ],
      3,
      "Gest\u00e3o de vulnerabilidades; SLAs; aging report; evid\u00eancia de verifica\u00e7\u00e3o p\u00f3s-corre\u00e7\u00e3o.",
      "LA+CA"
    ],
    [
      "Q14",
      "ID, GV",
      "Prote\u00e7\u00e3o de identidade cr\u00edtica; Prote\u00e7\u00e3o de acesso",
      "Evid\u00eancia simples",
      "A empresa sabe identificar \u201cpontos de dom\u00ednio\u201d (contas/chaves/sistemas que, se comprometidos, dominam grande parte do ambiente)?",
      [
        "N\u00e3o sabe.",
        "Sabe informalmente, sem revis\u00e3o.",
        "Parcial, sem plano completo.",
        "Mapeado + plano espec\u00edfico + revis\u00e3o peri\u00f3dica.",
        "Testes/valida\u00e7\u00f5es + monitoramento refor\u00e7ado + conting\u00eancia."
      ],
      2,
      "Invent\u00e1rio de contas privilegiadas/segredos cr\u00edticos; plano de prote\u00e7\u00e3o; evid\u00eancia de revis\u00e3o.",
      "AN+CA"
    ],
    [
      "Q15",
      "ID",
      "Governan\u00e7a de terceiros e resposta; Governan\u00e7a de dados pessoais",
      "Hist\u00f3rico",
      "Qual foi a \u00faltima vez que revisaram a lista de fornecedores com acesso a dados/sistemas cr\u00edticos (e reclassificaram por risco)?",
      [
        "Nunca revisou como lista.",
        "Revisou uma vez, sem cad\u00eancia.",
        "Ocasional, por exig\u00eancia externa.",
        "Cad\u00eancia definida, com crit\u00e9rios e registro.",
        "Acompanhamento cont\u00ednuo de cr\u00edticos + gatilhos de reavalia\u00e7\u00e3o."
      ],
      2,
      "Invent\u00e1rio de terceiros; crit\u00e9rios; registros de reavalia\u00e7\u00e3o; evid\u00eancias de acompanhamento.",
      "AV+CA"
    ],
    [
      "Q16",
      "ID, GV",
      "Hardening e atualiza\u00e7\u00e3o; Governan\u00e7a de exposi\u00e7\u00e3o externa; Governan\u00e7a de dados pessoais; Governan\u00e7a de terceiros e resposta",
      "Cen\u00e1rio",
      "Quando h\u00e1 muitas corre\u00e7\u00f5es poss\u00edveis, como decide o que vem primeiro?",
      [
        "Press\u00e3o/urg\u00eancia do momento.",
        "Severidade t\u00e9cnica sem criticidade de neg\u00f3cio.",
        "Considera criticidade, sem m\u00e9todo consistente.",
        "Crit\u00e9rios consistentes (prob x impacto, criticidade, exposi\u00e7\u00e3o) com registro.",
        "Revisa com base em evid\u00eancia e mede redu\u00e7\u00e3o de risco ao longo do tempo."
      ],
      2,
      "Metodologia simples; matriz de risco; backlog priorizado; exemplos de decis\u00e3o registrada.",
      "AN+CA"
    ],
    [
      "Q17",
      "PR",
      "Prote\u00e7\u00e3o de acesso; Governan\u00e7a de exposi\u00e7\u00e3o externa",
      "Cen\u00e1rio",
      "Para acessar sistemas sens\u00edveis de fora (home office/viagem/terceiros), qual descri\u00e7\u00e3o \u00e9 mais verdadeira?",
      [
        "Senha simples resolve na maioria.",
        "Dupla verifica\u00e7\u00e3o em alguns; muitas exce\u00e7\u00f5es.",
        "Dupla verifica\u00e7\u00e3o para usu\u00e1rios; falha em privilegiados/terceiros ou cr\u00edticos.",
        "Dupla verifica\u00e7\u00e3o obrigat\u00f3ria para sens\u00edveis e privilegiados; exce\u00e7\u00f5es raras e registradas.",
        "Bloqueio/alerta autom\u00e1tico + revis\u00e3o peri\u00f3dica de cobertura e exce\u00e7\u00f5es."
      ],
      3,
      "Pol\u00edtica e configura\u00e7\u00e3o; relat\u00f3rio de cobertura; exce\u00e7\u00f5es com prazo; evid\u00eancia de alertas/bloqueios.",
      "LA+CA"
    ],
    [
      "Q18",
      "PR, GV",
      "Prote\u00e7\u00e3o de acesso; Governan\u00e7a de dados pessoais",
      "Frequ\u00eancia",
      "Qu\u00e3o consistente \u00e9 o ajuste/remo\u00e7\u00e3o de acessos quando algu\u00e9m muda de fun\u00e7\u00e3o ou sai (incl. SaaS e dados pessoais)?",
      [
        "Inconsistente; pode demorar semanas.",
        "Alguns removem r\u00e1pido; outros ficam esquecidos.",
        "Processo b\u00e1sico, sem auditoria recorrente.",
        "Prazos definidos + revis\u00e3o peri\u00f3dica de acessos sens\u00edveis.",
        "Automa\u00e7\u00e3o + alerta de acesso excessivo + auditoria por risco."
      ],
      3,
      "Processo JML; evid\u00eancia de desligamentos; revis\u00f5es de acesso; tickets/SLAs.",
      "AV+CA"
    ],
    [
      "Q19",
      "PR",
      "Prote\u00e7\u00e3o de acesso; Prote\u00e7\u00e3o de identidade cr\u00edtica",
      "Cen\u00e1rio",
      "Como a empresa trata \u201cacessos de poder\u201d (admins, contas de servi\u00e7o, acesso a produ\u00e7\u00e3o, segredos)?",
      [
        "Igual aos demais acessos.",
        "Alguns cuidados, sem padr\u00e3o.",
        "Muitos controlados, mas com pontos cegos.",
        "Padr\u00e3o forte (menor privil\u00e9gio, segrega\u00e7\u00e3o, rastreio, revis\u00e3o).",
        "Cofre/PAM ou equivalente + rota\u00e7\u00e3o e monitoramento de uso an\u00f4malo."
      ],
      3,
      "Invent\u00e1rio; cofre/PAM; rota\u00e7\u00e3o; relat\u00f3rios de uso; revis\u00f5es.",
      "FR+LA+CA"
    ],
    [
      "Q20",
      "PR, ID",
      "Prote\u00e7\u00e3o de identidade cr\u00edtica",
      "Hist\u00f3rico",
      "Para sistemas centrais de identidade e segredos cr\u00edticos: qual pr\u00e1tica descreve melhor a empresa?",
      [
        "Sem cuidados especiais; \u00faltima revis\u00e3o \u00e9 desconhecida.",
        "Cuidados pontuais, sem rotina.",
        "Rotina parcial, pouco audit\u00e1vel.",
        "Plano espec\u00edfico (prote\u00e7\u00e3o, segmenta\u00e7\u00e3o, rota\u00e7\u00e3o, revis\u00e3o peri\u00f3dica).",
        "Simula\u00e7\u00f5es/testes + monitoramento refor\u00e7ado + melhoria cont\u00ednua."
      ],
      2,
      "Plano de identidade; evid\u00eancia de rota\u00e7\u00e3o/renova\u00e7\u00e3o; auditorias; simula\u00e7\u00f5es.",
      "AV+CA"
    ],
    [
      "Q21",
      "PR",
      "Hardening e atualiza\u00e7\u00e3o",
      "Cen\u00e1rio",
      "Sobre atualiza\u00e7\u00e3o/corre\u00e7\u00e3o (servidores, esta\u00e7\u00f5es, apps, appliances): qual cen\u00e1rio \u00e9 mais real?",
      [
        "Irregular e reativo, \u201cheroico\u201d.",
        "Existe, sem prioriza\u00e7\u00e3o por criticidade; atrasos frequentes.",
        "Bom nos principais; lacunas em legados/menos assistidos.",
        "Gerenciado: invent\u00e1rio, prioriza\u00e7\u00e3o por risco, janelas e verifica\u00e7\u00e3o.",
        "Mede tempo de corre\u00e7\u00e3o e combina patching com hardening/baselines."
      ],
      3,
      "Pol\u00edtica/processo; compliance; SLAs; evid\u00eancia de verifica\u00e7\u00e3o; baseline; m\u00e9tricas.",
      "AN+CA"
    ],
    [
      "Q22",
      "PR, ID",
      "Governan\u00e7a de exposi\u00e7\u00e3o externa",
      "Frequ\u00eancia",
      "Com que disciplina firewall/acessos remotos/regras de entrada/sa\u00edda s\u00e3o revisados para reduzir exposi\u00e7\u00e3o e remover permiss\u00f5es antigas?",
      [
        "N\u00e3o existe rotina; acumula.",
        "S\u00f3 quando quebra ou ap\u00f3s incidente.",
        "Pontual, sem dono/crit\u00e9rio.",
        "Cad\u00eancia + crit\u00e9rios + gest\u00e3o de exce\u00e7\u00f5es.",
        "Mede e reduz exposi\u00e7\u00e3o ao longo do tempo + liga com detec\u00e7\u00e3o/alertas."
      ],
      2,
      "Calend\u00e1rio de revis\u00e3o; relat\u00f3rios; gest\u00e3o de mudan\u00e7a; evid\u00eancia de remo\u00e7\u00e3o de regra antiga.",
      "GG+CA"
    ],
    [
      "Q23",
      "PR, ID",
      "Seguran\u00e7a de aplica\u00e7\u00e3o; Governan\u00e7a de exposi\u00e7\u00e3o externa",
      "Cen\u00e1rio",
      "Quando publica site/portal/API, qual cen\u00e1rio representa a pr\u00e1tica de seguran\u00e7a de aplica\u00e7\u00e3o?",
      [
        "Publica e torce; seguran\u00e7a entra depois.",
        "Revis\u00e3o pontual; sem checklist consistente.",
        "Checklist b\u00e1sico, n\u00e3o cobre abuso/exposi\u00e7\u00e3o de info.",
        "Padr\u00e3o aplicado (prote\u00e7\u00e3o contra abuso, erros seguros, criptografia moderna).",
        "Validacao recorrente + metricas + aprendizado continuo."
      ],
      2,
      "Checklist de publicacao; evidencia de testes/varreduras; padroes minimos; registros de correcao.",
      "FR+CA"
    ],
    [
      "Q24",
      "PR, GV",
      "Governan\u00e7a de dados pessoais; Prote\u00e7\u00e3o de acesso",
      "Cen\u00e1rio",
      "Sobre acesso a dados pessoais (ex.: RH/candidatos): qual cen\u00e1rio \u00e9 mais real?",
      [
        "Acesso amplo por conveniencia.",
        "Alguma restricao; pouca revisao.",
        "Restringe em alguns pontos; lacunas por ferramenta/perfil.",
        "Minimo privilegio + revisao + excecoes tratadas.",
        "Monitora acessos incomuns e reduz coleta/exposicao por design."
      ],
      3,
      "Matriz de acesso; revisao periodica; relatorios de permissoes; auditoria; minimizacao (campos removidos/ocultos).",
      "LA+CA"
    ],
    [
      "Q25",
      "DE",
      "Monitoramento e rastreabilidade",
      "Cen\u00e1rio",
      "Se houver acesso indevido hoje, a empresa consegue reconstruir \u201co que aconteceu\u201d com logs relevantes e centralizados?",
      [
        "N\u00e3o; logs insuficientes/espalhados.",
        "Parcial, com lacunas.",
        "Em alguns cr\u00edticos, n\u00e3o consistente.",
        "Consistente nos cr\u00edticos, com correla\u00e7\u00e3o.",
        "R\u00e1pido, com playbook/ferramentas, reten\u00e7\u00e3o adequada."
      ],
      3,
      "Lista de fontes; centralizacao; exemplo de investigacao; playbook de coleta; retencao.",
      "CL+CA"
    ],
    [
      "Q26",
      "DE, GV",
      "Monitoramento e rastreabilidade",
      "Evid\u00eancia simples",
      "Sobre logs/evid\u00eancias: prote\u00e7\u00e3o contra perda e reten\u00e7\u00e3o para investiga\u00e7\u00e3o \u00e9:",
      [
        "Sem regra; pode perder/excluir.",
        "Alguma reten\u00e7\u00e3o, sem prote\u00e7\u00e3o.",
        "Reten\u00e7\u00e3o em alguns, n\u00e3o cobre o cr\u00edtico.",
        "Reten\u00e7\u00e3o/prote\u00e7\u00e3o definida nos cr\u00edticos (acesso controlado, trilha).",
        "Atende necessidade legal/forense e \u00e9 testada periodicamente."
      ],
      3,
      "Politica de retencao; configuracao; controle de acesso; evidencia de integridade/imutabilidade (ou equivalente).",
      "LA+AN+CA"
    ],
    [
      "Q27",
      "DE, PR",
      "Monitoramento e rastreabilidade",
      "Cen\u00e1rio",
      "Em PCs/servidores cr\u00edticos, a empresa detecta comportamento malicioso (scripts, malware, movimenta\u00e7\u00e3o)?",
      [
        "So antivirus basico/percepcao humana.",
        "Ferramenta com cobertura parcial.",
        "Cobertura boa, faltam ajustes e resposta e lenta.",
        "Cobertura consistente + alertas acionaveis + time preparado.",
        "Tuning continuo + mede eficacia (ruido, tempo de deteccao)."
      ],
      2,
      "Inventario de cobertura; relatorios; exemplos de alertas; evidencia de tuning.",
      "GG+CA"
    ],
    [
      "Q28",
      "DE",
      "Monitoramento e rastreabilidade",
      "Cen\u00e1rio",
      "A empresa junta sinais de rede/identidade/endpoints/apps para entender r\u00e1pido se \u00e9 ataque ou falso alarme?",
      [
        "Nao; alertas isolados.",
        "As vezes; esforco manual alto.",
        "Parcial; depende de especialistas.",
        "Consistente nos criticos; correlacao e contexto.",
        "Casos de uso bem definidos e revisados + melhora por licoes."
      ],
      2,
      "Casos de uso; playbooks; exemplos de correlacao; revisao/tuning.",
      "CL+CA"
    ],
    [
      "Q29",
      "DE, PR",
      "Seguran\u00e7a de aplica\u00e7\u00e3o; Prote\u00e7\u00e3o de acesso",
      "Gatilho",
      "Quando h\u00e1 tentativas repetidas de login/uso abusivo, qual cen\u00e1rio descreve perceber e reagir?",
      [
        "Nao ha bloqueio/alerta confiavel.",
        "Em alguns sistemas, inconsistente.",
        "Bloqueia nos principais; resposta lenta/irregular.",
        "Bloqueia e alerta; investiga e age rapido.",
        "Ajusta limiares e reduz abuso continuamente."
      ],
      2,
      "Politica de bloqueio; logs/alertas; playbook; ajuste de limiares.",
      "LA+CA"
    ],
    [
      "Q30",
      "DE, RS",
      "Prote\u00e7\u00e3o de acesso; Monitoramento e rastreabilidade",
      "Cen\u00e1rio",
      "Se um invasor usar credencial real (login/senha v\u00e1lidos), qual cen\u00e1rio \u00e9 mais prov\u00e1vel?",
      [
        "So perceberiamos apos dano.",
        "Talvez, por sensacao, sem garantia.",
        "Em alguns casos, sem padrao.",
        "Alertas consistentes + resposta rapida.",
        "Deteccao baseada em risco + simulacoes + melhoria continua."
      ],
      3,
      "Alertas de identidade; exemplos de resposta; playbook de contencao.",
      "FR+CA"
    ],
    [
      "Q31",
      "DE, ID",
      "Governan\u00e7a de exposi\u00e7\u00e3o externa",
      "Frequ\u00eancia",
      "A empresa monitora mudan\u00e7as na exposi\u00e7\u00e3o externa (novos servi\u00e7os publicados, configura\u00e7\u00f5es perigosas)?",
      [
        "Nao monitora.",
        "Pontual, sem continuidade.",
        "Parcial, pouca capacidade de resposta.",
        "Recorrente + dono para corrigir rapido.",
        "Integra com mudancas e alerta automatico."
      ],
      2,
      "Varredura externa; inventario publicado; alertas; evidencia de correcao rapida.",
      "GG+CA"
    ],
    [
      "Q32",
      "DE, GV",
      "Monitoramento e rastreabilidade",
      "Evid\u00eancia simples",
      "Se eu perguntar \u201cquanto tempo levamos para perceber algo s\u00e9rio?\u201d, qual resposta a empresa consegue dar?",
      [
        "Nao sabe; nao mede.",
        "Intuicao, sem dado.",
        "Estima por alguns casos, pouco confiavel.",
        "Mede e usa para melhorar.",
        "Tem meta/limites, exercicios e investimento orientado por indicador."
      ],
      2,
      "Registro com linha do tempo; metricas; metas; relatorios de evolucao.",
      "AN+CA"
    ],
    [
      "Q33",
      "RS",
      "Governan\u00e7a de terceiros e resposta; Monitoramento e rastreabilidade",
      "Cen\u00e1rio",
      "Quando acontece um incidente, qual cen\u00e1rio descreve melhor a coordenacao (quem lidera/decide/executa)?",
      [
        "Cada area reage; confuso.",
        "TI conduz; papeis incertos.",
        "Plano existe, depende de pessoas especificas.",
        "Papeis claros (tecnico, juridico, comunicacao, privacidade) + registro de decisoes.",
        "Testado regularmente e integrado a gestao de riscos."
      ],
      3,
      "Plano; contatos; logs/registros; evidencia de acionamento e exercicios.",
      "FR+CA"
    ],
    [
      "Q34",
      "RS, PR",
      "Prote\u00e7\u00e3o de acesso; Governan\u00e7a de terceiros e resposta; Governan\u00e7a de exposi\u00e7\u00e3o externa",
      "Gatilho",
      "Se houver suspeita de credencial comprometida, qual cen\u00e1rio \u00e9 mais prov\u00e1vel nas primeiras horas?",
      [
        "Sem roteiro.",
        "Acoes isoladas, sem coordenacao.",
        "Roteiro basico; contencao pode ser lenta ou exagerada.",
        "Playbook: contencao rapida e proporcional + investigacao em paralelo.",
        "Automacao onde faz sentido + aprendizado continuo."
      ],
      3,
      "Playbook; evidencias de contencao; templates; checklist de revisao de acessos.",
      "LA+CA"
    ],
    [
      "Q35",
      "RS, DE",
      "Monitoramento e rastreabilidade",
      "Evid\u00eancia simples",
      "Durante um incidente, a empresa preserva evidencias e registra a\u00e7\u00f5es de modo confiavel?",
      [
        "Evidencia se perde; pouco registro.",
        "Registro informal (chat/e-mail).",
        "Registro parcial; sem disciplina de evidencia.",
        "Padrao de registro/preservacao, acesso controlado.",
        "Processo testado em exercicios e revisado periodicamente."
      ],
      2,
      "Template de linha do tempo; repositorio restrito; checklist; evidencia de testes.",
      "CL+CA"
    ],
    [
      "Q36",
      "RS, GV",
      "Governan\u00e7a de terceiros e resposta",
      "Cen\u00e1rio",
      "Em incidente relevante, comunica\u00e7\u00e3o com lideranca/negocio e (quando necessario) cliente/publico e:",
      [
        "Caotica/tardia; sem mensagens preparadas.",
        "Improviso; varia muito.",
        "Caminho basico, papeis/frases pouco definidos.",
        "Plano com papeis e templates.",
        "Treinada em simulacoes e atualizada por licoes."
      ],
      2,
      "Plano de comunicacao; templates; stakeholders; evidencia de simulacao; registro de comunicacoes.",
      "FR+CL"
    ],
    [
      "Q37",
      "RS, GV",
      "Governan\u00e7a de dados pessoais; Governan\u00e7a de terceiros e resposta",
      "Gatilho",
      "Para incidentes com dados pessoais: a empresa avalia risco/dano relevante e produz informa\u00e7\u00f5es minimas para comunicacao quando necessario?",
      [
        "Nao sabe avaliar nem reunir info.",
        "Lento e dependente de pessoas.",
        "Checklist basico pouco testado.",
        "Processo estruturado (criterios, checklist, templates) e executa no prazo.",
        "Mantem registro completo por prazo exigido e revisa processo por licoes."
      ],
      3,
      "Checklist; template; registro do incidente; evidencia de prazo; retencao de registros.",
      "LA+CA"
    ],
    [
      "Q38",
      "RS, RC",
      "Governan\u00e7a de terceiros e resposta; Monitoramento e rastreabilidade",
      "Frequ\u00eancia",
      "Com que frequencia a empresa testa resposta e recuperacao (simulacoes/tabletop/teste tecnico)?",
      [
        "Nunca.",
        "Raramente, sem aprendizado claro.",
        "Ocasional, melhora pouco.",
        "Cadencia definida, plano de melhoria.",
        "Cenarios criticos + mede evolucao ao longo do tempo."
      ],
      2,
      "Agenda; relatorio; plano pos-exercicio; evidencia de melhoria implantada.",
      "GG+CL"
    ],
    [
      "Q39",
      "RS, GV, ID",
      "Governan\u00e7a de terceiros e resposta",
      "Cen\u00e1rio",
      "Se o incidente envolver fornecedor (SaaS/infra), qual cenario descreve melhor coordenacao?",
      [
        "Sem contato/SLAs claros.",
        "Contato existe, sem responsabilidade/tempo acordados.",
        "Acordos basicos, pouca visibilidade do que o fornecedor faz.",
        "Requisitos/SLAs + canal de crise + plano conjunto.",
        "Testa plano, revisa pos-incidente e reavalia fornecedor por evidencia."
      ],
      3,
      "Clausulas de incidente/SLAs; contatos; playbook conjunto; registro de acionamento.",
      "FR+CA"
    ],
    [
      "Q40",
      "RS, ID, GV",
      "Hardening e atualiza\u00e7\u00e3o; Monitoramento e rastreabilidade; Prote\u00e7\u00e3o de acesso",
      "Hist\u00f3rico",
      "Depois de um incidente, as acoes atacam mais sintoma ou causa?",
      [
        "Sintoma e segue igual.",
        "Um pouco de causa, sem acompanhamento.",
        "Causa em alguns casos, sem medir eficacia.",
        "Causa raiz com plano + verificacao de resolucao.",
        "Prevencoes sistemicas e reducao mensuravel de recorrencia."
      ],
      2,
      "RCA; plano corretivo/preventivo; verificacao; indicadores de recorrencia.",
      "LA+CA"
    ],
    [
      "Q41",
      "RC",
      "Monitoramento e rastreabilidade; Hardening e atualiza\u00e7\u00e3o; Governan\u00e7a de terceiros e resposta",
      "Cen\u00e1rio",
      "Sobre backups e restauracao de sistemas criticos: qual cenario descreve melhor a realidade?",
      [
        "Backups existem, nao confiamos; nao testa.",
        "Testa as vezes, sem cobertura/criterio claro.",
        "Testa principais; lacunas de dependencia/configuracao.",
        "Testa em cadencia definida e corrige falhas.",
        "Backups protegidos contra alteracao e parte de exercicio de crise."
      ],
      3,
      "Relatorios de teste; correcoes; protecao de backup; lista coberta.",
      "LA+GG"
    ],
    [
      "Q42",
      "RC, ID",
      "Governan\u00e7a de terceiros e resposta; Governan\u00e7a de dados pessoais",
      "Evid\u00eancia simples",
      "Para servicos criticos, a empresa definiu quanto pode ficar fora e quanto pode perder de dados em linguagem simples?",
      [
        "Nao definido.",
        "Ideia geral, sem decisao/teste.",
        "Definido para alguns, sem revisao.",
        "Definido e testado para os criticos.",
        "Orienta arquitetura, contratos e prioridades."
      ],
      2,
      "Metas de recuperacao; evidencia de teste; decisoes registradas; SLAs alinhados.",
      "AN+CA"
    ],
    [
      "Q43",
      "RC, GV",
      "Governan\u00e7a de terceiros e resposta",
      "Cen\u00e1rio",
      "Em crise, como decide ordem de recuperacao e valida retorno seguro?",
      [
        "Improviso por pressao.",
        "Nocao geral, muda na crise.",
        "Plano basico, depende de pessoas, pouco testado.",
        "Plano com prioridades e criterios, testado.",
        "Retorno inclui validacao de seguranca e comunicacao clara durante recuperacao."
      ],
      2,
      "Plano; prioridades; criterios; testes; registro de decisoes.",
      "FR+CA"
    ],
    [
      "Q44",
      "RC, PR, RS",
      "Governan\u00e7a de exposi\u00e7\u00e3o externa; Prote\u00e7\u00e3o de acesso",
      "Gatilho",
      "Apos um incidente, como reativa acessos externos e privilegios?",
      [
        "Reativa quando parece estavel, sem checklist.",
        "Valida parcialmente, sem padrao.",
        "Checklist basico, pode reabrir brecha.",
        "Valida causa raiz e aplica checklist robusto antes de reativar, com aprovacao/registro.",
        "Usa retorno para elevar padrao (hardening, MFA, reduzir exposicao) com metricas."
      ],
      3,
      "Checklist de retorno; evidencia de correcoes antes de reativar; aprovacoes; mudancas; metricas.",
      "LA+CA"
    ],
    [
      "Q45",
      "GV, RS",
      "Governan\u00e7a de dados pessoais",
      "Cen\u00e1rio",
      "Se um titular pedir acesso/correcao/eliminacao de dados pessoais, qual cenario descreve melhor a capacidade de responder ponta a ponta?",
      [
        "Nao existe processo; dependeria de cacar dados.",
        "Fazemos manualmente, lento e sem rastreio consistente.",
        "Existe fluxo basico, mas sem padronizacao e com risco de prazo/qualidade.",
        "Existe fluxo definido, com papeis (privacidade, TI, negocio), registro e evidencia.",
        "Alem disso, medimos tempo/qualidade, reduzimos atrito e usamos isso para melhorar governanca e minimizacao."
      ],
      2,
      "Canal de atendimento; workflow; registro; exemplos de atendimento; base de conhecimento; relatorios de prazo/volume.",
      "FR+CA"
    ],
    [
      "Q46",
      "GV, ID",
      "Governan\u00e7a de dados pessoais",
      "Evid\u00eancia simples",
      "Em processos que usam analise automatizada/perfilamento (ex.: triagem de candidatos), a empresa consegue explicar criterios, reduzir vieses e oferecer revisao humana quando aplicavel?",
      [
        "Nao; e caixa-preta do sistema/processo.",
        "Explicamos informalmente, sem documentacao nem revisao.",
        "Documentamos parcialmente, sem governanca continua.",
        "Documentamos, revisamos e temos controles (transparencia, revisao humana, minimizacao do dado).",
        "Alem disso, avaliamos risco/impacto periodicamente e ajustamos o processo com evidencias."
      ],
      2,
      "Documentacao do processo; criterios; registros de revisao; canal de contestacao/revisao; avaliacao de impacto quando aplicavel.",
      "FR+AN+CA"
    ],
    [
      "Q47",
      "RC, PR",
      "Hardening e atualiza\u00e7\u00e3o",
      "Gatilho",
      "Apos restaurar um ambiente/sistema, como voces validam que ele voltou no minimo seguro, nao apenas funcionando?",
      [
        "Nao validamos; se funciona, vai para o ar.",
        "Validacao informal, depende do time.",
        "Checklist basico (disponibilidade), pouca validacao de seguranca/configuracao.",
        "Checklist robusto (configuracao minima, correcoes criticas, acessos), com registro e responsavel.",
        "Alem disso, validacao e automatizada onde possivel e retroalimenta baselines e prevencao."
      ],
      2,
      "Checklist assinado; evidencia de patch/hardening; revisao de acessos; relatorio pos-retorno.",
      "LA+CA"
    ],
    [
      "Q48",
      "RC, GV, ID",
      "Governan\u00e7a de terceiros e resposta",
      "Cen\u00e1rio",
      "Se um provedor critico (infra/SaaS) ficar indisponivel ou sofrer incidente, qual cenario descreve melhor sua continuidade?",
      [
        "Nao temos plano B; aguardamos o fornecedor.",
        "Ha plano informal, pouco realista.",
        "Existe alternativa parcial (manual ou tecnica), mas sem teste e sem criterios claros.",
        "Existe plano de contingencia para servicos criticos, testado e alinhado com SLAs/contratos.",
        "Alem disso, reavaliamos arquitetura/contrato com base em incidentes e indicadores, reduzindo dependencia e risco."
      ],
      3,
      "Plano de contingencia; testes; SLAs; evidencia de exercicios; decisoes de arquitetura/contrato.",
      "LA+GG+CA"
    ]
  ];

  function deriveTitle(id, prompt) {
    const cleanPrompt = prompt.replace(/\?$/, '').replace(/[“”"]/g, '').trim();
    const shortText =
      cleanPrompt.length > 86 ? `${cleanPrompt.slice(0, 86).trimEnd()}…` : cleanPrompt;
    return `${id} · ${shortText}`;
  }

  function deriveUiPromptShort(prompt) {
    return prompt
      .replace(/^Qual frase descreve melhor como /i, '')
      .replace(/^Qual frase descreve melhor /i, '')
      .replace(/^Qual cenário descreve melhor /i, '')
      .replace(/^Qual cenario descreve melhor /i, '')
      .replace(/^Qual cenário representa /i, '')
      .replace(/^Sobre /i, '')
      .replace(/^Quando /i, '')
      .replace(/^Com que frequência /i, '')
      .replace(/^Com que frequencia /i, '')
      .replace(/^Se você /i, '')
      .replace(/^Se eu perguntar /i, '')
      .replace(/^Para /i, '')
      .replace(/^Nos últimos 12 meses:\s*/i, '')
      .replace(/^Nos ultimos 12 meses:\s*/i, '')
      .replace(/^Depois de /i, '')
      .replace(/^Em crise, /i, '')
      .replace(/\?$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function deriveCoachHint(type, weight) {
    const hintsByType = {
      Cenário: 'Escolha o retrato mais fiel da prática atual, não a versão ideal da empresa.',
      Cenario: 'Escolha o retrato mais fiel da prática atual, não a versão ideal da empresa.',
      Frequência: 'Pense no que acontece com regularidade, e não em exceções positivas.',
      Frequencia: 'Pense no que acontece com regularidade, e não em exceções positivas.',
      Gatilho: 'Imagine que isso aconteça amanhã e responda pelo que realmente seria feito.',
      Histórico: 'Use fatos recentes e exemplos concretos para responder com mais precisão.',
      Historico: 'Use fatos recentes e exemplos concretos para responder com mais precisão.',
      'Evidência simples': 'Se fosse preciso provar isso em poucos minutos, a resposta continuaria a mesma?',
      'Evidencia simples': 'Se fosse preciso provar isso em poucos minutos, a resposta continuaria a mesma?',
      Dono: 'Considere se a decisão realmente tem dono claro, critério e registro.',
    };

    if (weight === 3 && (type === 'Cenário' || type === 'Cenario' || type === 'Gatilho')) {
      return 'Este é um tema crítico. Vale responder pelo cenário real de hoje, mesmo que ele ainda esteja longe do desejado.';
    }

    return hintsByType[type] || 'Escolha a opção que mais se aproxima da realidade prática da empresa hoje.';
  }

  function deriveLearnWhy(functionKeys, capabilityLabels) {
    const functionNames = functionKeys.map((key) => functions.find((item) => item.key === key)?.label).filter(Boolean);
    const firstFunction = functionNames[0] || 'maturidade';
    const capabilitySummary = capabilityLabels.slice(0, 2).join(' e ');
    const capabilityText = capabilitySummary ? ` e dá pistas sobre ${capabilitySummary.toLowerCase()}` : '';
    return `Esta pergunta ajuda a entender como ${firstFunction.toLowerCase()} aparece na operação do dia a dia${capabilityText}.`;
  }

  function deriveLearnTip(evidenceExpected) {
    const sample = evidenceExpected.split(';')[0].trim();
    return sample
      ? `Se bater dúvida entre duas respostas, pense na evidência mais simples que você conseguiria mostrar hoje: ${sample}.`
      : 'Se bater dúvida entre duas respostas, escolha a opção mais conservadora e pense no que você conseguiria demonstrar hoje.';
  }

  function deriveBusinessPlainLanguage(prompt) {
    const shortPrompt = deriveUiPromptShort(prompt);
    const normalized = shortPrompt
      .replace(/^como /i, '')
      .replace(/^se existe /i, 'existe ')
      .replace(/^se há /i, 'há ')
      .replace(/^se ha /i, 'há ')
      .trim();
    if (!normalized) {
      return 'O que melhor descreve a realidade atual da empresa?';
    }
    const sentence = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return /[?!.]$/.test(sentence) ? sentence : `${sentence}?`;
  }

  function deriveWhoCanAnswer(functionKeys) {
    const primary = functionKeys[0];
    const mapping = {
      GV: 'CEO, CIO, jurídico, risco, compliance ou quem aprova políticas, prioridades e exceções.',
      ID: 'CIO, segurança, infraestrutura, donos de sistemas e quem conhece ativos, dados e terceiros críticos.',
      PR: 'Segurança, infraestrutura, redes, cloud, identidade e aplicações costumam responder melhor em conjunto.',
      DE: 'Segurança, SOC, operações e infraestrutura normalmente trazem a visão mais confiável aqui.',
      RS: 'Segurança, liderança executiva, jurídico, comunicação e privacidade costumam responder melhor este tema.',
      RC: 'Infraestrutura, continuidade, operações e liderança do negócio tendem a ter a visão mais completa.',
    };
    return mapping[primary] || 'Quem conhece a prática do dia a dia e consegue apontar evidências simples.';
  }

  function deriveEvidenceExamples(evidenceExpected) {
    return evidenceExpected
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1));
  }

  function deriveCoachReassurance(type, weight) {
    if (weight === 3) {
      return 'Não precisa acertar a melhor resposta, e sim a mais honesta. Se a prática depende de poucas pessoas ou acontece só às vezes, escolha a opção mais conservadora.';
    }
    if (type === 'Histórico' || type === 'Historico') {
      return 'Vale pensar no que aconteceu de verdade nos últimos 12 meses, não no que a empresa gostaria que tivesse acontecido.';
    }
    return 'Se ficar entre duas opções, escolha a que você conseguiria sustentar com um exemplo simples hoje.';
  }

  function deriveCheckpointIntro(fn, checkpointNumber, totalCheckpoints) {
    if (checkpointNumber === 1) {
      return `Começamos pela base de ${fn.shortLabel.toLowerCase()} para entender se já existe direção prática e previsibilidade mínima.`;
    }
    if (checkpointNumber === totalCheckpoints) {
      return `Fechamos a missão com o que mais diferencia discurso de execução em ${fn.shortLabel.toLowerCase()}.`;
    }
    return `Este checkpoint aprofunda ${fn.shortLabel.toLowerCase()} e ajuda a separar intenção, rotina e evidência real.`;
  }

  function deriveMicroRewardCopy(fn, checkpointNumber, totalCheckpoints) {
    if (checkpointNumber === totalCheckpoints) {
      return `Missão quase concluída: este bloco fecha a leitura principal de ${fn.label.toLowerCase()} no relatório.`;
    }
    if (checkpointNumber === 1) {
      return `Bom começo: ao fechar este bloco, o relatório já ganha nitidez sobre ${fn.shortLabel.toLowerCase()}.`;
    }
    return 'Cada resposta aqui melhora a capacidade do relatório de priorizar ações sem depender de suposições.';
  }

  function deriveLossIfSkippedCopy(fn, checkpointNumber, totalCheckpoints) {
    if (checkpointNumber === totalCheckpoints) {
      return `Se este bloco ficar para depois, o relatório perde a camada final de confiança sobre ${fn.shortLabel.toLowerCase()}.`;
    }
    return `Se você parar aqui, a leitura de ${fn.shortLabel.toLowerCase()} fica parcial e algumas recomendações podem sair menos precisas.`;
  }

  function buildQuestion(row, index) {
    const [
      id,
      functionKeyText,
      capabilityText,
      type,
      prompt,
      optionValues,
      weight,
      evidenceExpected,
      uxTags,
    ] = row;

    const functionKeys = functionKeyText.split(',').map((item) => item.trim());
    const capabilityLabels = capabilityText.split(';').map((item) => item.trim());
    const capabilityKeys = capabilityLabels.map((label) => capabilityAlias[label]).filter(Boolean);
    const optionKeys = ['A', 'B', 'C', 'D', 'E'];
    const options = Object.fromEntries(optionKeys.map((key, optionIndex) => [key, optionValues[optionIndex]]));
    const serviceKeys = Array.from(
      new Set(
        functionKeys
          .flatMap((functionKey) => functionServiceMap[functionKey] || [])
          .concat(
            capabilityKeys.flatMap((capabilityKey) => {
              const capability = capabilities.find((item) => item.key === capabilityKey);
              return capability ? capability.serviceKeys : [];
            })
          )
      )
    );

    return {
      id,
      order: index + 1,
      title: deriveTitle(id, prompt),
      prompt,
      uiPromptShort: deriveUiPromptShort(prompt),
      businessPlainLanguage: deriveBusinessPlainLanguage(prompt),
      functionKeys,
      primaryFunctionKey: functionKeys[0],
      capabilities: capabilityKeys,
      capabilityLabels,
      type,
      options,
      optionKeys,
      weight,
      scoreMap: { ...scoreMap },
      evidenceExpected,
      uxTags: uxTags.split('+').map((item) => item.trim()),
      serviceKeys,
      riskWeight: weight,
      answerScale,
      coachHint: deriveCoachHint(type, weight),
      learnWhy: deriveLearnWhy(functionKeys, capabilityLabels),
      learnTip: deriveLearnTip(evidenceExpected),
      whoCanAnswer: deriveWhoCanAnswer(functionKeys),
      evidenceExamples: deriveEvidenceExamples(evidenceExpected),
      coachReassurance: deriveCoachReassurance(type, weight),
      checkpointId: '',
      checkpointLabel: '',
      checkpointIntro: '',
      orderInMission: 0,
      questionInCheckpoint: 0,
      questionsInCheckpoint: 0,
      checkpointTotal: 0,
      microRewardCopy: '',
      lossIfSkippedCopy: '',
      missionHeroAsset: '',
      checkpointVisualVariant: '',
    };
  }

  function enrichQuestionsWithCheckpoints(baseQuestions) {
    const nextQuestions = [];
    const checkpoints = [];

    functionOrder.forEach((functionKey) => {
      const fn = functions.find((item) => item.key === functionKey);
      const missionQuestions = baseQuestions
        .filter((question) => question.primaryFunctionKey === functionKey)
        .sort((left, right) => left.order - right.order);
      const totalCheckpoints = Math.ceil(missionQuestions.length / 2);

      for (let checkpointNumber = 1; checkpointNumber <= totalCheckpoints; checkpointNumber += 1) {
        const startIndex = (checkpointNumber - 1) * 2;
        const checkpointQuestions = missionQuestions.slice(startIndex, startIndex + 2);
        const checkpointId = `${functionKey}-CP-${String(checkpointNumber).padStart(2, '0')}`;
        const checkpointLabel = `Checkpoint ${checkpointNumber}`;
        const checkpointIntro = deriveCheckpointIntro(fn, checkpointNumber, totalCheckpoints);
        const microRewardCopy = deriveMicroRewardCopy(fn, checkpointNumber, totalCheckpoints);
        const lossIfSkippedCopy = deriveLossIfSkippedCopy(fn, checkpointNumber, totalCheckpoints);
        const checkpointVisualVariant = fn.visualVariant || 'orbits';

        checkpoints.push({
          id: checkpointId,
          functionKey,
          functionLabel: fn.label,
          order: checkpointNumber,
          label: checkpointLabel,
          intro: checkpointIntro,
          microRewardCopy,
          lossIfSkippedCopy,
          questionIds: checkpointQuestions.map((question) => question.id),
          visualVariant: checkpointVisualVariant,
          totalCheckpoints,
        });

        checkpointQuestions.forEach((question, index) => {
          nextQuestions.push({
            ...question,
            checkpointId,
            checkpointLabel,
            checkpointIntro,
            orderInMission: startIndex + index + 1,
            questionInCheckpoint: index + 1,
            questionsInCheckpoint: checkpointQuestions.length,
            checkpointTotal: totalCheckpoints,
            microRewardCopy,
            lossIfSkippedCopy,
            missionHeroAsset: '',
            checkpointVisualVariant,
          });
        });
      }
    });

    return {
      questions: nextQuestions.sort((left, right) => left.order - right.order),
      checkpoints,
    };
  }

  const maturityBands = [
    {
      min: 0,
      max: 0.99,
      label: 'Ausente',
      tierLabel: 'Ausente / abaixo do Tier 1',
      tier: 0,
      description: 'A operação ainda depende de improviso, baixa formalização e pouca previsibilidade.',
    },
    {
      min: 1,
      max: 1.99,
      label: 'Parcial',
      tierLabel: 'Tier 1',
      tier: 1,
      description:
        'Existem controles e iniciativas relevantes, mas a consistência ainda é fraca e muito dependente de pessoas.',
    },
    {
      min: 2,
      max: 2.99,
      label: 'Risco informado',
      tierLabel: 'Tier 2',
      tier: 2,
      description:
        'A empresa já decide com base em risco, porém ainda convive com lacunas de padrão, escala e evidência.',
    },
    {
      min: 3,
      max: 3.69,
      label: 'Repetível',
      tierLabel: 'Tier 3',
      tier: 3,
      description:
        'Os controles já operam com padrão, dono, cadência e sustentação mais previsível.',
    },
    {
      min: 3.7,
      max: 4,
      label: 'Adaptativo',
      tierLabel: 'Tier 4',
      tier: 4,
      description:
        'A segurança aprende rápido, mede evolução e ajusta controles continuamente com o negócio.',
    },
  ];

  const checkpointBundle = enrichQuestionsWithCheckpoints(questionRows.map(buildQuestion));

  window.NAVE_CONTENT = {
    appMeta: {
      name: 'N.A.V.E',
      subtitle: 'Nist para Avaliação de Vulnerabilidades e Estratégia',
      company: 'Active Solutions',
      dataVersion: '2.2.0',
      brandAssets: {
        logoColor: './assets/logo-active-color.jpg',
        logoNegative: './assets/logo-active-negative.jpg',
      },
      tagline:
        'Assessment executivo, guiado e progressivo para traduzir maturidade em prioridade, clareza e próximos passos.',
      promise:
        'Checkpoints leves, seis missões do CSF 2.0 e um relatório consultivo que transforma respostas complexas em decisões mais claras.',
      assessmentMode: 'complete',
      specialistMessage:
        'Olá! Estou preenchendo o assessment NAVE e gostaria de falar com um especialista da Active Solutions.',
      reportPromise:
        'Ao final, a empresa recebe leitura de maturidade, tier, lacunas prioritárias, roadmap 30-60-90 dias e os serviços da Active Solutions que mais ajudam agora.',
    },
    scoreMap,
    answerScale,
    functionOrder,
    functionServiceMap,
    functions,
    checkpoints: checkpointBundle.checkpoints,
    capabilities,
    services,
    maturityBands,
    questions: checkpointBundle.questions,
    feedbackMessages: {
      highRisk:
        'Risco alto: aqui vale agir rápido. Dono claro, rotina mínima, evidência simples e prazo definido costumam gerar o maior ganho imediato.',
      warning:
        'Há espaço relevante para fortalecer este ponto. O próximo salto geralmente vem de reduzir exceções e padronizar a operação.',
      mid:
        'Boa base: existe progresso real aqui. O próximo nível vem de ganhar cadência, medição e menos dependência de memória.',
      strong:
        'Maturidade forte: isso já está consistente. Agora vale transformar essa base em melhoria contínua e vantagem operacional.',
    },
  };
})();
