(function () {
  const root = document.getElementById('app');
  const baseContent = window.NAVE_CONTENT;

  if (!root || !baseContent) {
    return;
  }

  const runtimeDefaults = {
    rdAdapterUrl: '',
    specialistWhatsApp: '5511991559361',
    rdSource: 'NAVE',
    rdTag: 'nave-assessment',
    appVersion: '3.0.0',
    calendarUrl: '',
    productEventHook: '',
  };

  window.NAVE_RUNTIME_CONFIG = {
    ...runtimeDefaults,
    ...(window.NAVE_RUNTIME_CONFIG || {}),
  };

  const config = window.NAVE_RUNTIME_CONFIG;
  const storageKey = 'nave-active-solutions-v3';
  const focusableSelector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const uiToneByOption = {
    A: 'critical',
    B: 'warning',
    C: 'mid',
    D: 'strong',
    E: 'elite',
  };
  const uiLabelByOption = {
    A: 'Sem padrão',
    B: 'Parcial',
    C: 'Funciona',
    D: 'Consistente',
    E: 'Evolução contínua',
  };
  const scoreFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const percentFormatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  });
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let content = null;
  let questions = [];
  let questionsById = {};
  let functionsByKey = {};
  let capabilitiesByKey = {};
  let servicesByKey = {};
  let state = null;
  let fabIdleTimer = 0;
  let fabHelpTimer = 0;
  let focusRestoreSelector = '';
  let lastQuestionViewId = '';

  boot();

  async function boot() {
    const [segmentRiskMap, serviceEnhancements] = await Promise.all([
      fetchJsonMaybe('./segmentRiskMap.json'),
      fetchJsonMaybe('./services.ptbr.json'),
    ]);

    content = hydrateContent(baseContent, {
      segmentRiskMap,
      serviceEnhancements,
    });
    questions = content.questions.slice().sort((left, right) => left.order - right.order);
    questionsById = Object.fromEntries(questions.map((item) => [item.id, item]));
    functionsByKey = Object.fromEntries(content.functions.map((item) => [item.key, item]));
    capabilitiesByKey = Object.fromEntries(content.capabilities.map((item) => [item.key, item]));
    servicesByKey = content.services;

    state = loadState();
    syncDerivedState();
    bindEvents();
    render();
    if (state.startedAt && (isLeadReady(state.profile) || getAnsweredCount(state.answers))) {
      emitProductEvent('resume_session', {
        answered: getAnsweredCount(state.answers),
        screen: state.screen,
      });
    }
    flushPendingSubmissions({ silent: true });
  }

  /* CONTENT */

  function hydrateContent(base, external) {
    const riskMap = external.segmentRiskMap || getDefaultSegmentRiskMap();
    const services = hydrateServices(
      base.services,
      base.capabilities,
      external.serviceEnhancements || {}
    );
    const hydratedQuestions = base.questions.map((question) => hydrateQuestion(question));

    return {
      ...base,
      appMeta: {
        ...base.appMeta,
        dataVersion: '3.0.0',
        tagline:
          'Assessment executivo gamificado para traduzir risco em prioridade, clareza e próximo passo comercial.',
        promise:
          'Uma pergunta por vez, sem tecnês, com leitura personalizada pelo seu contexto e um fechamento em ação.',
      },
      segmentRiskMap: riskMap,
      services,
      questions: hydratedQuestions,
    };
  }

  function hydrateQuestion(question) {
    return {
      ...question,
      shortTitle: cleanQuestionTitle(question),
      help: {
        explain: question.learnWhy || question.businessPlainLanguage || question.prompt,
        examples: question.evidenceExamples || [],
        whoCanAnswer: question.whoCanAnswer || '',
        learnTip: question.learnTip || question.evidenceExpected || '',
      },
      uiOptions: [
        {
          uiKey: 'A',
          title: uiLabelByOption.A,
          subtitle: question.options.A,
          mapsToInternalScore: 0,
        },
        {
          uiKey: 'B',
          title: uiLabelByOption.B,
          subtitle: question.options.B,
          mapsToInternalScore: 1,
        },
        {
          uiKey: 'C',
          title: uiLabelByOption.C,
          subtitle: question.options.C,
          mapsToInternalScore: 2,
        },
        {
          uiKey: 'Dplus',
          title: 'Consistente',
          subtitle: question.options.D,
          mapsToInternalScore: 3,
          followUp: {
            label: 'Evolução contínua',
            subtitle: question.options.E,
            mapsToInternalScore: 4,
            microcopy:
              'Excelente. Aqui já existe base para uma leitura próxima de Tier 4 quando a melhoria contínua é comprovada.',
          },
        },
      ],
      evidenceHint: question.evidenceExpected || '',
    };
  }

  function hydrateServices(baseServices, capabilities, enhancements) {
    const capabilityServiceMap = {};
    capabilities.forEach((capability) => {
      capability.serviceKeys.forEach((serviceKey) => {
        if (!capabilityServiceMap[serviceKey]) {
          capabilityServiceMap[serviceKey] = [];
        }
        capabilityServiceMap[serviceKey].push(capability.key);
      });
    });

    return Object.fromEntries(
      Object.entries(baseServices).map(([serviceKey, service]) => {
        const extra = enhancements[serviceKey] || {};
        const fallbackFunctions = inferFunctionsByArea(service.area);
        const fallbackSignals = capabilityServiceMap[serviceKey] || [];

        return [
          serviceKey,
          {
            ...service,
            ...extra,
            serviceKey,
            nistFunctions: extra.nistFunctions || fallbackFunctions,
            fitSignals: extra.fitSignals || fallbackSignals,
            whenItMakesSense:
              extra.whenItMakesSense || service.contactPitch || service.description || service.summary,
            cta: {
              learnMoreLabel: 'Saiba mais',
              scheduleLabel: 'Agendar bate-papo',
              ...((extra && extra.cta) || {}),
            },
          },
        ];
      })
    );
  }

  function inferFunctionsByArea(area) {
    const areaMap = {
      Govern: ['GV'],
      Identify: ['ID'],
      Protect: ['PR'],
      Detect: ['DE'],
      Respond: ['RS'],
      Recover: ['RC'],
    };
    return areaMap[area] || [];
  }

  function cleanQuestionTitle(question) {
    const base =
      question.businessPlainLanguage ||
      question.uiPromptShort ||
      question.prompt ||
      question.title ||
      '';
    return base.replace(/\s+/g, ' ').trim();
  }

  async function fetchJsonMaybe(path) {
    if (typeof window.fetch !== 'function') {
      return null;
    }
    try {
      const response = await window.fetch(path, { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function getDefaultSegmentRiskMap() {
    return {
      high: ['saude', 'financeiro', 'governo', 'setor publico', 'educacao'],
      medium: ['tecnologia', 'industria', 'varejo', 'servicos', 'logistica'],
      low: ['agro', 'construcao', 'imobiliario', 'turismo'],
    };
  }

  /* STATE */

  function defaultProfile() {
    return {
      name: '',
      role: '',
      email: '',
      company: '',
      size: '',
      segment: '',
      phone: '',
    };
  }

  function createSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `nave-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function defaultState() {
    return {
      version: content.appMeta.dataVersion,
      sessionId: createSessionId(),
      screen: 'landing',
      profile: defaultProfile(),
      leadContext: null,
      answers: {},
      currentQuestionId: questions[0]?.id || '',
      startedAt: null,
      completedAt: null,
      lastSavedAt: null,
      submissionQueue: [],
      sentStatuses: {
        started: false,
        completed: false,
      },
      reportDirty: false,
      notice: null,
      helpPanel: '',
      reviewOpen: false,
      reviewOrigin: 'assessment',
      serviceDetailKey: '',
      fabNudge: '',
      touchedFields: {},
      leadAttempted: false,
      online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return defaultState();
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== content.appMeta.dataVersion) {
        return defaultState();
      }
      const base = defaultState();
      return {
        ...base,
        ...parsed,
        profile: { ...base.profile, ...(parsed.profile || {}) },
        leadContext: parsed.leadContext || null,
        answers: parsed.answers || {},
        sentStatuses: { ...base.sentStatuses, ...(parsed.sentStatuses || {}) },
        submissionQueue: Array.isArray(parsed.submissionQueue) ? parsed.submissionQueue : [],
        online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
        notice: null,
        helpPanel: '',
        reviewOpen: false,
        reviewOrigin: parsed.reviewOrigin || 'assessment',
        serviceDetailKey: '',
        fabNudge: '',
        touchedFields: {},
        leadAttempted: false,
      };
    } catch (error) {
      return defaultState();
    }
  }

  function syncDerivedState() {
    if (state.profile && Object.values(state.profile).some((value) => String(value || '').trim())) {
      state.leadContext = buildLeadContext(state.profile);
    }

    if (!questionsById[state.currentQuestionId]) {
      state.currentQuestionId = questions[0]?.id || '';
    }

    if (state.screen === 'results' && !allQuestionsAnswered()) {
      state.screen = 'assessment';
    }

    if (state.screen === 'assessment' && !isLeadReady()) {
      state.screen = 'lead';
    }
  }

  function getPersistableState() {
    return {
      version: content.appMeta.dataVersion,
      sessionId: state.sessionId,
      screen: state.screen,
      profile: state.profile,
      leadContext: state.leadContext,
      answers: state.answers,
      currentQuestionId: state.currentQuestionId,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      lastSavedAt: Date.now(),
      submissionQueue: state.submissionQueue,
      sentStatuses: state.sentStatuses,
      reportDirty: state.reportDirty,
      reviewOrigin: state.reviewOrigin,
    };
  }

  function saveState() {
    state.lastSavedAt = Date.now();
    window.localStorage.setItem(storageKey, JSON.stringify(getPersistableState()));
  }

  function persistAndRender() {
    saveState();
    render();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeLookup(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function normalizePhoneDigits(rawValue) {
    const digits = String(rawValue || '').replace(/\D/g, '');
    if (!digits) {
      return '';
    }
    if (digits.startsWith('55')) {
      return digits;
    }
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    return digits;
  }

  function formatPhoneDisplay(rawValue) {
    let digits = String(rawValue || '').replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length > 11) {
      digits = digits.slice(2);
    }
    digits = digits.slice(0, 11);
    if (!digits) {
      return '';
    }
    if (digits.length < 3) {
      return `(${digits}`;
    }
    if (digits.length < 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length < 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  /* CONTEXT */

  function getSizeBand(size) {
    const normalized = normalizeLookup(size);
    if (!normalized) {
      return 'unknown';
    }
    if (normalized.includes('ate 50') || normalized.includes('<50')) {
      return 'micro';
    }
    if (normalized.includes('51 a 200') || normalized.includes('200')) {
      return 'small';
    }
    if (normalized.includes('201 a 500') || normalized.includes('500')) {
      return 'mid';
    }
    if (normalized.includes('501 a 1000') || normalized.includes('1.000')) {
      return 'large';
    }
    if (normalized.includes('acima de 1000')) {
      return 'enterprise';
    }
    return 'mid';
  }

  function getRoleGroup(role) {
    const normalized = normalizeLookup(role);
    if (
      normalized.includes('ti') ||
      normalized.includes('security') ||
      normalized.includes('infra') ||
      normalized.includes('ciso') ||
      normalized.includes('tecnologia')
    ) {
      return 'tech';
    }
    return 'exec';
  }

  function getSegmentRisk(segment) {
    const normalized = normalizeLookup(segment);
    const riskMap = content.segmentRiskMap || getDefaultSegmentRiskMap();
    const groups = ['high', 'medium', 'low'];
    for (const group of groups) {
      const matches = riskMap[group] || [];
      if (matches.some((item) => normalized.includes(normalizeLookup(item)))) {
        return group;
      }
    }
    return 'medium';
  }

  function getExpectedTierForLead(leadContext) {
    if (!leadContext) {
      return 2;
    }
    if (leadContext.segmentRisk === 'high') {
      return 3;
    }
    if (leadContext.sizeBand === 'micro') {
      return 2;
    }
    if (leadContext.sizeBand === 'enterprise') {
      return 3;
    }
    return 3;
  }

  function buildLeadContext(profile) {
    const firstName = String(profile.name || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    const sizeBand = getSizeBand(profile.size);
    const segmentRisk = getSegmentRisk(profile.segment);
    const roleGroup = getRoleGroup(profile.role);
    const toneStyle = roleGroup === 'tech' ? 'executivo-com-contexto-tecnico' : 'executivo-direto';
    const assessmentMode = sizeBand === 'micro' ? 'compact' : 'complete';

    const leadContext = {
      name: String(profile.name || '').trim(),
      firstName,
      role: String(profile.role || '').trim(),
      company: String(profile.company || '').trim(),
      size: String(profile.size || '').trim(),
      sizeBand,
      segment: String(profile.segment || '').trim(),
      email: String(profile.email || '').trim(),
      phone: String(profile.phone || '').trim(),
      phoneDigits: normalizePhoneDigits(profile.phone),
      segmentRisk,
      roleGroup,
      toneStyle,
      assessmentMode,
      expectedTier: 2,
    };

    leadContext.expectedTier = getExpectedTierForLead(leadContext);
    return leadContext;
  }

  function validateLead(profile) {
    const errors = {};
    const email = String(profile.email || '').trim();
    const phoneDigits = normalizePhoneDigits(profile.phone);

    if (!String(profile.name || '').trim()) {
      errors.name = 'Digite seu nome.';
    }
    if (!String(profile.role || '').trim()) {
      errors.role = 'Digite seu cargo.';
    }
    if (!email) {
      errors.email = 'Digite seu e-mail profissional.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Use um e-mail válido.';
    }
    if (!String(profile.company || '').trim()) {
      errors.company = 'Digite o nome da empresa.';
    }
    if (!String(profile.size || '').trim()) {
      errors.size = 'Selecione o porte.';
    }
    if (!String(profile.segment || '').trim()) {
      errors.segment = 'Selecione o segmento.';
    }
    if (String(profile.phone || '').trim() && phoneDigits.length < 12) {
      errors.phone = 'Confira o telefone ou WhatsApp informado.';
    }
    return errors;
  }

  function isLeadReady(profile) {
    return Object.keys(validateLead(profile || state.profile)).length === 0;
  }

  function getCurrentQuestion() {
    return questionsById[state.currentQuestionId] || questions[0] || null;
  }

  function getCurrentQuestionIndex() {
    const currentQuestion = getCurrentQuestion();
    return currentQuestion ? questions.findIndex((item) => item.id === currentQuestion.id) : 0;
  }

  function getQuestionsInMission(functionKey) {
    return questions.filter((question) => question.primaryFunctionKey === functionKey);
  }

  function getCurrentMission() {
    const currentQuestion = getCurrentQuestion();
    return currentQuestion ? functionsByKey[currentQuestion.primaryFunctionKey] : content.functions[0];
  }

  function getAnswer(questionId, answers) {
    const map = answers || state.answers;
    const answer = map[questionId];
    return answer && typeof answer.score === 'number' ? answer : null;
  }

  function getAnsweredCount(answers) {
    return questions.filter((question) => getAnswer(question.id, answers)).length;
  }

  function allQuestionsAnswered(answers) {
    return getAnsweredCount(answers) === questions.length;
  }

  function getCompletionPercent(answers) {
    return (getAnsweredCount(answers) / questions.length) * 100;
  }

  function getMissionProgress(functionKey, answers) {
    const missionQuestions = getQuestionsInMission(functionKey);
    const answered = missionQuestions.filter((question) => getAnswer(question.id, answers)).length;
    return {
      answered,
      total: missionQuestions.length,
      percent: missionQuestions.length ? (answered / missionQuestions.length) * 100 : 0,
    };
  }

  function getExecutiveRoleCopy() {
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    if (leadContext.role && leadContext.firstName) {
      return `${leadContext.firstName}, para você como ${leadContext.role}, a leitura foi desenhada para apoiar decisão sem exigir detalhe técnico.`;
    }
    if (leadContext.role) {
      return `Para quem atua como ${leadContext.role}, esta leitura privilegia dono, rotina e evidência.`;
    }
    return 'A leitura foi montada para uma liderança que precisa decidir com clareza, e não mergulhar no detalhe técnico.';
  }

  function getQuestionContextCopy(question) {
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    if (leadContext.role && leadContext.size) {
      return `Para ${leadContext.role} em uma empresa de ${leadContext.size.toLowerCase()}, esta pergunta costuma ser respondida melhor quando visão de negócio e validação técnica se encontram.`;
    }
    if (leadContext.role) {
      return `Para ${leadContext.role}, o principal aqui é saber se existe dono, rotina e evidência simples.`;
    }
    return 'Se isso parecer técnico demais, tudo bem. Foque no que realmente acontece hoje e em quem conseguiria provar essa prática.';
  }

  function getQuestionPromptCopy(question) {
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    if (leadContext.roleGroup === 'tech') {
      return 'Considere também exceções, acessos de maior privilégio e o que realmente tem cobertura hoje.';
    }
    if (leadContext.sizeBand === 'micro') {
      return 'Para empresas do seu porte, o essencial aqui é saber se existe dono, rotina mínima e alguma evidência prática.';
    }
    return 'Você não precisa do detalhe técnico. Foque no que é regra, no que é exceção e no que conseguiria ser demonstrado hoje.';
  }

  function getCurrentCheckpointLabel(question) {
    const totalQuestionsInMission = getQuestionsInMission(question.primaryFunctionKey).length;
    const checkpointTotal = Math.ceil(totalQuestionsInMission / 2);
    const checkpointIndex = Math.ceil(question.orderInMission / 2);
    return `Checkpoint ${checkpointIndex} de ${checkpointTotal}`;
  }

  function getQuestionDisplayOption(answer) {
    if (!answer) {
      return 'Pendente';
    }
    return uiLabelByOption[answer.selectedOption] || 'Respondida';
  }

  /* SCORE */

  function getRiskMultiplier(question, leadContext) {
    const context = leadContext || state.leadContext || buildLeadContext(state.profile);
    let multiplier = 1;

    if (context.segmentRisk === 'high') {
      if (question.capabilities.includes('personal-data-governance')) {
        multiplier *= 1.25;
      }
      if (
        question.capabilities.includes('access-protection') ||
        question.capabilities.includes('critical-identity')
      ) {
        multiplier *= 1.2;
      }
      if (question.functionKeys.some((item) => item === 'DE' || item === 'RS')) {
        multiplier *= 1.15;
      }
    }

    if (context.sizeBand === 'micro') {
      const isEssentialControl =
        question.capabilities.includes('access-protection') ||
        question.capabilities.includes('critical-identity') ||
        question.primaryFunctionKey === 'RC';
      if (question.primaryFunctionKey === 'GV' && !isEssentialControl) {
        multiplier *= 0.9;
      }
    }

    return Number(multiplier.toFixed(4));
  }

  function getWeightedAverage(questionList, answers, leadContext) {
    let totalWeight = 0;
    let weightedScore = 0;

    questionList.forEach((question) => {
      const answer = getAnswer(question.id, answers);
      if (!answer) {
        return;
      }
      const effectiveWeight = question.weight * getRiskMultiplier(question, leadContext);
      totalWeight += effectiveWeight;
      weightedScore += answer.score * effectiveWeight;
    });

    if (!totalWeight) {
      return null;
    }

    return weightedScore / totalWeight;
  }

  function getTierMeta(score) {
    const bands = [
      {
        min: 0,
        max: 0.99,
        tier: 0,
        label: 'Abaixo do Tier 1',
        shortLabel: 'Base inicial',
        description: 'A operação ainda depende mais de improviso do que de previsibilidade.',
      },
      {
        min: 1,
        max: 1.99,
        tier: 1,
        label: 'Tier 1 - Partial',
        shortLabel: 'Parcial',
        description: 'Já existem iniciativas relevantes, mas a consistência ainda é frágil.',
      },
      {
        min: 2,
        max: 2.99,
        tier: 2,
        label: 'Tier 2 - Risk Informed',
        shortLabel: 'Risco informado',
        description: 'A empresa decide com base em risco, mas ainda convive com lacunas de escala e evidência.',
      },
      {
        min: 3,
        max: 3.69,
        tier: 3,
        label: 'Tier 3 - Repeatable',
        shortLabel: 'Repetível',
        description: 'Os controles já operam com dono, cadência e padrão mais previsível.',
      },
      {
        min: 3.7,
        max: 4,
        tier: 4,
        label: 'Tier 4 - Adaptive',
        shortLabel: 'Adaptativo',
        description: 'Existe aprendizado contínuo, medição e ajuste mais rápido com o negócio.',
      },
    ];

    return (
      bands.find((item) => score >= item.min && score <= item.max) ||
      bands[bands.length - 1]
    );
  }

  function rankServices(gaps, leadContext) {
    const rankings = new Map();

    Object.values(servicesByKey).forEach((service) => {
      rankings.set(service.serviceKey || service.key, {
        ...service,
        score: 0,
        gapIds: new Set(),
        capabilityHits: new Map(),
        functionHits: new Map(),
      });
    });

    gaps.forEach((gap) => {
      Object.values(servicesByKey).forEach((service) => {
        const key = service.serviceKey || service.key;
        const fitSignals = service.fitSignals || [];
        const nistFunctions = service.nistFunctions || [];
        const matchesCapabilities = gap.capabilities.some((item) => fitSignals.includes(item));
        const matchesFunctions = gap.functionKeys.some((item) => nistFunctions.includes(item));

        if (!matchesCapabilities && !matchesFunctions) {
          return;
        }

        let score = 0;
        if (matchesCapabilities) {
          score += gap.gapScore;
        }
        if (matchesCapabilities && matchesFunctions) {
          score += gap.gapScore * 0.12;
        } else if (!matchesCapabilities && matchesFunctions && gap.weight === 3) {
          score += gap.gapScore * 0.1;
        }

        if (!score) {
          return;
        }

        const ranking = rankings.get(key);
        ranking.score += score;
        ranking.gapIds.add(gap.id);
        gap.capabilities.forEach((capabilityKey) => {
          if (fitSignals.includes(capabilityKey)) {
            ranking.capabilityHits.set(
              capabilityKey,
              (ranking.capabilityHits.get(capabilityKey) || 0) + score
            );
          }
        });
        gap.functionKeys.forEach((functionKey) => {
          if (nistFunctions.includes(functionKey)) {
            ranking.functionHits.set(functionKey, (ranking.functionHits.get(functionKey) || 0) + score);
          }
        });
      });
    });

    return Array.from(rankings.values())
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((service) => {
        const topCapability = Array.from(service.capabilityHits.entries()).sort(
          (left, right) => right[1] - left[1]
        )[0];
        const topFunction = Array.from(service.functionHits.entries()).sort(
          (left, right) => right[1] - left[1]
        )[0];
        const capabilityLabel = topCapability ? capabilitiesByKey[topCapability[0]]?.label : '';
        const functionLabel = topFunction ? functionsByKey[topFunction[0]]?.label : '';
        const whyAppeared = capabilityLabel
          ? `Apareceu porque as respostas mostram lacunas em ${capabilityLabel.toLowerCase()} e isso amplia o impacto sobre ${functionLabel ? functionLabel.toLowerCase() : 'a operação'}.`
          : `Apareceu porque a missão ${functionLabel ? functionLabel.toLowerCase() : 'mais sensível'} ainda pede mais previsibilidade para o seu contexto.`;
        const businessValue = `No seu setor (${leadContext.segment || 'não informado'}) e porte (${leadContext.size || 'não informado'}), esta costuma ser uma das frentes com melhor relação entre clareza, ritmo e redução de risco.`;

        return {
          ...service,
          whyAppeared,
          businessValue,
          relatedGaps: gaps.filter((gap) => service.gapIds.has(gap.id)).slice(0, 3),
          relatedCapabilities: Array.from(service.capabilityHits.keys())
            .map((item) => capabilitiesByKey[item]?.shortLabel || capabilitiesByKey[item]?.label)
            .filter(Boolean),
        };
      });
  }

  function computeResultsModel(answers, leadContext) {
    const activeAnswers = answers || state.answers;
    const activeLead = leadContext || state.leadContext || buildLeadContext(state.profile);
    const overallScore = getWeightedAverage(questions, activeAnswers, activeLead) || 0;
    const observedTier = getTierMeta(overallScore);
    const expectedTier = activeLead.expectedTier || getExpectedTierForLead(activeLead);

    const functionMetrics = content.functions.map((item) => {
      const relatedQuestions = questions.filter((question) => question.functionKeys.includes(item.key));
      return {
        key: item.key,
        meta: item,
        answered: relatedQuestions.filter((question) => getAnswer(question.id, activeAnswers)).length,
        total: relatedQuestions.length,
        score: getWeightedAverage(relatedQuestions, activeAnswers, activeLead),
      };
    });

    const capabilityMetrics = content.capabilities.map((item) => {
      const relatedQuestions = questions.filter((question) => question.capabilities.includes(item.key));
      return {
        key: item.key,
        meta: item,
        answered: relatedQuestions.filter((question) => getAnswer(question.id, activeAnswers)).length,
        total: relatedQuestions.length,
        score: getWeightedAverage(relatedQuestions, activeAnswers, activeLead),
      };
    });

    const gaps = questions
      .map((question) => {
        const answer = getAnswer(question.id, activeAnswers);
        if (!answer) {
          return null;
        }
        const multiplier = getRiskMultiplier(question, activeLead);
        return {
          id: question.id,
          title: question.shortTitle,
          prompt: question.prompt,
          score: answer.score,
          selectedOption: answer.selectedOption,
          weight: question.weight,
          multiplier,
          gapScore: (4 - answer.score) * question.weight * multiplier,
          functionKeys: question.functionKeys,
          functionNames: question.functionKeys.map((item) => functionsByKey[item]?.label).filter(Boolean),
          capabilities: question.capabilities,
          capabilityNames: question.capabilityLabels,
          evidence: answer.evidence || '',
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.gapScore - left.gapScore || left.score - right.score);

    const recommendedServices = rankServices(gaps, activeLead);
    const topServices = recommendedServices.slice(0, 3);
    const otherServices = recommendedServices.slice(3, 7);
    const weakestFunction = functionMetrics
      .filter((item) => Number.isFinite(item.score))
      .slice()
      .sort((left, right) => left.score - right.score)[0];
    const strongestFunction = functionMetrics
      .filter((item) => Number.isFinite(item.score))
      .slice()
      .sort((left, right) => right.score - left.score)[0];
    const weakestCapability = capabilityMetrics
      .filter((item) => Number.isFinite(item.score))
      .slice()
      .sort((left, right) => left.score - right.score)[0];
    const tierGap = Math.max(expectedTier - observedTier.tier, 0);
    const executivePercent = Math.round((overallScore / 4) * 100);
    const topGaps = gaps.slice(0, 3);

    const insights = [
      {
        title: tierGap > 0 ? 'Existe espaço claro entre o estágio atual e o esperado.' : 'A leitura já está próxima do rigor esperado para o seu contexto.',
        body:
          tierGap > 0
            ? `Hoje o N.A.V.E enxerga ${observedTier.label} e, para ${activeLead.segment || 'o seu contexto'}, o alvo mais natural é Tier ${expectedTier}.`
            : `O score atual sugere uma operação mais próxima do rigor esperado para ${activeLead.segment || 'o seu cenário'}.`,
      },
      {
        title: weakestFunction
          ? `${weakestFunction.meta.label} concentra a maior tensão agora.`
          : 'As respostas já criam uma boa leitura inicial.',
        body: weakestFunction
          ? 'É a missão com mais espaço de evolução imediata, principalmente para reduzir atrito e surpresa na operação.'
          : 'Com o assessment completo, a próxima etapa é transformar leitura em priorização prática.',
      },
      {
        title: topServices[0]
          ? `${topServices[0].name} aparece como a alavanca mais aderente agora.`
          : 'O próximo passo é aprofundar as prioridades com um especialista.',
        body: topServices[0]
          ? topServices[0].whyAppeared
          : 'Assim fica mais fácil converter o diagnóstico em plano de ação de curto prazo.',
      },
    ];

    const roadmap = [
      {
        phase: '30 dias',
        title: 'Fechar exposições mais sensíveis',
        items: topGaps.slice(0, 2).map((gap) => `Dar dono, prazo e evidência simples para ${gap.title.toLowerCase()}.`),
      },
      {
        phase: '60 dias',
        title: 'Dar padrão ao que ainda depende de esforço manual',
        items:
          topServices[0]
            ? topServices[0].deliverables.slice(0, 2)
            : ['Consolidar rotina, critério e revisão nas capacidades mais críticas.'],
      },
      {
        phase: '90 dias',
        title: 'Transformar evolução em previsibilidade',
        items: [
          strongestFunction
            ? `Usar a base mais consistente de ${strongestFunction.meta.label.toLowerCase()} para acelerar as demais missões.`
            : 'Transformar a leitura atual em plano trimestral de evolução.',
          'Revisar indicadores, exceções e aprendizados para sustentar a melhoria contínua.',
        ],
      },
    ];

    return {
      leadContext: activeLead,
      overallScore,
      executivePercent,
      observedTier,
      expectedTier,
      tierGap,
      functionMetrics,
      capabilityMetrics,
      weakestFunction,
      weakestCapability,
      strongestFunction,
      gaps,
      topGaps,
      recommendedServices,
      topServices,
      otherServices,
      insights,
      roadmap,
    };
  }

  function formatScore(value) {
    return Number.isFinite(value) ? scoreFormatter.format(value) : '-';
  }

  function formatPercent(value) {
    return `${percentFormatter.format(Math.max(0, Math.round(value)))}%`;
  }

  function formatTime(value) {
    if (!value) {
      return 'agora';
    }
    return timeFormatter.format(new Date(value));
  }

  /* SUBMISSION */

  function humanJoin(items) {
    const list = (items || []).filter(Boolean);
    if (!list.length) {
      return '';
    }
    if (list.length === 1) {
      return list[0];
    }
    if (list.length === 2) {
      return `${list[0]} e ${list[1]}`;
    }
    return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
  }

  function getMicroFeedback(question, answer) {
    if (!question || !answer) {
      return null;
    }

    if ((answer.selectedOption === 'A' || answer.selectedOption === 'B') && question.weight === 3) {
      return {
        tone: 'risk',
        title: 'Aqui existe uma exposição que merece atenção prática.',
        body:
          question.lossIfSkippedCopy ||
          'Não é sobre perfeição. É um sinal claro de que vale dar dono, regra mínima e evidência simples para reduzir surpresa.',
      };
    }

    if (answer.selectedOption === 'C') {
      return {
        tone: 'mid',
        title: 'Boa base. Agora o ganho está em tornar isso mais previsível.',
        body:
          question.coachReassurance ||
          'Isso já mostra intenção e alguma disciplina. O próximo salto costuma vir com mais cadência, clareza e menos exceção.',
      };
    }

    return {
      tone: 'good',
      title:
        answer.selectedOption === 'E'
          ? 'Excelente. Isso já sugere evolução contínua.'
          : 'Ótimo. Há consistência real nessa frente.',
      body:
        question.microRewardCopy ||
        'Quando isso está bem resolvido, o relatório consegue separar melhor o que é base sólida do que ainda depende de esforço manual.',
    };
  }

  function setNotice(tone, text) {
    state.notice = text
      ? {
          tone,
          text,
          id: Date.now(),
        }
      : null;
    saveState();
    render();
  }

  function clearNotice() {
    if (!state.notice) {
      return;
    }
    state.notice = null;
    saveState();
    render();
  }

  function emitProductEvent(type, payload) {
    const detail = {
      type,
      payload: payload || {},
      screen: state?.screen || 'landing',
      sessionId: state?.sessionId || '',
      timestamp: new Date().toISOString(),
    };

    try {
      document.dispatchEvent(
        new CustomEvent('nave:product-event', {
          detail,
        })
      );
    } catch (error) {
      // noop
    }

    try {
      if (typeof config.productEventHook === 'function') {
        config.productEventHook(detail);
      } else if (
        typeof config.productEventHook === 'string' &&
        config.productEventHook &&
        typeof window.fetch === 'function'
      ) {
        window.fetch(config.productEventHook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detail),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (error) {
      // noop
    }

    try {
      console.info('[NAVE]', type, detail.payload);
    } catch (error) {
      // noop
    }
  }

  function buildWhatsAppMessage(extraLines) {
    const lines = [content.appMeta.specialistMessage];
    const leadContext = state.leadContext || buildLeadContext(state.profile);

    if (leadContext.name) {
      lines.push(`Nome: ${leadContext.name}`);
    }
    if (leadContext.role) {
      lines.push(`Cargo: ${leadContext.role}`);
    }
    if (leadContext.company) {
      lines.push(`Empresa: ${leadContext.company}`);
    }
    if (Array.isArray(extraLines)) {
      lines.push(...extraLines.filter(Boolean));
    }

    return lines.filter(Boolean).join('\n');
  }

  function buildWhatsAppUrl(extraLines) {
    return `https://wa.me/${config.specialistWhatsApp}?text=${encodeURIComponent(
      buildWhatsAppMessage(extraLines)
    )}`;
  }

  function buildResultsWhatsAppLines(service) {
    const model = computeResultsModel();
    const lines = [
      `Resultado atual: ${formatPercent(model.executivePercent)}.`,
      `Tier observado: ${model.observedTier.label}.`,
      `Tier esperado para o contexto: Tier ${model.expectedTier}.`,
    ];

    if (model.topGaps[0]) {
      lines.push(`Lacuna mais sensível: ${model.topGaps[0].title}.`);
    }
    if (service) {
      lines.push(`Quero entender melhor o serviço: ${service.name}.`);
    } else {
      lines.push('Quero discutir o relatório e os próximos passos com um especialista.');
    }

    return lines;
  }

  function getSyncStatus() {
    if (!state.online) {
      return {
        tone: 'offline',
        label: 'Offline',
        detail: 'As respostas continuam salvas localmente.',
      };
    }

    if (state.submissionQueue.length) {
      return {
        tone: 'pending',
        label: `Envio pendente (${state.submissionQueue.length})`,
        detail: 'Vamos reenviar assim que houver conexão e adapter disponível.',
      };
    }

    if (state.sentStatuses.completed) {
      return {
        tone: 'success',
        label: 'Sincronizado',
        detail: 'Lead e relatório já foram preparados para o adapter.',
      };
    }

    if (state.sentStatuses.started) {
      return {
        tone: 'active',
        label: 'Jornada salva',
        detail: 'O contexto do lead já foi registrado.',
      };
    }

    return {
      tone: 'idle',
      label: 'Pronto',
      detail: 'Nenhum envio foi iniciado ainda.',
    };
  }

  function buildPayload(status) {
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    const model = computeResultsModel();
    const answers = questions
      .map((question) => {
        const answer = getAnswer(question.id);
        if (!answer) {
          return null;
        }
        return {
          questionId: question.id,
          functionKeys: question.functionKeys,
          capabilities: question.capabilities,
          weight: question.weight,
          selectedOption: answer.selectedOption,
          score: answer.score,
          evidence: answer.evidence || '',
        };
      })
      .filter(Boolean);

    return {
      status,
      lead: {
        name: leadContext.name,
        role: leadContext.role,
        email: leadContext.email,
        company: leadContext.company,
        size: leadContext.size,
        segment: leadContext.segment,
        phone: leadContext.phone,
        phoneDigits: leadContext.phoneDigits,
      },
      context: {
        segmentRisk: leadContext.segmentRisk,
        expectedTier: leadContext.expectedTier,
        toneStyle: leadContext.toneStyle,
        assessmentMode: leadContext.assessmentMode,
      },
      session: {
        sessionId: state.sessionId,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        mode: 'complete',
        appVersion: config.appVersion,
      },
      answers,
      scores: {
        overall: model.overallScore,
        executivePercent: model.executivePercent,
        tier: model.observedTier.tier,
        tierObserved: model.observedTier.tier,
        tierExpected: model.expectedTier,
        functionScores: Object.fromEntries(
          model.functionMetrics.map((item) => [item.key, item.score])
        ),
        capabilityScores: Object.fromEntries(
          model.capabilityMetrics.map((item) => [item.key, item.score])
        ),
      },
      priorityGaps: model.topGaps.map((gap) => ({
        questionId: gap.id,
        title: gap.title,
        gapScore: gap.gapScore,
        functionKeys: gap.functionKeys,
        capabilities: gap.capabilities,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async function postPayload(payload) {
    if (!config.rdAdapterUrl) {
      return { ok: true, skipped: true };
    }

    const response = await window.fetch(config.rdAdapterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`Adapter respondeu ${response.status}`);
    }

    return { ok: true };
  }

  async function flushPendingSubmissions(options) {
    const settings = options || {};
    if (!state.online || !state.submissionQueue.length) {
      return;
    }

    const queue = [...state.submissionQueue];
    state.submissionQueue = [];

    for (let index = 0; index < queue.length; index += 1) {
      const payload = queue[index];
      try {
        await postPayload(payload);
        state.sentStatuses[payload.status] = true;
      } catch (error) {
        state.submissionQueue = queue.slice(index);
        if (!settings.silent) {
          setNotice(
            'warning',
            'Não foi possível sincronizar agora. A jornada continua salva e vamos tentar novamente.'
          );
        } else {
          saveState();
          render();
        }
        return;
      }
    }

    saveState();
    render();
  }

  function queueSubmission(status) {
    const payload = buildPayload(status);
    state.submissionQueue = state.submissionQueue.filter((item) => item.status !== status);
    state.submissionQueue.push(payload);
    state.sentStatuses[status] = false;
    saveState();
    if (state.online) {
      flushPendingSubmissions({ silent: true });
    } else {
      render();
    }
  }

  function ensureStartedSubmission() {
    if (!state.startedAt) {
      state.startedAt = Date.now();
    }
    if (!state.sentStatuses.started) {
      queueSubmission('started');
    }
  }

  function finishAssessment() {
    if (!allQuestionsAnswered()) {
      return false;
    }

    state.completedAt = Date.now();
    state.reportDirty = false;
    queueSubmission('completed');
    emitProductEvent('assessment_complete', {
      answered: getAnsweredCount(state.answers),
      score: computeResultsModel().overallScore,
    });
    return true;
  }

  function setCurrentQuestion(questionId) {
    if (!questionsById[questionId]) {
      return;
    }
    state.currentQuestionId = questionId;
    state.helpPanel = '';
    saveState();
    render();
  }

  function moveQuestion(delta) {
    const index = getCurrentQuestionIndex();
    const nextIndex = Math.max(0, Math.min(questions.length - 1, index + delta));
    state.currentQuestionId = questions[nextIndex].id;
    state.helpPanel = '';
    saveState();
    render();
  }

  function getFirstUnansweredQuestionId(functionKey) {
    const pool = functionKey ? getQuestionsInMission(functionKey) : questions;
    return pool.find((question) => !getAnswer(question.id))?.id || pool[0]?.id || questions[0]?.id || '';
  }

  function updateAnswer(questionId, selectedOption) {
    const question = questionsById[questionId];
    if (!question) {
      return;
    }

    const currentAnswer = getAnswer(questionId) || {};
    const resolvedOption = selectedOption === 'Dplus' ? 'D' : selectedOption;
    const scoreMap = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    const shouldKeepEvidence = resolvedOption === 'D' || resolvedOption === 'E';

    state.answers[questionId] = {
      questionId,
      functionKeys: question.functionKeys,
      capabilities: question.capabilities,
      weight: question.weight,
      selectedOption: resolvedOption,
      score: scoreMap[resolvedOption] ?? 0,
      evidence: shouldKeepEvidence ? currentAnswer.evidence || '' : '',
      answeredAt: Date.now(),
    };

    state.currentQuestionId = questionId;
    state.helpPanel = selectedOption === 'Dplus' ? 'dplus' : '';
    state.notice = null;

    emitProductEvent('choice_select', {
      questionId,
      functionKeys: question.functionKeys,
      checkpointId: question.checkpointId,
      uiOption: selectedOption,
      score: scoreMap[resolvedOption] ?? 0,
    });

    if (state.completedAt && allQuestionsAnswered()) {
      state.reportDirty = true;
      state.completedAt = Date.now();
      queueSubmission('completed');
    } else {
      saveState();
      render();
    }
  }

  function setDplusLevel(questionId, selectedOption) {
    updateAnswer(questionId, selectedOption);
  }

  function clearAnswer(questionId) {
    if (!state.answers[questionId]) {
      return;
    }

    delete state.answers[questionId];
    state.helpPanel = '';

    if (!allQuestionsAnswered()) {
      state.completedAt = null;
      state.reportDirty = false;
      state.sentStatuses.completed = false;
      state.submissionQueue = state.submissionQueue.filter((item) => item.status !== 'completed');
    }

    saveState();
    render();
  }

  function goToResults() {
    if (!allQuestionsAnswered()) {
      state.reviewOpen = true;
      state.reviewOrigin = state.screen;
      setNotice('warning', 'Para liberar o relatório, basta responder as perguntas que ainda estão pendentes.');
      return;
    }

    finishAssessment();
    state.screen = 'results';
    saveState();
    render();
    emitProductEvent('result_view', {
      score: computeResultsModel().overallScore,
    });
  }

  function continueJourney() {
    const index = getCurrentQuestionIndex();
    if (index >= questions.length - 1) {
      goToResults();
      return;
    }

    state.currentQuestionId = questions[index + 1].id;
    state.helpPanel = '';
    saveState();
    render();
  }

  function getReviewGroups() {
    return content.functions.map((mission) => {
      const missionQuestions = getQuestionsInMission(mission.key);
      const items = missionQuestions.map((question) => {
        const answer = getAnswer(question.id);
        return {
          question,
          answer,
          status: answer ? 'answered' : question.weight === 3 ? 'critical' : 'missing',
        };
      });

      return {
        mission,
        answered: items.filter((item) => item.answer).length,
        total: items.length,
        items,
      };
    });
  }

  function restartAssessment(mode) {
    if (mode === 'keep-lead') {
      const profile = { ...state.profile };
      state = {
        ...defaultState(),
        profile,
        leadContext: buildLeadContext(profile),
        screen: 'assessment',
        currentQuestionId: questions[0]?.id || '',
        startedAt: Date.now(),
      };
      ensureStartedSubmission();
      emitProductEvent('assessment_start', {
        assessmentMode: state.leadContext.assessmentMode,
        restarted: true,
      });
    } else {
      state = defaultState();
      state.screen = 'lead';
    }

    saveState();
    render();
  }

  /* RENDER */

  function renderTopbar() {
    const sync = getSyncStatus();
    const answered = getAnsweredCount(state.answers);
    const currentQuestion = getCurrentQuestion();
    const currentMission = getCurrentMission();
    const logo = content.appMeta.brandAssets.logoNegative || content.appMeta.brandAssets.logoColor;

    const chips =
      state.screen === 'assessment' && currentQuestion
        ? [
            `${currentMission.code} · ${currentMission.label}`,
            `Pergunta ${getCurrentQuestionIndex() + 1}/${questions.length}`,
            `${answered}/${questions.length} respondidas`,
          ]
        : state.screen === 'results'
          ? [
              `${answered}/${questions.length} respondidas`,
              `Tier atual ${computeResultsModel().observedTier.tier || 0}`,
            ]
          : ['48 perguntas', '6 funções do CSF 2.0'];

    return `
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand-block">
            <div class="brand-mark brand-mark-logo brand-mark-dark">
              <img class="brand-logo" src="${logo}" alt="Active Solutions" />
            </div>
            <div>
              <span class="brand-kicker">${escapeHtml(content.appMeta.company)}</span>
              <span class="brand-title">${escapeHtml(content.appMeta.name)}</span>
              <span class="brand-subtitle">${escapeHtml(content.appMeta.subtitle)} · By Active Solutions</span>
            </div>
          </div>

          <div class="topbar-actions">
            <div class="chip-row">
              ${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}
              <span class="chip chip--${sync.tone}">${escapeHtml(sync.label)}</span>
            </div>
            <div class="topbar-button-row">
              ${state.screen !== 'lead'
                ? `<button class="button button--ghost button--sm" data-action="open-review">Revisar respostas</button>`
                : ''}
              ${state.screen === 'assessment' && allQuestionsAnswered()
                ? `<button class="button button--ghost button--sm" data-action="go-results">Ver relatório</button>`
                : ''}
              ${state.screen === 'results'
                ? `<button class="button button--ghost button--sm" data-action="open-review">Editar respostas</button>`
                : ''}
            </div>
          </div>
        </div>
      </header>
    `;
  }

  function renderNotice() {
    if (!state.notice) {
      return '';
    }

    return `
      <div class="notice notice--${state.notice.tone}">
        <div class="notice-copy">
          <strong>${state.notice.tone === 'error' ? 'Ajuste rápido:' : state.notice.tone === 'warning' ? 'Importante:' : 'Tudo certo:'}</strong>
          <span>${escapeHtml(state.notice.text)}</span>
        </div>
        <button class="notice-close" data-action="close-notice" aria-label="Fechar aviso">×</button>
      </div>
    `;
  }

  function renderFloatingWhatsApp() {
    const currentQuestion = getCurrentQuestion();
    let eyebrow = 'Ajuda humana disponível';
    let lines = [];

    if (state.screen === 'assessment' && currentQuestion) {
      lines = [
        `Pergunta atual: ${currentQuestion.id} - ${currentQuestion.shortTitle}.`,
        `Missão: ${getCurrentMission().label}.`,
      ];
    } else if (state.screen === 'results') {
      lines = buildResultsWhatsAppLines();
    } else {
      lines = ['Quero ajuda para começar o assessment N.A.V.E com o melhor contexto possível.'];
    }

    if (state.fabNudge === 'idle') {
      eyebrow = 'Se quiser, um especialista pode te ajudar nesta pergunta.';
    } else if (state.fabNudge === 'help') {
      eyebrow = 'Ficou na dúvida? A Active pode responder com você.';
    } else if (state.fabNudge === 'error') {
      eyebrow = 'Encontrou uma trava? Chame alguém da Active agora.';
    }

    return `
      <a
        class="specialist-fab"
        href="${buildWhatsAppUrl(lines)}"
        target="_blank"
        rel="noreferrer"
        aria-label="Falar com um especialista no WhatsApp"
      >
        <span class="specialist-fab-copy">
          <span class="specialist-fab-eyebrow">${escapeHtml(eyebrow)}</span>
          <strong class="specialist-fab-title">Falar com um especialista</strong>
        </span>
        <span class="specialist-fab-badge">WA</span>
      </a>
    `;
  }

  function renderProgressBar(label, value) {
    return `
      <div class="progress-block">
        <div class="progress-head">
          <span>${escapeHtml(label)}</span>
          <strong>${formatPercent(value)}</strong>
        </div>
        <div class="progress-track" aria-hidden="true">
          <span class="progress-fill" style="width:${Math.max(0, Math.min(100, value))}%"></span>
        </div>
      </div>
    `;
  }

  function renderLanding() {
    const answered = getAnsweredCount(state.answers);
    const ctaLabel = isLeadReady() ? 'Retomar avaliação' : 'Começar avaliação';
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    const personalizedNote = leadContext.firstName
      ? `${leadContext.firstName}, aqui a ideia é simples: tirar o peso técnico e transformar segurança em clareza de decisão.`
      : 'Uma jornada executiva para entender exposição, maturidade e próximos passos sem mergulhar no detalhe técnico.';

    return `
      <main class="page-content">
        <section class="landing-hero hero-dark">
          <div class="hero-copy">
            <span class="eyebrow">Assessment executivo gamificado</span>
            <h1>Segurança não é só TI. É continuidade, clareza e confiança para decidir melhor.</h1>
            <p>${escapeHtml(content.appMeta.promise)}</p>
            <div class="chip-row chip-row--hero">
              <span class="chip">2 a 4 minutos</span>
              <span class="chip">Uma pergunta por vez</span>
              <span class="chip">Sem tecnês desnecessário</span>
            </div>
            <div class="hero-actions">
              <button class="button button--primary" data-action="start-flow">${ctaLabel}</button>
              ${answered
                ? `<button class="button button--ghost" data-action="go-assessment">Continuar de onde parou</button>`
                : ''}
            </div>
          </div>

          <div class="hero-panel">
            <div class="surface-card metric-card">
              <span class="eyebrow-soft">Jornada ativa</span>
              <strong class="metric-card-value">${answered} de ${questions.length}</strong>
              <p>${answered ? 'Você já liberou parte do diagnóstico. Retomar agora preserva esse ganho.' : 'A leitura final combina Tier observado, gap de rigor e serviços mais aderentes.'}</p>
              ${renderProgressBar('Progresso geral', getCompletionPercent(state.answers))}
            </div>
            <div class="surface-card metric-card">
              <span class="eyebrow-soft">Como funciona</span>
              <ul class="compact-list">
                <li>Lead curto para personalizar a leitura.</li>
                <li>48 perguntas em linguagem de negócio.</li>
                <li>Relatório executivo com serviços sugeridos.</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="landing-grid">
          <article class="surface-card value-card">
            <span class="pill">Contexto primeiro</span>
            <h2>Antes de proteger, entenda onde o risco realmente pesa.</h2>
            <p>${escapeHtml(personalizedNote)}</p>
          </article>
          <article class="surface-card value-card">
            <span class="pill">Decisão, não checklist</span>
            <h2>O N.A.V.E traduz respostas complexas em prioridade executiva.</h2>
            <p>O objetivo é facilitar conversa entre liderança, TI, marketing, jurídico e operação sem transformar a experiência em formulário pesado.</p>
          </article>
          <article class="surface-card value-card">
            <span class="pill">Fechamento consultivo</span>
            <h2>No fim, a leitura aponta o que fazer agora e como a Active pode ajudar.</h2>
            <p>Você termina com score, Tier observado, Tier esperado, insights claros e os serviços mais aderentes ao cenário atual.</p>
          </article>
        </section>

        <section class="surface-card mission-board">
          <div class="section-head">
            <div>
              <span class="eyebrow-soft">As 6 missões do CSF 2.0</span>
              <h2>Uma trilha clara, contínua e sem sobrecarga visual.</h2>
            </div>
            <p>Mesmo quando o tema é técnico, a navegação continua leve: uma decisão por vez, ajuda contextual e progresso real.</p>
          </div>
          <div class="mission-pill-grid">
            ${content.functions
              .map((mission) => {
                const progress = getMissionProgress(mission.key, state.answers);
                return `
                  <button class="mission-pill" data-action="jump-function" data-function-key="${mission.key}">
                    <span class="mission-pill-code">${mission.key}</span>
                    <span class="mission-pill-copy">
                      <strong>${escapeHtml(mission.label)}</strong>
                      <small>${progress.answered}/${progress.total} respondidas</small>
                    </span>
                  </button>
                `;
              })
              .join('')}
          </div>
        </section>
      </main>
    `;
  }

  function renderFieldError(fieldName, errors) {
    if (!state.leadAttempted && !state.touchedFields[fieldName]) {
      return '';
    }
    if (!errors[fieldName]) {
      return '';
    }
    return `<span class="field-error" id="error-${fieldName}">${escapeHtml(errors[fieldName])}</span>`;
  }

  function renderLead() {
    const errors = validateLead(state.profile);
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    const segmentRiskLabel =
      leadContext.segmentRisk === 'high'
        ? 'alto'
        : leadContext.segmentRisk === 'low'
          ? 'baixo'
          : 'médio';

    return `
      <main class="page-content page-content--lead">
        <section class="lead-layout">
          <div class="hero-dark lead-hero">
            <span class="eyebrow">Lead capture</span>
            <h1>${leadContext.firstName ? `${escapeHtml(leadContext.firstName)}, vamos deixar esta leitura com a sua cara.` : 'Começamos com um contexto curto para personalizar o assessment.'}</h1>
            <p>Quanto melhor o contexto, mais humana e mais útil fica a leitura final: linguagem, rigor esperado e recomendações passam a refletir seu porte, cargo e setor.</p>
            <div class="hero-note-grid">
              <div class="hero-note">
                <strong>2 a 4 minutos</strong>
                <span>Validação suave e sem fricção desnecessária.</span>
              </div>
              <div class="hero-note">
                <strong>Sem tecnês</strong>
                <span>Você não precisa do detalhe técnico para responder bem.</span>
              </div>
            </div>
            <div class="surface-card hero-sidecard">
              <span class="eyebrow-soft">Leitura adaptativa</span>
              <p>Segmento estimado como risco <strong>${segmentRiskLabel}</strong>. O Tier esperado para esse contexto começa em <strong>${leadContext.expectedTier}</strong>.</p>
            </div>
          </div>

          <section class="surface-card lead-card">
            <div class="section-head">
              <div>
                <span class="eyebrow-soft">Seu contexto</span>
                <h2>Dados mínimos para uma avaliação mais assertiva</h2>
              </div>
              <p>Se o telefone não for informado, seguimos normalmente. Ele só ajuda quando você quiser contato mais rápido.</p>
            </div>

            <form data-form="lead" novalidate class="lead-form">
              <label class="field">
                <span>Nome</span>
                <input type="text" name="name" data-field="name" data-profile-input value="${escapeHtml(state.profile.name)}" aria-describedby="error-name" aria-invalid="${errors.name ? 'true' : 'false'}" />
                ${renderFieldError('name', errors)}
              </label>

              <label class="field">
                <span>Cargo</span>
                <input type="text" name="role" data-field="role" data-profile-input value="${escapeHtml(state.profile.role)}" aria-describedby="error-role" aria-invalid="${errors.role ? 'true' : 'false'}" placeholder="Ex.: CEO, CIO, Diretoria, Marketing" />
                ${renderFieldError('role', errors)}
              </label>

              <label class="field">
                <span>E-mail profissional</span>
                <input type="email" name="email" data-field="email" data-profile-input value="${escapeHtml(state.profile.email)}" aria-describedby="error-email" aria-invalid="${errors.email ? 'true' : 'false'}" />
                ${renderFieldError('email', errors)}
              </label>

              <label class="field">
                <span>Empresa</span>
                <input type="text" name="company" data-field="company" data-profile-input value="${escapeHtml(state.profile.company)}" aria-describedby="error-company" aria-invalid="${errors.company ? 'true' : 'false'}" />
                ${renderFieldError('company', errors)}
              </label>

              <label class="field">
                <span>Porte</span>
                <select name="size" data-field="size" data-profile-input aria-describedby="error-size" aria-invalid="${errors.size ? 'true' : 'false'}">
                  <option value="">Selecione</option>
                  ${[
                    'Até 50 colaboradores',
                    '51 a 200 colaboradores',
                    '201 a 500 colaboradores',
                    '501 a 1.000 colaboradores',
                    'Acima de 1.000 colaboradores',
                  ]
                    .map(
                      (option) =>
                        `<option value="${escapeHtml(option)}" ${state.profile.size === option ? 'selected' : ''}>${escapeHtml(option)}</option>`
                    )
                    .join('')}
                </select>
                ${renderFieldError('size', errors)}
              </label>

              <label class="field">
                <span>Segmento</span>
                <select name="segment" data-field="segment" data-profile-input aria-describedby="error-segment" aria-invalid="${errors.segment ? 'true' : 'false'}">
                  <option value="">Selecione</option>
                  ${[
                    'Tecnologia',
                    'Saúde',
                    'Financeiro',
                    'Indústria',
                    'Serviços',
                    'Varejo',
                    'Agro',
                    'Setor público',
                    'Educação',
                    'Outro',
                  ]
                    .map(
                      (option) =>
                        `<option value="${escapeHtml(option)}" ${state.profile.segment === option ? 'selected' : ''}>${escapeHtml(option)}</option>`
                    )
                    .join('')}
                </select>
                ${renderFieldError('segment', errors)}
              </label>

              <label class="field field--full">
                <span>Telefone / WhatsApp <small>(opcional)</small></span>
                <input type="tel" name="phone" data-field="phone" data-profile-input value="${escapeHtml(formatPhoneDisplay(state.profile.phone))}" aria-describedby="error-phone" aria-invalid="${errors.phone ? 'true' : 'false'}" placeholder="(11) 99999-9999" />
                ${renderFieldError('phone', errors)}
              </label>

              <div class="lead-footer">
                <p class="form-note">Ao continuar, o contexto fica salvo localmente e o assessment pode ser retomado depois exatamente do mesmo ponto.</p>
                <button class="button button--primary" type="submit">Salvar contexto e começar</button>
              </div>
            </form>
          </section>
        </section>
      </main>
    `;
  }

  function renderMissionRail(currentMission) {
    return `
      <aside class="mission-rail">
        <div class="surface-card rail-card">
          <span class="eyebrow-soft">Jornada ativa</span>
          <strong class="rail-big-number">${getAnsweredCount(state.answers)} de ${questions.length}</strong>
          <p>${state.leadContext?.firstName ? `Cada resposta aproxima ${escapeHtml(state.leadContext.firstName)} do relatório executivo final.` : 'Cada resposta destrava mais contexto para o relatório final.'}</p>
          ${renderProgressBar('Progresso geral', getCompletionPercent(state.answers))}
        </div>

        <div class="surface-card rail-card">
          <div class="rail-head">
            <span class="pill">Missões</span>
            <button class="button button--ghost button--sm" data-action="open-review">Central de revisão</button>
          </div>
          <div class="rail-mission-list">
            ${content.functions
              .map((mission) => {
                const progress = getMissionProgress(mission.key, state.answers);
                return `
                  <button
                    class="rail-mission-item ${mission.key === currentMission.key ? 'is-active' : ''}"
                    data-action="jump-function"
                    data-function-key="${mission.key}"
                  >
                    <span>
                      <strong>${mission.key} ${escapeHtml(mission.label)}</strong>
                      <small>${progress.answered}/${progress.total} respondidas</small>
                    </span>
                    <em>${formatPercent(progress.percent)}</em>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>
      </aside>
    `;
  }

  function renderAssessmentAside(question) {
    const mission = getCurrentMission();
    const missionProgress = getMissionProgress(mission.key, state.answers);
    const leadContext = state.leadContext || buildLeadContext(state.profile);

    return `
      <aside class="assessment-aside">
        <div class="surface-card aside-card">
          <span class="eyebrow-soft">Ritmo da missão</span>
          ${renderProgressBar(`${mission.label}`, missionProgress.percent)}
          ${renderProgressBar('Nível esperado', Math.min(100, (leadContext.expectedTier / 4) * 100))}
          <p>${escapeHtml(mission.rewardText || question.microRewardCopy || 'Cada resposta ajuda a transformar percepções difusas em prioridade clara.')}</p>
        </div>
        <div class="surface-card aside-card">
          <span class="eyebrow-soft">Por que isso importa</span>
          <p>${escapeHtml(question.learnWhy || mission.heroText)}</p>
        </div>
        <div class="surface-card aside-card">
          <span class="eyebrow-soft">Quem costuma saber responder</span>
          <p>${escapeHtml(question.whoCanAnswer || mission.supportPrompt)}</p>
        </div>
      </aside>
    `;
  }

  function renderChoiceCard(question, uiOption, answer) {
    const selected =
      answer &&
      (answer.selectedOption === uiOption.uiKey ||
        (uiOption.uiKey === 'Dplus' && ['D', 'E'].includes(answer.selectedOption)));
    const tone =
      uiOption.uiKey === 'Dplus'
        ? answer?.selectedOption === 'E'
          ? uiToneByOption.E
          : uiToneByOption.D
        : uiToneByOption[uiOption.uiKey];

    return `
      <button
        class="choice-card choice-card--${tone} ${selected ? 'is-selected' : ''}"
        data-action="select-option"
        data-question-id="${question.id}"
        data-option="${uiOption.uiKey}"
      >
        <span class="choice-card-head">
          <span class="choice-card-key">${uiOption.uiKey === 'Dplus' ? 'D+' : uiOption.uiKey}</span>
          ${selected ? `<span class="choice-card-check">Selecionado</span>` : ''}
        </span>
        <strong>${escapeHtml(uiOption.title)}</strong>
        <p>${escapeHtml(uiOption.subtitle)}</p>
      </button>
    `;
  }

  function renderQuestionHelp(question) {
    if (!state.helpPanel) {
      return '';
    }

    if (state.helpPanel === 'explain') {
      return `
        <div class="inline-help inline-help--open">
          <strong>Me explica melhor</strong>
          <p>${escapeHtml(question.businessPlainLanguage || question.help.explain)}</p>
          <p>${escapeHtml(question.learnWhy || '')}</p>
        </div>
      `;
    }

    if (state.helpPanel === 'examples') {
      return `
        <div class="inline-help inline-help--open">
          <strong>Pode me dar exemplos?</strong>
          <p>${escapeHtml(question.whoCanAnswer || 'Esta resposta costuma envolver negócio e validação de quem opera o processo.')}</p>
          ${question.evidenceExamples?.length
            ? `<ul>${question.evidenceExamples
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join('')}</ul>`
            : ''}
          <p>${escapeHtml(question.learnTip || question.evidenceHint || '')}</p>
        </div>
      `;
    }

    if (state.helpPanel === 'dplus') {
      const currentAnswer = getAnswer(question.id);
      return `
        <div class="inline-help inline-help--open inline-help--dplus">
          <strong>Refinar o D+</strong>
          <p>Se já existe consistência, vale separar se isso é apenas repetível ou se já há melhoria contínua com revisão e ajuste frequente.</p>
          <div class="dplus-grid">
            <button class="button button--ghost ${currentAnswer?.selectedOption === 'D' ? 'is-selected' : ''}" data-action="set-dplus-level" data-question-id="${question.id}" data-level="D">
              Manter como consistente
            </button>
            <button class="button button--primary ${currentAnswer?.selectedOption === 'E' ? 'is-selected' : ''}" data-action="set-dplus-level" data-question-id="${question.id}" data-level="E">
              Marcar como evolução contínua
            </button>
          </div>
        </div>
      `;
    }

    return '';
  }

  function renderAssessment() {
    const question = getCurrentQuestion();
    const answer = getAnswer(question.id);
    const mission = getCurrentMission();
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    const questionIndex = getCurrentQuestionIndex() + 1;
    const missionProgress = getMissionProgress(mission.key, state.answers);
    const microFeedback = getMicroFeedback(question, answer);

    return `
      <main class="page-content page-content--assessment">
        <section class="assessment-hero hero-dark" style="--mission-accent:${mission.accent || '#0057E7'};">
          <div class="hero-copy">
            <span class="eyebrow">${escapeHtml(mission.missionLabel)} · ${escapeHtml(mission.label)}</span>
            <h1>${escapeHtml(question.shortTitle)}</h1>
            <p>${escapeHtml(getExecutiveRoleCopy())}</p>
            <div class="chip-row chip-row--hero">
              <span class="chip">Pergunta ${questionIndex}/${questions.length}</span>
              <span class="chip">${escapeHtml(getCurrentCheckpointLabel(question))}</span>
              <span class="chip">Tier esperado ${leadContext.expectedTier}</span>
            </div>
          </div>
          <div class="hero-panel hero-panel--assessment">
            <div class="surface-card metric-card">
              <span class="eyebrow-soft">Missão atual</span>
              <strong class="metric-card-value">${formatPercent(missionProgress.percent)}</strong>
              <p>${escapeHtml(mission.rewardTitle || 'Progresso liberado')}</p>
            </div>
            <div class="surface-card metric-card">
              <span class="eyebrow-soft">Ganho desta etapa</span>
              <p>${escapeHtml(question.microRewardCopy || mission.rewardText)}</p>
            </div>
          </div>
        </section>

        <section class="assessment-shell">
          ${renderMissionRail(mission)}

          <section class="question-stage">
            <article class="surface-card question-card">
              <div class="question-card-head">
                <div>
                  <span class="eyebrow-soft">Pergunta ${questionIndex} de ${questions.length}</span>
                  <h2>${escapeHtml(question.shortTitle)}</h2>
                </div>
                <button class="button button--ghost button--sm" data-action="clear-answer" data-question-id="${question.id}">
                  Limpar resposta
                </button>
              </div>

              <p class="question-context">${escapeHtml(getQuestionContextCopy(question))}</p>
              <p class="question-coach">${escapeHtml(getQuestionPromptCopy(question))}</p>

              <div class="help-chip-row">
                <button class="help-chip ${state.helpPanel === 'explain' ? 'is-active' : ''}" data-action="toggle-help" data-help="explain">Me explica</button>
                <button class="help-chip ${state.helpPanel === 'examples' ? 'is-active' : ''}" data-action="toggle-help" data-help="examples">Exemplos</button>
                ${answer && ['D', 'E'].includes(answer.selectedOption)
                  ? `<button class="help-chip ${state.helpPanel === 'dplus' ? 'is-active' : ''}" data-action="toggle-help" data-help="dplus">${answer.selectedOption === 'E' ? 'Revisar D+' : 'Abrir ajuste avançado'}</button>`
                  : ''}
              </div>

              ${renderQuestionHelp(question)}

              <div class="choice-grid">
                ${question.uiOptions.map((uiOption) => renderChoiceCard(question, uiOption, answer)).join('')}
              </div>

              ${microFeedback
                ? `
                  <div class="micro-feedback micro-feedback--${microFeedback.tone}">
                    <strong>${escapeHtml(microFeedback.title)}</strong>
                    <p>${escapeHtml(microFeedback.body)}</p>
                  </div>
                `
                : ''}

              ${answer && ['D', 'E'].includes(answer.selectedOption)
                ? `
                  <label class="field field--full evidence-field">
                    <span>Se quiser, cite a evidência mais simples que comprova essa resposta.</span>
                    <textarea rows="4" data-evidence-input data-question-id="${question.id}" placeholder="${escapeHtml(question.evidenceHint || 'Ex.: política simples, rotina, ata, registro ou evidência operacional.')}">${escapeHtml(answer.evidence || '')}</textarea>
                  </label>
                `
                : ''}

              <div class="question-footer-copy">
                <strong>Não tente embelezar o cenário.</strong>
                <p>A melhor resposta aqui é a que descreve a prática real de hoje, e não o estado desejado.</p>
              </div>

              <div class="question-actions">
                <button class="button button--ghost" data-action="prev-question" ${questionIndex === 1 ? 'disabled' : ''}>Anterior</button>
                <button class="button button--ghost" data-action="open-review">Revisar respostas</button>
                <button class="button button--primary" data-action="continue" ${answer ? '' : 'disabled'}>
                  ${questionIndex === questions.length ? 'Revelar relatório' : 'Próxima pergunta'}
                </button>
              </div>
            </article>
          </section>

          ${renderAssessmentAside(question)}
        </section>
      </main>
    `;
  }

  function renderScoreGauge(percent) {
    return `
      <div class="score-gauge" style="--score:${Math.max(0, Math.min(100, percent))}">
        <div class="score-gauge-inner">
          <strong>${formatPercent(percent)}</strong>
          <span>leitura executiva</span>
        </div>
      </div>
    `;
  }

  function renderServiceCard(service, prominent) {
    return `
      <article class="surface-card service-card ${prominent ? 'service-card--prominent' : ''}">
        <div class="service-card-head">
          <div>
            <span class="eyebrow-soft">${prominent ? 'Top recomendado agora' : 'Outra alavanca útil'}</span>
            <h3>${escapeHtml(service.name)}</h3>
          </div>
          <span class="service-card-fit">${escapeHtml(humanJoin(service.nistFunctions.map((item) => functionsByKey[item]?.label).filter(Boolean)) || 'CSF 2.0')}</span>
        </div>
        <p>${escapeHtml(service.summary || service.description || '')}</p>
        <div class="service-why">
          <strong>Por que apareceu</strong>
          <p>${escapeHtml(service.whyAppeared || '')}</p>
        </div>
        <div class="service-why">
          <strong>Quando faz sentido</strong>
          <p>${escapeHtml(service.whenItMakesSense || '')}</p>
        </div>
        <div class="service-card-actions">
          <button class="button button--ghost" data-action="open-service" data-service-key="${service.serviceKey}">${escapeHtml(service.cta?.learnMoreLabel || 'Saiba mais')}</button>
          <a class="button button--primary" target="_blank" rel="noreferrer" href="${buildWhatsAppUrl(buildResultsWhatsAppLines(service))}">
            ${escapeHtml(service.cta?.scheduleLabel || 'Agendar bate-papo')}
          </a>
        </div>
      </article>
    `;
  }

  function renderResults() {
    const model = computeResultsModel();
    const leadContext = model.leadContext;
    const strongestText = model.strongestFunction
      ? `${model.strongestFunction.meta.label} é a base mais estável hoje.`
      : 'A leitura já tem informação suficiente para definir prioridade.';
    const weakestText = model.weakestFunction
      ? `${model.weakestFunction.meta.label} concentra a maior tensão operacional.`
      : 'As respostas não apontaram uma missão claramente dominante.';

    return `
      <main class="page-content page-content--results">
        <section class="results-hero hero-dark">
          <div class="hero-copy">
            <span class="eyebrow">Results</span>
            <h1>${leadContext.firstName ? `${escapeHtml(leadContext.firstName)}, aqui está a leitura que mais importa agora.` : 'Aqui está a leitura executiva do cenário atual.'}</h1>
            <p>Hoje o N.A.V.E enxerga <strong>${escapeHtml(model.observedTier.label)}</strong>. Para o seu contexto, a referência mais natural é <strong>Tier ${model.expectedTier}</strong>.</p>
            <div class="hero-actions">
              <button class="button button--ghost" data-action="open-review">Revisar respostas</button>
              <a class="button button--primary" target="_blank" rel="noreferrer" href="${buildWhatsAppUrl(buildResultsWhatsAppLines())}">Falar sobre o relatório</a>
            </div>
          </div>
          <div class="hero-panel hero-panel--results">
            <div class="surface-card metric-card metric-card--gauge">
              ${renderScoreGauge(model.executivePercent)}
              <div class="metric-stack">
                <span><strong>Tier observado:</strong> ${escapeHtml(model.observedTier.label)}</span>
                <span><strong>Tier esperado:</strong> Tier ${model.expectedTier}</span>
                <span><strong>Gap:</strong> ${model.tierGap > 0 ? `${model.tierGap} nível(is)` : 'alinhado ao esperado'}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="insight-grid">
          ${model.insights
            .map(
              (insight) => `
                <article class="surface-card insight-card">
                  <h2>${escapeHtml(insight.title)}</h2>
                  <p>${escapeHtml(insight.body)}</p>
                </article>
              `
            )
            .join('')}
        </section>

        <section class="report-section">
          <div class="section-head">
            <div>
              <span class="eyebrow-soft">Top 3 recomendados agora</span>
              <h2>Serviços que mais ajudam a transformar esse diagnóstico em próxima ação</h2>
            </div>
            <p>Os cards abaixo cruzam lacunas reais, peso da pergunta, contexto do setor e aderência às capacidades mais sensíveis.</p>
          </div>
          <div class="service-grid service-grid--top">
            ${model.topServices.length
              ? model.topServices.map((service) => renderServiceCard(service, true)).join('')
              : `<article class="surface-card empty-card"><p>As respostas ainda não geraram um ranking claro. Vale revisar o relatório com um especialista.</p></article>`}
          </div>
        </section>

        ${model.otherServices.length
          ? `
            <section class="report-section">
              <div class="section-head">
                <div>
                  <span class="eyebrow-soft">Outras alavancas</span>
                  <h2>Próximos movimentos que também podem fazer sentido</h2>
                </div>
              </div>
              <div class="service-grid">
                ${model.otherServices.map((service) => renderServiceCard(service, false)).join('')}
              </div>
            </section>
          `
          : ''}

        <section class="report-two-column">
          <article class="surface-card report-card">
            <span class="eyebrow-soft">Panorama por missão</span>
            <h2>Onde a leitura já está mais sólida e onde pesa mais agora</h2>
            <div class="bar-list">
              ${model.functionMetrics
                .map(
                  (metric) => `
                    <div class="bar-list-item">
                      <div class="bar-list-head">
                        <strong>${escapeHtml(metric.meta.label)}</strong>
                        <span>${metric.score == null ? 'Pendente' : formatScore(metric.score)}</span>
                      </div>
                      <div class="progress-track"><span class="progress-fill" style="width:${metric.score == null ? 0 : (metric.score / 4) * 100}%"></span></div>
                    </div>
                  `
                )
                .join('')}
            </div>
            <div class="summary-pair">
              <p><strong>Maior exposição:</strong> ${escapeHtml(weakestText)}</p>
              <p><strong>Base mais forte:</strong> ${escapeHtml(strongestText)}</p>
            </div>
          </article>

          <article class="surface-card report-card">
            <span class="eyebrow-soft">Próximos 30-60-90 dias</span>
            <h2>Uma trilha simples para transformar leitura em execução</h2>
            <div class="roadmap-list">
              ${model.roadmap
                .map(
                  (phase) => `
                    <div class="roadmap-item">
                      <div class="roadmap-phase">${escapeHtml(phase.phase)}</div>
                      <div>
                        <strong>${escapeHtml(phase.title)}</strong>
                        <ul>
                          ${phase.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                        </ul>
                      </div>
                    </div>
                  `
                )
                .join('')}
            </div>
          </article>
        </section>

        <section class="surface-card report-card report-card--note">
          <span class="eyebrow-soft">Nota metodológica</span>
          <p>O Tier numérico exibido aqui é uma interpretação interna do produto sobre o NIST CSF 2.0. Ele serve para orientar rigor de governança e priorização, e não representa um threshold oficial do NIST.</p>
        </section>
      </main>
    `;
  }

  function renderReviewDrawer() {
    if (!state.reviewOpen) {
      return '';
    }

    const groups = getReviewGroups();
    const missingCount = questions.length - getAnsweredCount(state.answers);

    return `
      <div class="dialog-backdrop" data-action="close-review">
        <section class="dialog-surface review-drawer" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <div class="dialog-head">
            <div>
              <span class="eyebrow-soft">Central de revisão</span>
              <h2 id="review-title">Veja o que já foi respondido e o que ainda falta</h2>
            </div>
            <button class="button button--ghost button--sm" data-action="close-review">Fechar</button>
          </div>

          <div class="review-summary">
            <div class="surface-chip"><strong>${getAnsweredCount(state.answers)}</strong><span>respondidas</span></div>
            <div class="surface-chip"><strong>${missingCount}</strong><span>pendentes</span></div>
            <div class="surface-chip"><strong>${allQuestionsAnswered() ? 'Liberado' : 'Em andamento'}</strong><span>status do relatório</span></div>
          </div>

          <div class="review-groups">
            ${groups
              .map(
                (group) => `
                  <section class="review-group">
                    <div class="review-group-head">
                      <h3>${group.mission.key} ${escapeHtml(group.mission.label)}</h3>
                      <span>${group.answered}/${group.total}</span>
                    </div>
                    <div class="review-question-list">
                      ${group.items
                        .map(
                          (item) => `
                            <button class="review-question ${item.status === 'critical' ? 'is-critical' : item.answer ? 'is-answered' : ''}" data-action="jump-question" data-question-id="${item.question.id}">
                              <span class="review-question-copy">
                                <strong>${escapeHtml(item.question.id)}</strong>
                                <small>${escapeHtml(item.question.shortTitle)}</small>
                              </span>
                              <span class="review-question-status">${escapeHtml(item.answer ? getQuestionDisplayOption(item.answer) : item.status === 'critical' ? 'Crítica pendente' : 'Pendente')}</span>
                            </button>
                          `
                        )
                        .join('')}
                    </div>
                  </section>
                `
              )
              .join('')}
          </div>

          <div class="dialog-actions">
            <button class="button button--ghost" data-action="restart-keep-lead">Reiniciar mantendo lead</button>
            <button class="button button--ghost" data-action="restart-clear-lead">Apagar tudo</button>
            <button class="button button--ghost" data-action="close-review">Voltar</button>
            <button class="button button--primary" data-action="${allQuestionsAnswered() ? 'go-results' : 'go-first-missing'}">
              ${allQuestionsAnswered() ? 'Ir para o relatório' : 'Ir para a próxima pendência'}
            </button>
          </div>
        </section>
      </div>
    `;
  }

  function renderServiceModal() {
    if (!state.serviceDetailKey || !servicesByKey[state.serviceDetailKey]) {
      return '';
    }

    const service = servicesByKey[state.serviceDetailKey];

    return `
      <div class="dialog-backdrop" data-action="close-service">
        <section class="dialog-surface service-modal" role="dialog" aria-modal="true" aria-labelledby="service-title">
          <div class="dialog-head">
            <div>
              <span class="eyebrow-soft">Saiba mais</span>
              <h2 id="service-title">${escapeHtml(service.name)}</h2>
            </div>
            <button class="button button--ghost button--sm" data-action="close-service">Fechar</button>
          </div>

          <div class="service-modal-content">
            <section>
              <strong>Resumo</strong>
              <p>${escapeHtml(service.summary || service.description || '')}</p>
            </section>
            <section>
              <strong>O que resolve</strong>
              <p>${escapeHtml(service.pain || service.whyAppeared || '')}</p>
            </section>
            <section>
              <strong>Quando faz sentido</strong>
              <p>${escapeHtml(service.whenItMakesSense || '')}</p>
            </section>
            <section>
              <strong>Entregáveis</strong>
              <ul>
                ${(service.deliverables || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
              </ul>
            </section>
            <section>
              <strong>Valor de negócio</strong>
              <p>${escapeHtml(service.businessValue || service.description || '')}</p>
            </section>
          </div>

          <div class="dialog-actions">
            <button class="button button--ghost" data-action="close-service">Voltar</button>
            ${config.calendarUrl
              ? `<a class="button button--ghost" href="${escapeHtml(config.calendarUrl)}" target="_blank" rel="noreferrer">Abrir agenda</a>`
              : ''}
            <a class="button button--primary" target="_blank" rel="noreferrer" href="${buildWhatsAppUrl(buildResultsWhatsAppLines(service))}">
              ${escapeHtml(service.cta?.scheduleLabel || 'Agendar bate-papo')}
            </a>
          </div>
        </section>
      </div>
    `;
  }

  function render() {
    let page = '';

    if (state.screen === 'lead') {
      page = renderLead();
    } else if (state.screen === 'assessment') {
      page = renderAssessment();
    } else if (state.screen === 'results') {
      page = renderResults();
    } else {
      page = renderLanding();
    }

    root.innerHTML = `
      <div class="page-shell page-shell--${state.screen}">
        ${renderTopbar()}
        ${renderNotice()}
        ${page}
        ${renderFloatingWhatsApp()}
        ${renderReviewDrawer()}
        ${renderServiceModal()}
      </div>
    `;

    afterRender();
  }

  function afterRender() {
    scheduleFabNudge();
    handleFocusForDialog();

    if (state.screen === 'assessment') {
      const question = getCurrentQuestion();
      if (question && lastQuestionViewId !== question.id) {
        lastQuestionViewId = question.id;
        emitProductEvent('question_view', {
          id: question.id,
          functionKeys: question.functionKeys,
          checkpointId: question.checkpointId,
        });
      }
    }
  }

  function handleFocusForDialog() {
    const dialog = document.querySelector('.dialog-surface');
    if (dialog) {
      const focusable = dialog.querySelector(focusableSelector);
      if (focusable && !dialog.contains(document.activeElement)) {
        focusable.focus();
      }
      return;
    }

    if (focusRestoreSelector) {
      const target = document.querySelector(focusRestoreSelector);
      if (target) {
        target.focus();
      }
      focusRestoreSelector = '';
    }
  }

  function scheduleFabNudge() {
    window.clearTimeout(fabIdleTimer);
    window.clearTimeout(fabHelpTimer);

    if (state.notice && (state.notice.tone === 'warning' || state.notice.tone === 'error')) {
      if (state.fabNudge !== 'error') {
        state.fabNudge = 'error';
        render();
      }
      return;
    }

    if (state.fabNudge) {
      state.fabNudge = '';
    }

    if (state.screen !== 'assessment') {
      return;
    }

    const question = getCurrentQuestion();
    if (!question || getAnswer(question.id)) {
      return;
    }

    const questionId = question.id;
    fabIdleTimer = window.setTimeout(() => {
      if (state.screen === 'assessment' && state.currentQuestionId === questionId && !getAnswer(questionId)) {
        state.fabNudge = 'idle';
        emitProductEvent('idle_whatsapp_prompt_shown', { questionId });
        render();
      }
    }, 5000);

    if (state.helpPanel) {
      fabHelpTimer = window.setTimeout(() => {
        if (state.screen === 'assessment' && state.currentQuestionId === questionId && !getAnswer(questionId)) {
          state.fabNudge = 'help';
          render();
        }
      }, 8500);
    }
  }

  function trapFocus(event) {
    const dialog = document.querySelector('.dialog-surface');
    if (!dialog || event.key !== 'Tab') {
      return;
    }

    const focusable = Array.from(dialog.querySelectorAll(focusableSelector)).filter(
      (item) => !item.hasAttribute('disabled')
    );
    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* EVENTS */

  function bindEvents() {
    root.addEventListener('click', handleClick);
    root.addEventListener('submit', handleSubmit);
    root.addEventListener('input', handleInput);
    root.addEventListener('focusout', handleBlur, true);

    window.addEventListener('keydown', (event) => {
      trapFocus(event);

      if (event.key === 'Escape') {
        if (state.serviceDetailKey) {
          focusRestoreSelector = `[data-service-key="${state.serviceDetailKey}"]`;
          state.serviceDetailKey = '';
          saveState();
          render();
          return;
        }
        if (state.reviewOpen) {
          state.reviewOpen = false;
          saveState();
          render();
        }
      }
    });

    window.addEventListener('online', () => {
      state.online = true;
      saveState();
      render();
      flushPendingSubmissions({ silent: true });
    });

    window.addEventListener('offline', () => {
      state.online = false;
      saveState();
      render();
    });
  }

  function handleClick(event) {
    const whatsappLink = event.target.closest('a[href*="wa.me/"]');
    if (whatsappLink) {
      emitProductEvent('whatsapp_click', {
        origin: whatsappLink.closest('.service-modal')
          ? 'modal'
          : whatsappLink.closest('.results-hero')
            ? 'resultCTA'
            : whatsappLink.closest('.specialist-fab')
              ? 'bubble'
              : 'cta',
      });
      return;
    }

    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) {
      return;
    }

    const action = actionTarget.dataset.action;

    if (actionTarget.classList.contains('dialog-backdrop') && !['close-review', 'close-service'].includes(action)) {
      return;
    }

    switch (action) {
      case 'start-flow':
        state.screen = isLeadReady() ? 'assessment' : 'lead';
        if (state.screen === 'assessment') {
          state.currentQuestionId = getFirstUnansweredQuestionId() || questions[0]?.id || '';
        }
        saveState();
        render();
        break;

      case 'go-landing':
        state.screen = 'landing';
        saveState();
        render();
        break;

      case 'go-assessment':
        if (!isLeadReady()) {
          state.screen = 'lead';
        } else {
          state.screen = 'assessment';
          state.currentQuestionId = getFirstUnansweredQuestionId() || state.currentQuestionId;
        }
        saveState();
        render();
        break;

      case 'go-results':
        goToResults();
        break;

      case 'prev-question':
        moveQuestion(-1);
        break;

      case 'continue':
        continueJourney();
        break;

      case 'open-review':
        focusRestoreSelector = '[data-action="open-review"]';
        state.reviewOpen = true;
        state.reviewOrigin = state.screen;
        saveState();
        render();
        break;

      case 'close-review':
        state.reviewOpen = false;
        saveState();
        render();
        break;

      case 'jump-question': {
        const questionId = actionTarget.dataset.questionId;
        if (questionId) {
          state.currentQuestionId = questionId;
          state.screen = 'assessment';
          state.reviewOpen = false;
          state.helpPanel = '';
          saveState();
          render();
        }
        break;
      }

      case 'jump-function': {
        const functionKey = actionTarget.dataset.functionKey;
        const nextQuestionId = getFirstUnansweredQuestionId(functionKey);
        if (nextQuestionId) {
          state.currentQuestionId = nextQuestionId;
          state.screen = isLeadReady() ? 'assessment' : 'lead';
          state.reviewOpen = false;
          saveState();
          render();
        }
        break;
      }

      case 'go-first-missing': {
        const nextQuestionId = getFirstUnansweredQuestionId();
        if (nextQuestionId) {
          state.currentQuestionId = nextQuestionId;
          state.screen = 'assessment';
          state.reviewOpen = false;
          saveState();
          render();
        }
        break;
      }

      case 'select-option':
        updateAnswer(actionTarget.dataset.questionId, actionTarget.dataset.option);
        break;

      case 'set-dplus-level':
        setDplusLevel(actionTarget.dataset.questionId, actionTarget.dataset.level);
        break;

      case 'toggle-help': {
        const nextHelp = actionTarget.dataset.help;
        const opening = state.helpPanel !== nextHelp;
        state.helpPanel = opening ? nextHelp : '';
        saveState();
        render();
        if (opening) {
          emitProductEvent('help_open', {
            type: nextHelp,
            questionId: getCurrentQuestion()?.id || '',
          });
        }
        break;
      }

      case 'clear-answer':
        clearAnswer(actionTarget.dataset.questionId || state.currentQuestionId);
        break;

      case 'close-notice':
        clearNotice();
        break;

      case 'retry-submissions':
        flushPendingSubmissions();
        break;

      case 'open-service': {
        const serviceKey = actionTarget.dataset.serviceKey;
        if (serviceKey && servicesByKey[serviceKey]) {
          focusRestoreSelector = `[data-service-key="${serviceKey}"]`;
          state.serviceDetailKey = serviceKey;
          saveState();
          render();
          emitProductEvent('service_learn_more_open', {
            serviceKey,
          });
        }
        break;
      }

      case 'close-service':
        state.serviceDetailKey = '';
        saveState();
        render();
        break;

      case 'restart-keep-lead':
        if (window.confirm('Reiniciar o assessment e manter os dados do lead?')) {
          restartAssessment('keep-lead');
        }
        break;

      case 'restart-clear-lead':
        if (window.confirm('Apagar respostas e também limpar os dados do lead?')) {
          restartAssessment('clear-lead');
        }
        break;

      default:
        break;
    }
  }

  function handleSubmit(event) {
    const form = event.target.closest('[data-form="lead"]');
    if (!form) {
      return;
    }

    event.preventDefault();
    state.leadAttempted = true;

    const errors = validateLead(state.profile);
    if (Object.keys(errors).length) {
      emitProductEvent('lead_submit_error', {
        fields: Object.keys(errors),
      });
      setNotice('error', 'Revise os campos destacados para continuar.');
      return;
    }

    state.leadContext = buildLeadContext(state.profile);
    state.screen = 'assessment';
    state.currentQuestionId = getFirstUnansweredQuestionId() || questions[0]?.id || '';
    state.startedAt = state.startedAt || Date.now();
    state.leadAttempted = false;
    state.touchedFields = {};
    state.notice = null;
    saveState();

    emitProductEvent('lead_submit_success', {
      role: state.leadContext.role,
      segment: state.leadContext.segment,
      size: state.leadContext.size,
    });
    emitProductEvent('assessment_start', {
      assessmentMode: state.leadContext.assessmentMode,
    });

    ensureStartedSubmission();
    render();
  }

  function handleInput(event) {
    const profileField = event.target.closest('[data-profile-input]');
    if (profileField) {
      const fieldName = profileField.name;
      let value = profileField.value;

      if (fieldName === 'phone') {
        value = formatPhoneDisplay(value);
        profileField.value = value;
      }

      state.profile = {
        ...state.profile,
        [fieldName]: value,
      };
      state.leadContext = buildLeadContext(state.profile);
      saveState();
      return;
    }

    const evidenceField = event.target.closest('[data-evidence-input]');
    if (evidenceField) {
      const questionId = evidenceField.dataset.questionId;
      const answer = getAnswer(questionId);
      if (answer) {
        state.answers[questionId] = {
          ...answer,
          evidence: evidenceField.value,
        };
        if (state.completedAt && allQuestionsAnswered()) {
          state.reportDirty = true;
          queueSubmission('completed');
        } else {
          saveState();
        }
      }
    }
  }

  function handleBlur(event) {
    const field = event.target.closest('[data-field]');
    if (!field) {
      return;
    }

    state.touchedFields[field.dataset.field] = true;
    saveState();
    render();
  }
})();
