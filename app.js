(function () {
  const root = document.getElementById('app');
  if (!root) return;

  const config = {
    specialistWhatsApp: '5511991559361',
    rdAdapterUrl: '',
    appVersion: '4.0.0',
    productEventHook: '',
    ...(window.NAVE_RUNTIME_CONFIG || {}),
  };

  const STORAGE_KEY = 'nave-v4-minimal';
  const VERSION = '4.0.0';
  const SIZE_OPTIONS = [
    'Até 50 colaboradores',
    '51 a 200 colaboradores',
    '201 a 500 colaboradores',
    '501 a 1.000 colaboradores',
    'Acima de 1.000 colaboradores',
  ];
  const SEGMENT_OPTIONS = [
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
  ];
  const OPTION_ORDER = ['A', 'B', 'C', 'D'];
  const OPTION_SCORES = { A: 0, B: 1, C: 2, D: 3 };
  const FEEDBACK_BY_OPTION = {
    A: 'Isso ajuda a mostrar onde o processo ainda depende de improviso.',
    B: 'Boa. Aqui já existe intenção, mas ainda falta consistência.',
    C: 'Boa. Isso já mostra uma base funcional.',
    D: 'Ótimo. Isso sugere uma prática mais estruturada.',
  };

  let content = null;
  let services = {};
  let segmentRiskMap = {};
  let state = null;
  let fabTimer = 0;

  boot();

  async function boot() {
    try {
      const [questionData, serviceData, riskData] = await Promise.all([
        fetchJson('./questions.ptbr.json'),
        fetchJson('./services.ptbr.json'),
        fetchJson('./segmentRiskMap.json'),
      ]);

      content = questionData;
      services = serviceData;
      segmentRiskMap = riskData;
      state = loadState();
      syncState();
      bindEvents();
      render();
    } catch (error) {
      root.innerHTML = `
        <main class="app-shell app-shell--error">
          <section class="error-card">
            <h1>Não foi possível carregar o N.A.V.E.</h1>
            <p>Atualize a página e tente novamente.</p>
          </section>
        </main>
      `;
    }
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
    return response.json();
  }

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

  function defaultState() {
    return {
      version: VERSION,
      screen: 'entry',
      entryMode: 'hero',
      profile: defaultProfile(),
      leadContext: null,
      answers: {},
      currentIndex: 0,
      helpPanel: '',
      modalServiceKey: '',
      notice: '',
      touched: {},
      leadAttempted: false,
      fabPreview: '',
      startedAt: null,
      completedAt: null,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION) return defaultState();
      return {
        ...defaultState(),
        ...parsed,
        profile: { ...defaultProfile(), ...(parsed.profile || {}) },
        answers: parsed.answers || {},
        touched: parsed.touched || {},
      };
    } catch (error) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function syncState() {
    if (state.profile && Object.values(state.profile).some((value) => String(value || '').trim())) {
      state.leadContext = buildLeadContext(state.profile);
    }
    if (state.currentIndex < 0) state.currentIndex = 0;
    if (content && state.currentIndex >= content.questions.length) {
      state.currentIndex = content.questions.length - 1;
    }
    if (state.screen === 'results' && content && getAnsweredCount() < content.questions.length) {
      state.screen = 'questions';
    }
  }

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizePhoneDigits(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('55')) return digits;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  }

  function formatPhoneDisplay(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
    digits = digits.slice(0, 11);
    if (!digits) return '';
    if (digits.length < 3) return `(${digits}`;
    if (digits.length < 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length < 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function getRoleGroup(role) {
    const value = normalizeText(role);
    if (value.includes('jurid') || value.includes('compliance')) return 'legal';
    if (
      value.includes('cio') ||
      value.includes('cto') ||
      value.includes('ti') ||
      value.includes('infra') ||
      value.includes('tecnologia') ||
      value.includes('seguranca')
    ) {
      return 'tech';
    }
    return 'exec';
  }

  function getSizeBand(size) {
    const value = normalizeText(size);
    if (!value) return 'unknown';
    if (value.includes('ate 50')) return 'micro';
    if (value.includes('51 a 200')) return 'small';
    if (value.includes('201 a 500')) return 'mid';
    if (value.includes('501 a 1.000') || value.includes('501 a 1000')) return 'large';
    if (value.includes('acima de 1.000') || value.includes('acima de 1000')) return 'enterprise';
    return 'mid';
  }

  function getSegmentRisk(segment) {
    const value = normalizeText(segment);
    for (const level of ['high', 'medium', 'low']) {
      const matches = segmentRiskMap[level] || [];
      if (matches.some((item) => value.includes(normalizeText(item)))) {
        return level;
      }
    }
    return 'medium';
  }

  function getExpectedTier(leadContext) {
    if (!leadContext) return 2;
    if (leadContext.sizeBand === 'micro') {
      return leadContext.segmentRisk === 'high' ? 3 : 2;
    }
    if (leadContext.sizeBand === 'enterprise') {
      return leadContext.segmentRisk === 'high' ? 4 : 3;
    }
    return leadContext.segmentRisk === 'high' ? 3 : 3;
  }

  function buildLeadContext(profile) {
    const firstName = String(profile.name || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    const roleGroup = getRoleGroup(profile.role);
    const sizeBand = getSizeBand(profile.size);
    const segmentRisk = getSegmentRisk(profile.segment);
    return {
      ...profile,
      firstName,
      roleGroup,
      sizeBand,
      segmentRisk,
      expectedTier: getExpectedTier({ roleGroup, sizeBand, segmentRisk }),
      phoneDigits: normalizePhoneDigits(profile.phone),
    };
  }

  function validateProfile(profile) {
    const errors = {};
    if (!String(profile.name || '').trim()) errors.name = 'Digite seu nome.';
    if (!String(profile.role || '').trim()) errors.role = 'Digite seu cargo.';
    if (!String(profile.email || '').trim()) {
      errors.email = 'Digite seu e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(profile.email).trim())) {
      errors.email = 'Use um e-mail válido.';
    }
    if (!String(profile.company || '').trim()) errors.company = 'Digite a empresa.';
    if (!String(profile.size || '').trim()) errors.size = 'Selecione o porte.';
    if (!String(profile.segment || '').trim()) errors.segment = 'Selecione o segmento.';
    const phoneDigits = normalizePhoneDigits(profile.phone);
    if (String(profile.phone || '').trim() && phoneDigits.length < 12) {
      errors.phone = 'Confira o telefone informado.';
    }
    return errors;
  }

  function isLeadReady() {
    return Object.keys(validateProfile(state.profile)).length === 0;
  }

  function getAnsweredCount() {
    return Object.keys(state.answers).length;
  }

  function getProgressPercent() {
    return (getAnsweredCount() / content.questions.length) * 100;
  }

  function getCurrentQuestion() {
    return content.questions[state.currentIndex];
  }

  function getCurrentAnswer() {
    return state.answers[getCurrentQuestion().id] || '';
  }

  function getVisibleOption(question, key) {
    return {
      key,
      title: question[`opcao_${key.toLowerCase()}_titulo`],
      desc: question[`opcao_${key.toLowerCase()}_desc`],
    };
  }

  function getRiskMultiplier(question, leadContext) {
    let multiplier = 1;
    const capabilities = question.capacidade || [];
    if (leadContext.segmentRisk === 'high') {
      if (capabilities.includes('personal-data-governance')) multiplier *= 1.25;
      if (capabilities.includes('access-protection') || capabilities.includes('critical-identity')) {
        multiplier *= 1.2;
      }
      if (question.categoria === 'DE' || question.categoria === 'RS') multiplier *= 1.15;
    }
    if (leadContext.sizeBand === 'micro') {
      const essential =
        capabilities.includes('access-protection') ||
        capabilities.includes('critical-identity') ||
        question.categoria === 'RC';
      if (question.categoria === 'GV' && !essential) multiplier *= 0.9;
    }
    return multiplier;
  }

  function getObservedTier(score) {
    if (score < 1) {
      return {
        level: 1,
        title: 'nível 1 de maturidade',
        description: 'A operação ainda depende mais de improviso do que de padrão.',
      };
    }
    if (score < 2) {
      return {
        level: 2,
        title: 'nível 2 de maturidade',
        description: 'Já existe base, mas pontos críticos ainda pedem esforço manual demais.',
      };
    }
    if (score < 3) {
      return {
        level: 3,
        title: 'nível 3 de maturidade',
        description: 'A empresa já opera com mais consistência, mas ainda há espaço claro para integrar melhor.',
      };
    }
    return {
      level: 4,
      title: 'nível 4 de maturidade',
      description: 'A prática já aparece de forma mais estruturada e conectada ao negócio.',
    };
  }

  function rankServices(gaps) {
    const ranking = Object.values(services).map((service) => {
      let score = 0;
      let strongestGap = null;

      gaps.forEach((gap) => {
        const capHits = (gap.question.capacidade || []).filter((item) =>
          (service.fitSignals || []).includes(item)
        ).length;
        const categoryHit = (service.nistFunctions || []).includes(gap.question.categoria);
        if (!capHits && !categoryHit) return;

        let points = gap.gapValue;
        if (capHits) points *= 1 + capHits * 0.18;
        if (categoryHit) points *= 1.12;
        score += points;

        if (!strongestGap || gap.gapValue > strongestGap.gapValue) {
          strongestGap = gap;
        }
      });

      const whyAppeared = strongestGap
        ? `Apareceu porque hoje o maior atrito está em "${strongestGap.question.pergunta
            .replace(/\?$/, '')
            .toLowerCase()}".`
        : 'Apareceu porque esta frente tende a reduzir risco com mais clareza e velocidade.';

      return {
        ...service,
        rankingScore: score,
        whyAppeared,
        strongestGap,
      };
    });

    return ranking
      .filter((item) => item.rankingScore > 0)
      .sort((a, b) => b.rankingScore - a.rankingScore);
  }

  function computeResults() {
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    const answeredQuestions = content.questions
      .map((question) => {
        const option = state.answers[question.id];
        if (!option) return null;
        const rawScore = OPTION_SCORES[option];
        const normalizedScore = (rawScore / 3) * 4;
        const multiplier = getRiskMultiplier(question, leadContext);
        return {
          question,
          option,
          rawScore,
          normalizedScore,
          multiplier,
          gapValue: (3 - rawScore) * question.peso * multiplier,
        };
      })
      .filter(Boolean);

    let weightedScore = 0;
    let totalWeight = 0;

    answeredQuestions.forEach((item) => {
      const effectiveWeight = item.question.peso * item.multiplier;
      weightedScore += item.normalizedScore * effectiveWeight;
      totalWeight += effectiveWeight;
    });

    const score = totalWeight ? weightedScore / totalWeight : 0;
    const percent = Math.round((score / 4) * 100);
    const observedTier = getObservedTier(score);
    const expectedTier = leadContext.expectedTier;
    const gap = Math.max(expectedTier - observedTier.level, 0);
    const topGaps = answeredQuestions.sort((a, b) => b.gapValue - a.gapValue);
    const rankedServices = rankServices(topGaps);
    const topServices = rankedServices.slice(0, 3);

    const summary =
      observedTier.level <= 1
        ? 'Você ainda depende de improviso em pontos que já deveriam ter dono e rotina.'
        : observedTier.level === 2
          ? 'Você já tem base, mas ainda depende de esforço manual em pontos críticos.'
          : observedTier.level === 3
            ? 'Você tem uma base mais consistente, mas ainda pode reduzir atrito e exceção em frentes importantes.'
            : 'Você já mostra uma operação mais estruturada, mas ainda vale consolidar o que sustenta crescimento com segurança.';

    return {
      score,
      percent,
      observedTier,
      expectedTier,
      gap,
      topGaps,
      topServices,
      primaryService: topServices[0] || null,
      secondaryService: topServices[1] || topServices[0] || null,
      strategicService: topServices[2] || topServices[1] || topServices[0] || null,
      mainProblem: topGaps[0]?.question.pergunta || 'maturidade geral',
      summary,
    };
  }

  function emitEvent(type, payload) {
    const detail = {
      type,
      payload: payload || {},
      timestamp: new Date().toISOString(),
    };
    try {
      document.dispatchEvent(new CustomEvent('nave:event', { detail }));
    } catch (error) {
      // noop
    }
    try {
      if (typeof config.productEventHook === 'function') {
        config.productEventHook(detail);
      } else if (config.productEventHook && typeof fetch === 'function') {
        fetch(config.productEventHook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detail),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (error) {
      // noop
    }
  }

  function buildWhatsAppMessage(service) {
    const lead = state.leadContext || buildLeadContext(state.profile);
    const results = getAnsweredCount() ? computeResults() : null;
    const lines = [
      content.meta.specialistMessage ||
        'Olá. Concluí o N.A.V.E. e gostaria de falar com um especialista da Active Solutions.',
    ];

    if (lead.name) lines.push(`Nome: ${lead.name}`);
    if (lead.role) lines.push(`Cargo: ${lead.role}`);
    if (lead.company) lines.push(`Empresa: ${lead.company}`);
    if (lead.size) lines.push(`Porte: ${lead.size}`);
    if (lead.segment) lines.push(`Segmento: ${lead.segment}`);
    if (results) {
      lines.push(`Nível observado: ${results.observedTier.level}`);
      lines.push(`Nível esperado: ${results.expectedTier}`);
      lines.push(`Principal ponto identificado: ${results.mainProblem}`);
    }
    if (service) lines.push(`Quero entender melhor o serviço: ${service.name}`);

    return lines.join('\n');
  }

  function buildWhatsAppLink(service) {
    return `https://wa.me/${config.specialistWhatsApp}?text=${encodeURIComponent(
      buildWhatsAppMessage(service)
    )}`;
  }

  function getFeedbackMessage(option) {
    const lead = state.leadContext || buildLeadContext(state.profile);
    const intro = lead.firstName ? `${lead.firstName}, ` : '';
    return `${intro}${FEEDBACK_BY_OPTION[option]}`;
  }

  function setNotice(message) {
    state.notice = message;
    saveState();
    render();
  }

  function clearNotice() {
    if (!state.notice) return;
    state.notice = '';
    saveState();
    render();
  }

  function submitLead() {
    state.leadAttempted = true;
    const errors = validateProfile(state.profile);
    if (Object.keys(errors).length) {
      setNotice('Revise os campos destacados para continuar.');
      state.fabPreview = 'Se quiser, eu posso te ajudar a começar.';
      return;
    }

    state.leadContext = buildLeadContext(state.profile);
    state.screen = 'questions';
    state.entryMode = 'hero';
    state.startedAt = state.startedAt || Date.now();
    state.notice = '';
    state.helpPanel = '';
    saveState();
    render();
    emitEvent('assessment_start', { lead: state.leadContext });
  }

  function startJourney() {
    if (isLeadReady() && getAnsweredCount() >= content.questions.length) {
      state.screen = 'results';
      saveState();
      render();
      return;
    }
    if (isLeadReady() && getAnsweredCount() < content.questions.length) {
      state.screen = 'questions';
      state.startedAt = state.startedAt || Date.now();
      saveState();
      render();
      return;
    }
    state.entryMode = 'lead';
    saveState();
    render();
  }

  function selectAnswer(option) {
    const question = getCurrentQuestion();
    state.answers[question.id] = option;
    state.helpPanel = '';
    saveState();
    render();
    emitEvent('choice_select', { questionId: question.id, option });
  }

  function nextQuestion() {
    if (!getCurrentAnswer()) return;
    if (state.currentIndex >= content.questions.length - 1) {
      state.screen = 'results';
      state.completedAt = Date.now();
      saveState();
      render();
      emitEvent('assessment_complete', computeResults());
      return;
    }
    state.currentIndex += 1;
    state.helpPanel = '';
    saveState();
    render();
  }

  function previousQuestion() {
    if (state.currentIndex === 0) return;
    state.currentIndex -= 1;
    state.helpPanel = '';
    saveState();
    render();
  }

  function toggleHelp(panel) {
    state.helpPanel = state.helpPanel === panel ? '' : panel;
    saveState();
    render();
    if (state.helpPanel) {
      emitEvent('help_open', { panel, questionId: getCurrentQuestion().id });
    }
  }

  function renderHeader() {
    const questionIndex = state.screen === 'questions' ? state.currentIndex + 1 : getAnsweredCount();
    const progressLabel =
      state.screen === 'questions'
        ? `Pergunta ${questionIndex} de ${content.questions.length}`
        : state.screen === 'results'
          ? 'Resultado'
          : 'Entrada';

    return `
      <header class="topbar">
        <div class="topbar__inner">
          <button class="brand" data-action="go-entry" aria-label="Voltar para a entrada">
            <span class="brand__name">${escapeHtml(content.meta.name)}</span>
          </button>
          <span class="topbar__progress">${escapeHtml(progressLabel)}</span>
        </div>
      </header>
    `;
  }

  function renderNotice() {
    if (!state.notice) return '';
    return `
      <div class="notice">
        <span>${escapeHtml(state.notice)}</span>
        <button class="notice__close" data-action="close-notice" aria-label="Fechar aviso">×</button>
      </div>
    `;
  }

  function renderProgressCard(answered) {
    return `
      <section class="light-card progress-card">
        <span class="progress-card__count">${answered} de ${content.questions.length} perguntas</span>
        <div class="progress-bar" aria-hidden="true">
          <span style="width:${getProgressPercent()}%"></span>
        </div>
      </section>
    `;
  }

  function renderFieldError(name, errors) {
    if (!state.leadAttempted && !state.touched[name]) return '';
    return errors[name]
      ? `<span class="field__error" id="error-${name}">${escapeHtml(errors[name])}</span>`
      : '';
  }

  function renderLeadForm() {
    const errors = validateProfile(state.profile);
    return `
      <section class="light-card lead-card">
        <div class="lead-card__head">
          <h2>Antes de começar</h2>
          <button class="link-button" data-action="back-to-hero">Voltar</button>
        </div>
        <p class="lead-card__text">Só o essencial para personalizar a leitura.</p>

        <form class="lead-form" data-form="lead">
          <label class="field">
            <span>Nome</span>
            <input type="text" name="name" data-field="name" data-profile-input value="${escapeHtml(state.profile.name)}" aria-describedby="error-name" aria-invalid="${errors.name ? 'true' : 'false'}" />
            ${renderFieldError('name', errors)}
          </label>

          <label class="field">
            <span>Cargo</span>
            <input type="text" name="role" data-field="role" data-profile-input value="${escapeHtml(state.profile.role)}" aria-describedby="error-role" aria-invalid="${errors.role ? 'true' : 'false'}" />
            ${renderFieldError('role', errors)}
          </label>

          <label class="field">
            <span>E-mail</span>
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
              ${SIZE_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${state.profile.size === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
            </select>
            ${renderFieldError('size', errors)}
          </label>

          <label class="field">
            <span>Segmento</span>
            <select name="segment" data-field="segment" data-profile-input aria-describedby="error-segment" aria-invalid="${errors.segment ? 'true' : 'false'}">
              <option value="">Selecione</option>
              ${SEGMENT_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${state.profile.segment === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
            </select>
            ${renderFieldError('segment', errors)}
          </label>

          <label class="field field--full">
            <span>Telefone / WhatsApp <small>(opcional)</small></span>
            <input type="tel" name="phone" data-field="phone" data-profile-input value="${escapeHtml(formatPhoneDisplay(state.profile.phone))}" aria-describedby="error-phone" aria-invalid="${errors.phone ? 'true' : 'false'}" />
            ${renderFieldError('phone', errors)}
          </label>

          <button class="primary-button primary-button--full" type="submit">Começar perguntas</button>
        </form>
      </section>
    `;
  }

  function renderEntry() {
    const answered = getAnsweredCount();
    const hasProgress = answered > 0;
    const showForm = state.entryMode === 'lead';

    return `
      <main class="app-shell">
        <section class="entry">
          <div class="entry__copy">
            <h1>Segurança não é só TI.<br />É clareza para decidir melhor.</h1>
            <p>Uma pergunta por vez. Sem linguagem técnica.</p>
            <button class="primary-button" data-action="start-journey">
              ${hasProgress && isLeadReady() ? 'Continuar avaliação' : 'Começar avaliação'}
            </button>
          </div>

          <div class="entry__side">
            ${showForm ? renderLeadForm() : renderProgressCard(answered)}
          </div>
        </section>
      </main>
    `;
  }

  function getPersonalLine(lead) {
    const intro = lead.firstName ? `${lead.firstName}, ` : '';
    if (lead.roleGroup === 'exec') {
      return `${intro}aqui o importante é saber se existe clareza real, não detalhe técnico.`;
    }
    if (lead.roleGroup === 'tech') {
      return `${intro}olhe para o que já é padrão hoje, e não para o cenário ideal.`;
    }
    return `${intro}o ponto aqui é entender se existe dono, rotina e alguma evidência mínima.`;
  }

  function renderOptionCard(question, key, selected) {
    const option = getVisibleOption(question, key);
    return `
      <button
        class="option-card ${selected === key ? 'is-selected' : ''}"
        data-action="select-answer"
        data-option="${key}"
      >
        <span class="option-card__label">${key} — ${escapeHtml(option.title)}</span>
        <strong>${escapeHtml(option.desc)}</strong>
      </button>
    `;
  }

  function renderHelpPanel(question) {
    if (!state.helpPanel) return '';
    if (state.helpPanel === 'explain') {
      return `
        <div class="help-panel">
          <strong>Em palavras simples</strong>
          <p>${escapeHtml(question.ajuda || 'Pense no que realmente acontece hoje, e não no desenho ideal do processo.')}</p>
        </div>
      `;
    }

    return `
      <div class="help-panel">
        <strong>Exemplos do que pode indicar uma resposta melhor</strong>
        ${question.exemplos?.length
          ? `<ul>${question.exemplos.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
          : `<p>${escapeHtml(question.dica || 'Pense em evidências simples, como rotina, aprovação ou registro.')}</p>`}
      </div>
    `;
  }

  function renderQuestionScreen() {
    const question = getCurrentQuestion();
    const answer = getCurrentAnswer();
    const lead = state.leadContext || buildLeadContext(state.profile);
    const feedback = answer ? getFeedbackMessage(answer) : '';

    return `
      <main class="app-shell app-shell--question">
        <section class="question-screen">
          <article class="question-card">
            <div class="question-card__header">
              <span class="question-card__kicker">${escapeHtml(content.meta.name)}</span>
              <span class="question-card__step">Pergunta ${state.currentIndex + 1} de ${content.questions.length}</span>
            </div>

            <div class="question-card__body">
              <h1>${escapeHtml(question.pergunta)}</h1>
              <p class="question-card__subtitle">Responda com base na prática atual.</p>
              <p class="question-card__personal">${escapeHtml(getPersonalLine(lead))}</p>
            </div>

            <div class="question-card__choices">
              ${OPTION_ORDER.map((key) => renderOptionCard(question, key, answer)).join('')}
            </div>

            <div class="question-card__help">
              <button class="link-button" data-action="toggle-help" data-panel="explain">Me explica</button>
              <button class="link-button" data-action="toggle-help" data-panel="examples">Exemplos</button>
            </div>

            ${renderHelpPanel(question)}

            ${feedback ? `<div class="feedback-pill">${escapeHtml(feedback)}</div>` : ''}

            <div class="question-card__actions">
              <button class="secondary-button" data-action="previous-question" ${state.currentIndex === 0 ? 'disabled' : ''}>
                Revisar resposta anterior
              </button>
              <button class="primary-button" data-action="next-question" ${answer ? '' : 'disabled'}>
                ${state.currentIndex === content.questions.length - 1 ? 'Ver resultado' : 'Próxima pergunta'}
              </button>
            </div>
          </article>
        </section>
      </main>
    `;
  }

  function renderDirectionCard(label, service, tone) {
    if (!service) {
      return `
        <article class="direction-card direction-card--${tone}">
          <span class="direction-card__label">${escapeHtml(label)}</span>
          <h2>Consolidar dono, rotina e critério.</h2>
          <p>As respostas ainda não geraram uma recomendação forte o suficiente. Vale revisar com um especialista.</p>
        </article>
      `;
    }

    return `
      <article class="direction-card direction-card--${tone}">
        <span class="direction-card__label">${escapeHtml(label)}</span>
        <h2>${escapeHtml(service.name)}</h2>
        <p>${escapeHtml(service.summary)}</p>
        <div class="direction-card__why">
          <strong>Por que apareceu</strong>
          <p>${escapeHtml(service.whyAppeared)}</p>
        </div>
        <button class="link-button link-button--strong" data-action="open-service" data-service-key="${service.serviceKey}">
          Saiba mais
        </button>
      </article>
    `;
  }

  function renderResultsScreen() {
    const results = computeResults();
    const primary = results.primaryService;
    const secondary = results.secondaryService;
    const strategic = results.strategicService;

    return `
      <main class="app-shell app-shell--results">
        <section class="results-screen">
          <article class="results-hero">
            <span class="results-hero__eyebrow">Resultado</span>
            <h1>Você está no ${escapeHtml(results.observedTier.title)}</h1>
            <p>${escapeHtml(results.summary)}</p>
            <div class="results-hero__meta">
              <span>Score ${results.percent}%</span>
              <span>Esperado para o seu contexto: nível ${results.expectedTier}</span>
            </div>
          </article>

          <section class="results-direction">
            ${renderDirectionCard('Se fizer só uma coisa agora, faça isso:', primary, 'primary')}
            ${renderDirectionCard('Se quiser avançar rápido:', secondary, 'secondary')}
            ${renderDirectionCard('Para estruturar o futuro:', strategic, 'strategic')}
          </section>

          <div class="results-actions">
            <button class="secondary-button" data-action="back-to-questions">Voltar às perguntas</button>
            <a class="primary-button" href="${buildWhatsAppLink()}" target="_blank" rel="noreferrer">
              Falar com especialista
            </a>
          </div>
        </section>
      </main>
    `;
  }

  function renderServiceModal() {
    if (!state.modalServiceKey || !services[state.modalServiceKey]) return '';
    const service = services[state.modalServiceKey];

    return `
      <div class="modal-backdrop" data-action="close-service">
        <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="service-title">
          <div class="modal-card__header">
            <div>
              <span class="modal-card__eyebrow">Saiba mais</span>
              <h2 id="service-title">${escapeHtml(service.name)}</h2>
            </div>
            <button class="link-button" data-action="close-service">Fechar</button>
          </div>

          <div class="modal-card__content">
            <section>
              <strong>O que esse serviço resolve</strong>
              <p>${escapeHtml(service.pain || service.summary)}</p>
            </section>
            <section>
              <strong>Quando ele faz sentido</strong>
              <p>${escapeHtml(service.whenItMakesSense || service.description)}</p>
            </section>
            <section>
              <strong>Entregáveis principais</strong>
              <ul>
                ${(service.deliverables || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
              </ul>
            </section>
          </div>

          <a class="primary-button primary-button--full" href="${buildWhatsAppLink(service)}" target="_blank" rel="noreferrer">
            Agendar bate-papo com especialista
          </a>
        </section>
      </div>
    `;
  }

  function renderWhatsAppButton() {
    return `
      <a class="floating-whatsapp" href="${buildWhatsAppLink()}" target="_blank" rel="noreferrer" aria-label="Falar com especialista pelo WhatsApp">
        <span>Falar com especialista</span>
        ${state.fabPreview ? `<small>${escapeHtml(state.fabPreview)}</small>` : ''}
      </a>
    `;
  }

  function render() {
    let screenHtml = '';

    if (state.screen === 'questions') {
      screenHtml = renderQuestionScreen();
    } else if (state.screen === 'results') {
      screenHtml = renderResultsScreen();
    } else {
      screenHtml = renderEntry();
    }

    root.innerHTML = `
      ${renderHeader()}
      ${renderNotice()}
      ${screenHtml}
      ${renderWhatsAppButton()}
      ${renderServiceModal()}
    `;

    scheduleFabPreview();
  }

  function scheduleFabPreview() {
    clearTimeout(fabTimer);
    state.fabPreview = '';

    if (state.notice) {
      state.fabPreview = 'Se quiser, eu posso te ajudar agora.';
      return;
    }

    if (state.screen !== 'questions' || getCurrentAnswer()) return;

    const panelOpen = state.helpPanel;
    fabTimer = setTimeout(() => {
      state.fabPreview = panelOpen
        ? 'Se quiser, um especialista traduz isso com você.'
        : 'Se travar aqui, eu posso te ajudar nesta resposta.';
      render();
    }, panelOpen ? 4000 : 6000);
  }

  function bindEvents() {
    root.addEventListener('click', handleClick);
    root.addEventListener('submit', handleSubmit);
    root.addEventListener('input', handleInput);
    root.addEventListener('focusout', handleBlur, true);

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.modalServiceKey) {
        state.modalServiceKey = '';
        saveState();
        render();
      }
    });
  }

  function handleClick(event) {
    const link = event.target.closest('a[href*="wa.me/"]');
    if (link) {
      emitEvent('whatsapp_click', { screen: state.screen });
      return;
    }

    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;

    if (actionTarget.classList.contains('modal-backdrop') && event.target.closest('.modal-card')) {
      return;
    }

    switch (action) {
      case 'start-journey':
        startJourney();
        break;
      case 'back-to-hero':
        state.entryMode = 'hero';
        saveState();
        render();
        break;
      case 'go-entry':
        state.screen = 'entry';
        state.modalServiceKey = '';
        saveState();
        render();
        break;
      case 'select-answer':
        selectAnswer(actionTarget.dataset.option);
        break;
      case 'next-question':
        nextQuestion();
        break;
      case 'previous-question':
        previousQuestion();
        break;
      case 'toggle-help':
        toggleHelp(actionTarget.dataset.panel);
        break;
      case 'open-service':
        state.modalServiceKey = actionTarget.dataset.serviceKey;
        saveState();
        render();
        emitEvent('service_open', { serviceKey: state.modalServiceKey });
        break;
      case 'close-service':
        state.modalServiceKey = '';
        saveState();
        render();
        break;
      case 'back-to-questions':
        state.screen = 'questions';
        saveState();
        render();
        break;
      case 'close-notice':
        clearNotice();
        break;
      default:
        break;
    }
  }

  function handleSubmit(event) {
    const form = event.target.closest('[data-form="lead"]');
    if (!form) return;
    event.preventDefault();
    submitLead();
  }

  function handleInput(event) {
    const field = event.target.closest('[data-profile-input]');
    if (!field) return;
    let value = field.value;
    if (field.name === 'phone') {
      value = formatPhoneDisplay(value);
      field.value = value;
    }
    state.profile = { ...state.profile, [field.name]: value };
    state.leadContext = buildLeadContext(state.profile);
    saveState();
  }

  function handleBlur(event) {
    const field = event.target.closest('[data-field]');
    if (!field) return;
    state.touched[field.dataset.field] = true;
    saveState();
    render();
  }
})();
