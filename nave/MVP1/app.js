(function () {
  const root = document.getElementById('app');
  if (!root) return;

  const config = {
    specialistWhatsApp: '5511991559361',
    rdAdapterUrl: '',
    appVersion: '4.0.0',
    productEventHook: '',
    schedulerAdapterUrl: '',
    schedulerSlots: [],
    ...(window.NAVE_RUNTIME_CONFIG || {}),
  };

  const STORAGE_KEY = 'nave-v4-minimal';
  const VERSION = '4.1.0';
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
  SIZE_OPTIONS.splice(0, SIZE_OPTIONS.length, '<10', '<50', '<200', '<500', '<1000', '<5000', '<10000', '>10000');
  SEGMENT_OPTIONS.splice(
    0,
    SEGMENT_OPTIONS.length,
    'Tecnologia',
    'Saúde',
    'Financeiro',
    'Indústria',
    'Serviços',
    'Varejo',
    'Agro',
    'Público',
    'Educação',
    'Outros'
  );
  const PHONE_REGEX = /^\(?\d{2}\)?[\s-]?9?\d{4}-?\d{4}$/;
  const RD_CONTACTS_ENDPOINT = 'https://api.rd.services/platform/contacts';
  const RD_FIELDS_ENDPOINT = 'https://api.rd.services/platform/contacts/fields';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const CRITICAL_SEGMENTS = new Set(['Financeiro', 'Saúde', 'Público']);
  const C_LEVEL_TOKENS = ['ceo', 'cto', 'cio', 'ciso', 'cfo', 'coo', 'diretor', 'head'];
  const RD_CUSTOM_FIELDS = [
    {
      api_identifier: 'cf_cep',
      data_type: 'STRING',
      name: { value: 'CEP' },
      label: { value: 'CEP' },
      presentation_type: 'TEXT_INPUT',
    },
    {
      api_identifier: 'cf_cidade',
      data_type: 'STRING',
      name: { value: 'Cidade' },
      label: { value: 'Cidade' },
      presentation_type: 'TEXT_INPUT',
    },
    {
      api_identifier: 'cf_estado',
      data_type: 'STRING',
      name: { value: 'Estado' },
      label: { value: 'Estado' },
      presentation_type: 'TEXT_INPUT',
    },
    {
      api_identifier: 'cf_setor',
      data_type: 'STRING',
      name: { value: 'Setor' },
      label: { value: 'Setor' },
      presentation_type: 'COMBO_BOX',
    },
    {
      api_identifier: 'cf_faixa_colaboradores',
      data_type: 'STRING',
      name: { value: 'Faixa de colaboradores' },
      label: { value: 'Faixa de colaboradores' },
      presentation_type: 'COMBO_BOX',
    },
    {
      api_identifier: 'cf_lead_score',
      data_type: 'INTEGER',
      name: { value: 'Lead score' },
      label: { value: 'Lead score' },
      presentation_type: 'NUMBER_INPUT',
    },
  ];
  const STAGE_META = {
    GV: {
      order: 1,
      label: 'Estratégia',
      subtext: 'Dar direção e prioridade ao que mais expõe o negócio.',
    },
    ID: {
      order: 2,
      label: 'Mapeamento',
      subtext: 'Entender o que realmente importa na sua operação.',
    },
    PR: {
      order: 3,
      label: 'Proteção',
      subtext: 'Fortalecer o básico que evita exposição desnecessária.',
    },
    DE: {
      order: 4,
      label: 'Monitoramento',
      subtext: 'Perceber desvios cedo, antes que eles virem impacto.',
    },
    RS: {
      order: 5,
      label: 'Ação',
      subtext: 'Responder com clareza quando algo sair do normal.',
    },
    RC: {
      order: 6,
      label: 'Recuperação',
      subtext: 'Voltar a operar com menos improviso e mais continuidade.',
    },
  };
  const HUMAN_OPTION_LABELS = {
    A: 'Não existe ainda',
    B: 'Está começando',
    C: 'Já funciona',
    D: 'Está bem resolvido',
  };
  const FREE_EMAIL_DOMAINS = [
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'yahoo.com',
    'uol.com.br',
    'bol.com.br',
    'icloud.com',
    'live.com',
    'msn.com',
    'protonmail.com',
  ];
  const RIGOR_MATRIX = {
    ONE: { tecnologia: 1, saude: 1, financeiro: 1, industria: 1, servicos: 1, varejo: 1, agro: 1, publico: 1, educacao: 1, outros: 1 },
    LT10: { tecnologia: 1, saude: 2, financeiro: 2, industria: 1, servicos: 1, varejo: 1, agro: 1, publico: 1, educacao: 1, outros: 1 },
    LT50: { tecnologia: 1, saude: 2, financeiro: 2, industria: 1, servicos: 1, varejo: 1, agro: 1, publico: 1, educacao: 1, outros: 1 },
    LT200: { tecnologia: 2, saude: 3, financeiro: 3, industria: 2, servicos: 2, varejo: 2, agro: 2, publico: 2, educacao: 2, outros: 2 },
    LT500: { tecnologia: 3, saude: 4, financeiro: 5, industria: 4, servicos: 3, varejo: 3, agro: 3, publico: 4, educacao: 3, outros: 3 },
    LT1000: { tecnologia: 4, saude: 5, financeiro: 6, industria: 5, servicos: 4, varejo: 4, agro: 4, publico: 5, educacao: 5, outros: 4 },
    LT5000: { tecnologia: 6, saude: 7, financeiro: 8, industria: 7, servicos: 6, varejo: 6, agro: 7, publico: 7, educacao: 7, outros: 6 },
    LT10000: { tecnologia: 8, saude: 9, financeiro: 10, industria: 9, servicos: 8, varejo: 8, agro: 9, publico: 9, educacao: 9, outros: 8 },
    GT10000: { tecnologia: 10, saude: 10, financeiro: 10, industria: 10, servicos: 10, varejo: 10, agro: 10, publico: 10, educacao: 10, outros: 10 },
  };
  const FEEDBACK_BY_OPTION = {
    A: 'Isso ajuda a mostrar onde o processo ainda depende de improviso.',
    B: 'Boa. Aqui já existe intenção, mas ainda falta consistência.',
    C: 'Boa. Isso já mostra uma base funcional.',
    D: 'Ótimo. Isso sugere uma prática mais estruturada.',
  };
  Object.assign(STAGE_META, {
    GV: { ...STAGE_META.GV, label: 'Estratégia', subtext: 'Dar direção e prioridade ao que mais expõe o negócio.' },
    ID: { ...STAGE_META.ID, label: 'Mapeamento', subtext: 'Entender o que realmente importa na sua operação.' },
    PR: { ...STAGE_META.PR, label: 'Proteção', subtext: 'Fortalecer o básico que evita exposição desnecessária.' },
    DE: { ...STAGE_META.DE, label: 'Monitoramento', subtext: 'Perceber desvios cedo, antes que eles virem impacto.' },
    RS: { ...STAGE_META.RS, label: 'Ação', subtext: 'Responder com clareza quando algo sair do normal.' },
    RC: { ...STAGE_META.RC, label: 'Recuperação', subtext: 'Voltar a operar com menos improviso e mais continuidade.' },
  });
  Object.assign(HUMAN_OPTION_LABELS, {
    A: 'Não existe ainda',
    B: 'Está começando',
    C: 'Já funciona',
    D: 'Está bem resolvido',
  });
  Object.assign(FEEDBACK_BY_OPTION, {
    A: 'Isso ajuda a mostrar onde o processo ainda depende de improviso.',
    B: 'Boa. Aqui já existe intenção, mas ainda falta consistência.',
    C: 'Boa. Isso já mostra uma base funcional.',
    D: 'Ótimo. Isso sugere uma prática mais estruturada.',
  });
  const PLAN_LIBRARY = {
    GV: {
      30: ['Definir responsável executivo por segurança e privacidade.', 'Criar uma lista curta de prioridades com dono e prazo.'],
      60: ['Formalizar critérios de aprovação para exceções e riscos.', 'Levar o tema para a rotina de decisão da liderança.'],
      90: ['Consolidar um plano diretor com indicadores simples.', 'Integrar segurança às decisões de produto, parceiros e expansão.'],
    },
    ID: {
      30: ['Levantar ativos, sistemas e dados críticos do negócio.', 'Identificar acessos sensíveis e dependências externas.'],
      60: ['Criar rotina de revisão do que é crítico e do que mudou.', 'Relacionar riscos digitais aos processos mais importantes.'],
      90: ['Manter inventário vivo com priorização por impacto.', 'Usar esse mapa para orientar orçamento e auditoria.'],
    },
    PR: {
      30: ['Ativar MFA nos acessos mais sensíveis.', 'Revisar privilégios excessivos e contas compartilhadas.'],
      60: ['Implantar proteção de endpoint e endurecimento dos ativos críticos.', 'Padronizar revisão de acessos, atualizações e exceções.'],
      90: ['Consolidar proteção por risco em estações, rede, nuvem e aplicações.', 'Sustentar trilha de evidência para auditoria e terceiros.'],
    },
    DE: {
      30: ['Centralizar os principais logs de segurança.', 'Definir sinais mínimos que precisam gerar alerta.'],
      60: ['Criar fluxo de triagem e investigação inicial.', 'Cobrir ativos críticos com monitoramento básico.'],
      90: ['Estruturar correlação de eventos e operação contínua.', 'Evoluir para monitoramento mais previsível e com resposta rápida.'],
    },
    RS: {
      30: ['Criar um fluxo simples de resposta para incidentes mais prováveis.', 'Definir quem aciona, quem decide e quem comunica.'],
      60: ['Escrever playbooks para phishing, ransomware e indisponibilidade.', 'Fazer um teste rápido de mesa com liderança e TI.'],
      90: ['Consolidar retenção especializada de resposta a incidentes.', 'Integrar resposta, comunicação e continuidade do negócio.'],
    },
    RC: {
      30: ['Validar backup e restauração dos ativos mais críticos.', 'Documentar prioridades mínimas de retomada.'],
      60: ['Testar cenários de indisponibilidade com áreas-chave.', 'Ajustar tempos de recuperação por impacto real.'],
      90: ['Formalizar continuidade com terceiros e processos essenciais.', 'Transformar recuperação em disciplina previsível.'],
    },
  };
  const ACTIVE_SOLUTIONS_DESCRIPTION =
    'Há 25 anos especializada em soluções de segurança cibernética, privacidade e continuidade para organizações que precisam transformar risco em decisão.';

  let content = null;
  let services = {};
  let segmentRiskMap = {};
  let state = null;
  let fabTimer = 0;
  let radarChart = null;
  let cepLookupTimer = 0;
  let rdQueueProcessing = false;
  let rdQueueRetryTimer = 0;

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
      resolveClientIp();
      processPendingRdQueue();
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

  async function resolveClientIp() {
    if (state.clientIp) return;
    try {
      const response = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      state.clientIp = data.ip || '';
      saveState();
    } catch (error) {
      // noop
    }
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
      cep: '',
      city: '',
      state: '',
      site: '',
      interest: '',
      observations: '',
      assessmentMode: 'full',
      consentMarketing: false,
    };
  }

  function defaultState() {
    return {
      version: VERSION,
      screen: 'entry',
      entryMode: 'hero',
      leadStep: 1,
      profile: defaultProfile(),
      leadContext: null,
      leadPayload: null,
      rdQueue: [],
      utm: {},
      answers: {},
      currentIndex: 0,
      tooltipOption: '',
      modalServiceKey: '',
      schedulerServiceKey: '',
      schedulerDay: '',
      schedulerTime: '',
      schedulerPending: false,
      reportPreviewOpen: false,
      notice: '',
      touched: {},
      leadAttempted: false,
      leadAttemptedStep: 0,
      fabPreview: '',
      startedAt: null,
      completedAt: null,
      clientIp: '',
      cepLookupPending: false,
      cepLookupFailed: false,
      emailWarningVisible: false,
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
    state.utm = { ...readUtmParams(), ...(state.utm || {}) };
    state.profile = {
      ...defaultProfile(),
      ...(state.profile || {}),
      size: mapLegacySizeValue(state.profile?.size || ''),
      segment: mapLegacySegmentValue(state.profile?.segment || ''),
      assessmentMode: state.profile?.assessmentMode === 'pocket' ? 'pocket' : 'full',
    };
    if (state.profile && Object.values(state.profile).some((value) => String(value || '').trim())) {
      state.leadContext = buildLeadContext(state.profile);
      state.leadPayload = buildLeadPayload(state.profile);
      state.leadStep = state.leadStep === 2 || Object.keys(validateLeadStep(state.profile, 1)).length === 0 ? 2 : 1;
      if (state.screen === 'entry' && !isLeadReady()) {
        state.entryMode = 'lead';
      }
      state.emailWarningVisible = Boolean(state.profile.email) && !state.leadContext.isCorporateEmail;
    }
    state.rdQueue = Array.isArray(state.rdQueue) ? state.rdQueue : [];
    if (state.modalServiceKey && !services[state.modalServiceKey]) state.modalServiceKey = '';
    if (state.schedulerServiceKey && !services[state.schedulerServiceKey]) state.schedulerServiceKey = '';
    if (state.currentIndex < 0) state.currentIndex = 0;
    const activeQuestions = content ? getAssessmentQuestions() : [];
    if (content && state.currentIndex >= activeQuestions.length) {
      state.currentIndex = Math.max(activeQuestions.length - 1, 0);
    }
    if (state.screen === 'results' && content && getAnsweredCount() < activeQuestions.length) {
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

  function sanitizeInlineText(value) {
    return String(value || '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sanitizeTextareaText(value) {
    return String(value || '')
      .replace(/[<>]/g, '')
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
  }

  function normalizeFullName(value) {
    return sanitizeInlineText(value)
      .split(' ')
      .filter(Boolean)
      .join(' ');
  }

  function getEmailDomain(value) {
    return String(value || '').trim().toLowerCase().split('@')[1] || '';
  }

  function isCorporateEmail(value) {
    const email = String(value || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return false;
    return !FREE_EMAIL_DOMAINS.includes(getEmailDomain(email));
  }

  function normalizePhoneDigits(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return digits.slice(2);
    }
    return digits.slice(0, 11);
  }

  function normalizePhoneE164(value) {
    const digits = normalizePhoneDigits(value);
    if (digits.length < 10) return '';
    return `+55${digits}`;
  }

  function isValidPhone(value) {
    const display = String(value || '').trim();
    if (!display) return false;
    return PHONE_REGEX.test(display) || PHONE_REGEX.test(formatPhoneDisplay(display));
  }

  function normalizeCep(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 8);
  }

  function formatCep(value) {
    const digits = normalizeCep(value);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  function formatPhoneDisplay(value) {
    let digits = normalizePhoneDigits(value);
    if (!digits) return '';
    if (digits.length < 3) return `(${digits}`;
    if (digits.length < 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length < 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function readUtmParams() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      return UTM_KEYS.reduce((acc, key) => {
        const value = sanitizeInlineText(params.get(key));
        if (value) acc[key] = value;
        return acc;
      }, {});
    } catch (error) {
      return {};
    }
  }

  function getLeadScore(profile) {
    let score = 0;
    if (isCorporateEmail(profile.email)) score += 10;
    if (sanitizeInlineText(profile.company)) score += 10;
    if (C_LEVEL_TOKENS.some((token) => normalizeText(profile.role).includes(token))) score += 10;
    if (['<5000', '<10000', '>10000'].includes(profile.size)) score += 10;
    if (CRITICAL_SEGMENTS.has(profile.segment)) score += 10;
    return score;
  }

  function getLeadClassification(score) {
    if (score >= 60) return 'Quente';
    if (score >= 30) return 'Morno';
    return 'Frio';
  }

  function mapLegacySizeValue(size) {
    const value = normalizeText(size);
    if (!value) return '';
    if (value.includes('ate 50')) return '<50';
    if (value.includes('51 a 200')) return '<200';
    if (value.includes('201 a 500')) return '<500';
    if (value.includes('501 a 1.000') || value.includes('501 a 1000')) return '<1000';
    if (value.includes('acima de 1.000') || value.includes('acima de 1000')) return '<5000';
    return size;
  }

  function mapLegacySegmentValue(segment) {
    const value = normalizeText(segment);
    if (!value) return '';
    if (value.includes('setor publico') || value.includes('publico')) return 'Público';
    if (value === 'outro') return 'Outros';
    if (value.includes('saude')) return 'Saúde';
    if (value.includes('industr')) return 'Indústria';
    if (value.includes('servic')) return 'Serviços';
    if (value.includes('educa')) return 'Educação';
    return segment;
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
    if (!size) return 'unknown';
    if (size === '<10' || size === '<50') return 'micro';
    if (size === '<200') return 'small';
    if (size === '<500') return 'mid';
    if (size === '<1000') return 'large';
    if (size === '<5000' || size === '<10000' || size === '>10000') return 'enterprise';
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

  function getRigorSegmentKey(segment) {
    const value = normalizeText(segment);
    if (value.includes('saude')) return 'saude';
    if (value.includes('finance')) return 'financeiro';
    if (value.includes('industr')) return 'industria';
    if (value.includes('servic')) return 'servicos';
    if (value.includes('varej')) return 'varejo';
    if (value.includes('agro')) return 'agro';
    if (value.includes('public')) return 'publico';
    if (value.includes('educa')) return 'educacao';
    if (value.includes('tecnolog')) return 'tecnologia';
    return 'outros';
  }

  function getRigorSizeKey(size) {
    if (size === '<10') return 'LT10';
    if (size === '<50') return 'LT50';
    if (size === '<200') return 'LT200';
    if (size === '<500') return 'LT500';
    if (size === '<1000') return 'LT1000';
    if (size === '<5000') return 'LT5000';
    if (size === '<10000') return 'LT10000';
    if (size === '>10000') return 'GT10000';
    return 'LT200';
  }

  function getContextualRigor(size, segment) {
    const sizeKey = getRigorSizeKey(size);
    const segmentKey = getRigorSegmentKey(segment);
    const wr = RIGOR_MATRIX[sizeKey]?.[segmentKey] || 5;
    return {
      wr,
      wrNorm: wr / 10,
      sizeKey,
      segmentKey,
    };
  }

  function getExpectedTierByRigor(wr) {
    if (wr <= 2) return 1;
    if (wr <= 5) return 2;
    if (wr <= 8) return 3;
    return 4;
  }

  function buildLeadContext(profile) {
    const firstName = String(profile.name || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    const roleGroup = getRoleGroup(profile.role);
    const sizeBand = getSizeBand(profile.size);
    const segmentRisk = getSegmentRisk(profile.segment);
    const rigor = getContextualRigor(profile.size, profile.segment);
    return {
      ...profile,
      firstName,
      roleGroup,
      sizeBand,
      segmentRisk,
      rigorValue: rigor.wr,
      rigorNorm: rigor.wrNorm,
      rigorSizeKey: rigor.sizeKey,
      rigorSegmentKey: rigor.segmentKey,
      expectedTier: getExpectedTierByRigor(rigor.wr),
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
    } else if (FREE_EMAIL_DOMAINS.includes(String(profile.email).trim().toLowerCase().split('@')[1] || '')) {
      errors.email = 'Use um e-mail corporativo.';
    }
    if (!String(profile.company || '').trim()) errors.company = 'Digite a empresa.';
    if (!String(profile.size || '').trim()) errors.size = 'Selecione o porte.';
    if (!String(profile.segment || '').trim()) errors.segment = 'Selecione o segmento.';
    if (normalizeCep(profile.cep).length !== 8) errors.cep = 'Informe um CEP válido.';
    const phoneDigits = normalizePhoneDigits(profile.phone);
    if (String(profile.phone || '').trim() && phoneDigits.length < 12) {
      errors.phone = 'Confira o telefone informado.';
    }
    if (!profile.consentMarketing) {
      errors.consentMarketing = 'Você precisa concordar com o uso dos dados para continuar.';
    }
    return errors;
  }

  function isLeadReady() {
    return Object.keys(validateProfile(state.profile)).length === 0;
  }

  function buildLeadContext(profile) {
    const normalizedProfile = {
      ...profile,
      name: normalizeFullName(profile.name),
      email: sanitizeInlineText(profile.email).toLowerCase(),
      phone: formatPhoneDisplay(profile.phone),
      company: sanitizeInlineText(profile.company),
      role: sanitizeInlineText(profile.role),
      cep: formatCep(profile.cep),
      city: sanitizeInlineText(profile.city),
      state: sanitizeInlineText(profile.state).toUpperCase().slice(0, 2),
      size: mapLegacySizeValue(profile.size),
      segment: mapLegacySegmentValue(profile.segment),
      assessmentMode: profile.assessmentMode === 'pocket' ? 'pocket' : 'full',
      site: sanitizeInlineText(profile.site),
      interest: sanitizeInlineText(profile.interest),
      observations: sanitizeTextareaText(profile.observations),
      consentMarketing: Boolean(profile.consentMarketing),
    };
    const firstName = String(normalizedProfile.name || '').split(/\s+/).filter(Boolean)[0] || '';
    const roleGroup = getRoleGroup(normalizedProfile.role);
    const sizeBand = getSizeBand(normalizedProfile.size);
    const segmentRisk = getSegmentRisk(normalizedProfile.segment);
    const rigor = getContextualRigor(normalizedProfile.size, normalizedProfile.segment);
    const leadScore = getLeadScore(normalizedProfile);
    return {
      ...normalizedProfile,
      firstName,
      roleGroup,
      sizeBand,
      segmentRisk,
      rigorValue: rigor.wr,
      rigorNorm: rigor.wrNorm,
      rigorSizeKey: rigor.sizeKey,
      rigorSegmentKey: rigor.segmentKey,
      expectedTier: getExpectedTierByRigor(rigor.wr),
      phoneDigits: normalizePhoneDigits(normalizedProfile.phone),
      isCorporateEmail: isCorporateEmail(normalizedProfile.email),
      leadScore,
      leadClassification: getLeadClassification(leadScore),
    };
  }

  function validateLeadStep(profile, step = 2) {
    const data = buildLeadContext(profile);
    const errors = {};

    if (!data.name) {
      errors.name = 'Digite seu nome completo.';
    } else if (data.name.split(/\s+/).length < 2) {
      errors.name = 'Use pelo menos nome e sobrenome.';
    }

    if (!data.email) {
      errors.email = 'Digite seu e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Use um e-mail válido.';
    }

    if (!data.phone) {
      errors.phone = 'Digite seu telefone.';
    } else if (!isValidPhone(data.phone)) {
      errors.phone = 'Confira o telefone informado.';
    }

    if (step === 1) {
      return errors;
    }

    if (!data.company) errors.company = 'Digite sua empresa.';
    if (!data.role) errors.role = 'Digite seu cargo.';
    if (normalizeCep(data.cep).length !== 8) errors.cep = 'Informe um CEP válido.';
    if (!data.size) errors.size = 'Selecione a faixa de colaboradores.';
    if (!data.segment) errors.segment = 'Selecione o setor.';
    if (!data.consentMarketing) {
      errors.consentMarketing = 'Você precisa concordar com o uso dos dados para continuar.';
    }

    return errors;
  }

  function validateProfile(profile) {
    return validateLeadStep(profile, 2);
  }

  function isLeadReady() {
    return Object.keys(validateLeadStep(state.profile, 2)).length === 0;
  }

  function isStepReady(step) {
    return Object.keys(validateLeadStep(state.profile, step)).length === 0;
  }

  function inferLeadStep(profile) {
    return Object.keys(validateLeadStep(profile, 1)).length === 0 ? 2 : 1;
  }

  function buildLeadPayload(profile = state.profile) {
    const data = buildLeadContext(profile);
    const timestamp = new Date().toISOString();
    return {
      nome: data.name,
      email: data.email,
      telefone: normalizePhoneE164(data.phone),
      empresa: data.company,
      cargo: data.role,
      cep: normalizeCep(data.cep),
      cidade: data.city,
      estado: data.state,
      faixa_colaboradores: data.size,
      setor: data.segment,
      site: data.site,
      interesse: data.interest,
      observacoes: data.observations,
      consentimento_marketing: Boolean(data.consentMarketing),
      is_email_corporativo: Boolean(data.isCorporateEmail),
      lead_score: data.leadScore,
      lead_classificacao: data.leadClassification,
      ip: state.clientIp || '',
      user_agent: window.navigator.userAgent || '',
      timestamp,
      utm: { ...(state.utm || {}) },
    };
  }

  function getAssessmentQuestions(profile = state.profile) {
    if (!content?.questions?.length) return [];
    const mode = profile?.assessmentMode === 'pocket' ? 'pocket' : 'full';
    if (mode === 'full') return content.questions;

    const bucket = new Map();
    content.questions.forEach((question) => {
      const category = question.categoria || '';
      const items = bucket.get(category) || [];
      items.push(question);
      bucket.set(category, items);
    });

    return Object.keys(STAGE_META).flatMap((category) => (bucket.get(category) || []).slice(0, 2));
  }

  function getAssessmentQuestionCount(profile = state.profile) {
    return getAssessmentQuestions(profile).length;
  }

  function getAnsweredCount() {
    const questionIds = new Set(getAssessmentQuestions().map((question) => question.id));
    return Object.keys(state.answers).filter((id) => questionIds.has(id)).length;
  }

  function getProgressPercent() {
    const total = getAssessmentQuestionCount();
    return total ? (getAnsweredCount() / total) * 100 : 0;
  }

  function getCurrentQuestion() {
    return getAssessmentQuestions()[state.currentIndex];
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

  function getAnswerRatio(option) {
    if (!option) return 0;
    return (OPTION_SCORES[option] || 0) / 3;
  }

  function getQuestionInterpretationFocus(question) {
    const capability = question.capacidade?.[0];
    const capabilityMap = {
      'access-protection': 'ter controle real sobre quem acessa o que e em quais condicoes',
      'critical-identity': 'proteger acessos privilegiados e identidades criticas',
      'personal-data-governance': 'dar clareza ao uso, retencao e responsabilidade sobre dados pessoais',
      'monitoring-traceability': 'enxergar sinais confiaveis e preservar evidencias quando algo sair do normal',
      'hardening-updates': 'manter ativos criticos atualizados e protegidos com padrao minimo',
      'third-party-response': 'organizar dependencias, criterios e resposta com terceiros',
      'external-exposure': 'reduzir exposicao desnecessaria e revisar o que fica aberto para fora',
      'application-security': 'evitar que mudancas e publicacoes empurrem risco para producao',
    };
    const categoryMap = {
      GV: 'dar direcao, prioridade e dono claro para este tema',
      ID: 'ter visibilidade suficiente sobre o que e realmente critico',
      PR: 'transformar controle basico em disciplina operacional',
      DE: 'perceber desvios cedo e com evidencia confiavel',
      RS: 'responder com menos improviso e mais coordenacao',
      RC: 'recuperar com prioridade, previsibilidade e continuidade',
    };
    return capabilityMap[capability] || categoryMap[question.categoria] || '';
  }

  function getQuestionReasonText(question, answerKey) {
    if (!answerKey) return '';
    const focus = getQuestionInterpretationFocus(question);
    const answerMap = {
      A: 'A resposta mostra ausencia pratica neste ponto, o que tende a empurrar a empresa para improviso quando houver pressao, auditoria ou incidente.',
      B: 'A resposta mostra intencao, mas ainda sem consistencia suficiente. O risco aqui e depender de pessoas-chave, esforco manual e excecoes frequentes.',
      C: 'A resposta mostra uma base funcional. O proximo ganho costuma vir de padronizar cadencia, dono e evidencia para que isso nao varie entre areas.',
      D: 'A resposta indica um ponto mais resolvido e integrado a rotina. O cuidado agora e sustentar essa disciplina com revisao periodica e menos excecoes.',
    };
    const answerNarrative = answerMap[answerKey];
    if (!focus || !answerNarrative) return '';
    return `Aqui o ponto central e ${focus}. ${answerNarrative}`;
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

  function calculateDomainScore(domainKey, domainQuestions, answers, wrNorm) {
    let pesoEsperado = 0;
    let pesoObtido = 0;
    const questionBreakdown = [];

    domainQuestions.forEach((question) => {
      const valorEsperado = 1;
      const valorObtido = getAnswerRatio(answers[question.id]);
      const peso = question.peso || 0;

      pesoEsperado += peso * valorEsperado;
      pesoObtido += peso * valorObtido;
      questionBreakdown.push({
        question,
        answer: answers[question.id] || '',
        valorEsperado,
        valorObtido,
        peso,
        questionGap: peso * (valorEsperado - valorObtido),
      });
    });

    const scoreBruto = pesoEsperado ? (pesoObtido / pesoEsperado) * 100 : 0;
    const gap = pesoEsperado - pesoObtido;
    const gapAjustado = gap * wrNorm;
    const scoreFinal = pesoObtido;
    const scorePercentual = scoreBruto;

    return {
      domainKey,
      stage: getStageMeta(domainKey),
      pesoEsperado,
      pesoObtido,
      scoreBruto,
      gap,
      gapAjustado,
      scoreFinal,
      scorePercentual,
      questions: questionBreakdown.sort((a, b) => b.questionGap - a.questionGap),
    };
  }

  function rankServices(domainResults, gaps) {
    const sortedDomains = [...domainResults].sort((a, b) => a.scorePercentual - b.scorePercentual);
    const usedServices = new Set();
    const recommendations = [];

    sortedDomains.forEach((domain) => {
      const domainGaps = gaps.filter((gap) => gap.question.categoria === domain.domainKey);
      const candidates = Object.values(services)
        .filter((service) => (service.nistFunctions || []).includes(domain.domainKey))
        .map((service) => {
          const fitHits = domainGaps.reduce((acc, gap) => {
            const hits = (gap.question.capacidade || []).filter((item) =>
              (service.fitSignals || []).includes(item)
            ).length;
            return acc + hits;
          }, 0);

          return {
            ...service,
            rankingScore: (100 - domain.scorePercentual) + fitHits * 6,
            strongestGap: domainGaps[0] || null,
            recommendedDomain: domain.domainKey,
            domainScore: domain.scorePercentual,
            whyAppeared: `Foi recomendado porque ${domain.stage.label.toLowerCase()} está entre as frentes mais frágeis hoje, com ${Math.round(domain.scorePercentual)}% de aderência ao esperado.`,
          };
        })
        .sort((a, b) => b.rankingScore - a.rankingScore);

      const picked = candidates.find((item) => !usedServices.has(item.serviceKey));
      if (picked) {
        usedServices.add(picked.serviceKey);
        recommendations.push(picked);
      }
    });

    if (recommendations.length) return recommendations;
    return Object.values(services).slice(0, 5).map((item) => ({
      ...item,
      rankingScore: 1,
      whyAppeared: 'Foi recomendado porque ajuda a transformar o diagnóstico em uma frente concreta de evolução.',
      recommendedDomain: '',
      domainScore: 0,
      strongestGap: null,
    }));
  }

  function getStageMeta(category) {
    return STAGE_META[category] || { order: 0, label: 'Etapa', subtext: '' };
  }

  function getCategoryLabel(category) {
    return getStageMeta(category).label;
  }

  function getHumanOptionLabel(key) {
    return HUMAN_OPTION_LABELS[key] || key;
  }

  function getOptionTooltip(question, key) {
    const option = getVisibleOption(question, key);
    return option.desc || option.title || '';
  }

  function getGapTheme(gap) {
    if (!gap?.question) return 'clareza operacional';
    const capability = gap.question.capacidade?.[0];
    const capabilityThemes = {
      'access-protection': 'controle de acessos e privilégios',
      'critical-identity': 'identidades críticas sem proteção suficiente',
      'personal-data-governance': 'dados sensíveis sem direcionamento claro',
      'monitoring-traceability': 'baixa visibilidade sobre desvios e sinais de risco',
      'hardening-updates': 'ativos críticos sem proteção consistente',
      'third-party-response': 'dependência de terceiros sem resposta organizada',
      'external-exposure': 'exposição externa acima do necessário',
      'application-security': 'mudanças digitais sem critério mínimo de segurança',
    };
    const categoryThemes = {
      GV: 'falta de direção e prioridade clara',
      ID: 'visibilidade insuficiente sobre o que é crítico',
      PR: 'controles básicos ainda frágeis',
      DE: 'baixa capacidade de perceber desvio cedo',
      RS: 'resposta pouco organizada quando algo sai do normal',
      RC: 'recuperação dependente de improviso',
    };
    return capabilityThemes[capability] || categoryThemes[gap.question.categoria] || 'clareza operacional';
  }

  function getRoleAwareHint() {
    return 'Considere o que acontece na prática, não no ideal.';
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

  function getGapTheme(gap) {
    if (!gap?.question) return 'clareza operacional';
    const capability = gap.question.capacidade?.[0];
    const capabilityThemes = {
      'access-protection': 'controle de acessos e privilégios',
      'critical-identity': 'identidades críticas sem proteção suficiente',
      'personal-data-governance': 'dados sensíveis sem direcionamento claro',
      'monitoring-traceability': 'baixa visibilidade sobre desvios e sinais de risco',
      'hardening-updates': 'ativos críticos sem proteção consistente',
      'third-party-response': 'dependência de terceiros sem resposta organizada',
      'external-exposure': 'exposição externa acima do necessário',
      'application-security': 'mudanças digitais sem critério mínimo de segurança',
    };
    const categoryThemes = {
      GV: 'falta de direção e prioridade clara',
      ID: 'visibilidade insuficiente sobre o que é crítico',
      PR: 'controles básicos ainda frágeis',
      DE: 'baixa capacidade de perceber desvio cedo',
      RS: 'resposta pouco organizada quando algo sai do normal',
      RC: 'recuperação dependente de improviso',
    };
    return capabilityThemes[capability] || categoryThemes[gap.question.categoria] || 'clareza operacional';
  }

  function getCapabilityAction(capability, category) {
    const capabilityMap = {
      'access-protection': 'Colocar acessos e privilégios sob um critério claro.',
      'critical-identity': 'Tratar identidades críticas com mais controle e menos exceção.',
      'personal-data-governance': 'Dar dono claro ao uso e à proteção de dados sensíveis.',
      'monitoring-traceability': 'Criar visibilidade mínima para perceber desvios cedo.',
      'hardening-updates': 'Padronizar atualização e proteção básica dos ativos críticos.',
      'third-party-response': 'Organizar resposta, escalonamento e dependências com terceiros.',
      'external-exposure': 'Reduzir exposição externa com revisão contínua do que está aberto.',
      'application-security': 'Levar critérios de segurança para mudanças e aplicações.',
    };

    const categoryMap = {
      GV: 'Definir dono executivo, critério e rotina para este tema.',
      ID: 'Mapear o que é crítico e manter isso visível para decisão.',
      PR: 'Fortalecer os controles mínimos que reduzem risco todo dia.',
      DE: 'Ganhar visibilidade para detectar desvio antes do impacto.',
      RS: 'Dar forma a uma resposta organizada quando algo sair do normal.',
      RC: 'Preparar recuperação e continuidade com prioridade clara.',
    };

    return capabilityMap[capability] || categoryMap[category] || 'Dar dono e rotina a esta frente.';
  }

  function getQuestionExpectedAnswer() {
    return 'Está bem resolvido';
  }

  function rankServices(domainResults, gaps) {
    const sortedDomains = [...domainResults].sort((a, b) => a.scorePercentual - b.scorePercentual);
    const usedServices = new Set();
    const recommendations = [];

    sortedDomains.forEach((domain) => {
      const domainGaps = gaps.filter((gap) => gap.question.categoria === domain.domainKey);
      const candidates = Object.values(services)
        .filter((service) => (service.nistFunctions || []).includes(domain.domainKey))
        .map((service) => {
          const fitHits = domainGaps.reduce((acc, gap) => {
            const hits = (gap.question.capacidade || []).filter((item) => (service.fitSignals || []).includes(item)).length;
            return acc + hits;
          }, 0);

          return {
            ...service,
            rankingScore: (100 - domain.scorePercentual) + fitHits * 6,
            strongestGap: domainGaps[0] || null,
            recommendedDomain: domain.domainKey,
            domainScore: domain.scorePercentual,
            whyAppeared: `Foi recomendado porque ${domain.stage.label.toLowerCase()} está entre as frentes mais frágeis hoje, com ${Math.round(domain.scorePercentual)}% de aderência ao esperado.`,
          };
        })
        .sort((a, b) => b.rankingScore - a.rankingScore);

      const picked = candidates.find((item) => !usedServices.has(item.serviceKey));
      if (picked) {
        usedServices.add(picked.serviceKey);
        recommendations.push(picked);
      }
    });

    if (recommendations.length) return recommendations;
    return Object.values(services).slice(0, 5).map((item) => ({
      ...item,
      rankingScore: 1,
      whyAppeared: 'Foi recomendado porque ajuda a transformar o diagnóstico em uma frente concreta de evolução.',
      recommendedDomain: '',
      domainScore: 0,
      strongestGap: null,
    }));
  }

  function getCapabilityAction(capability, category) {
    const capabilityMap = {
      'access-protection': 'Colocar acessos e privilégios sob um critério claro.',
      'critical-identity': 'Tratar identidades críticas com mais controle e menos exceção.',
      'personal-data-governance': 'Dar dono claro ao uso e à proteção de dados sensíveis.',
      'monitoring-traceability': 'Criar visibilidade mínima para perceber desvios cedo.',
      'hardening-updates': 'Padronizar atualização e proteção básica dos ativos críticos.',
      'third-party-response': 'Organizar resposta, escalonamento e dependências com terceiros.',
      'external-exposure': 'Reduzir exposição externa com revisão contínua do que está aberto.',
      'application-security': 'Levar critérios de segurança para mudanças e aplicações.',
    };

    const categoryMap = {
      GV: 'Definir dono executivo, critério e rotina para este tema.',
      ID: 'Mapear o que é crítico e manter isso visível para decisão.',
      PR: 'Fortalecer os controles mínimos que reduzem risco todo dia.',
      DE: 'Ganhar visibilidade para detectar desvio antes do impacto.',
      RS: 'Dar forma a uma resposta organizada quando algo sair do normal.',
      RC: 'Preparar recuperação e continuidade com prioridade clara.',
    };

    return capabilityMap[capability] || categoryMap[category] || 'Dar dono e rotina a esta frente.';
  }

  function getRigorNarrative(results, lead) {
    const rigorLabel =
      results.rigorValue >= 8 ? 'elevado' : results.rigorValue >= 5 ? 'moderado' : 'essencial';
    return `O rigor do assessment foi ${rigorLabel}, considerando empresa do setor ${lead.segment || 'informado'} com ${lead.size || 'porte informado'}.`;
  }

  function getStrongestAndWeakestDomains(domainResults) {
    const sorted = [...domainResults].sort((a, b) => b.scorePercentual - a.scorePercentual);
    return {
      strongest: sorted.slice(0, 2),
      weakest: [...sorted].reverse().slice(0, 2),
    };
  }

  function getQuestionExpectedAnswer() {
    return 'Está bem resolvido';
  }

  function getQuestionAnswerLabel(answerKey) {
    if (!answerKey) return 'Não respondida';
    return getHumanOptionLabel(answerKey);
  }

  function getQuestionReasonText(question, answerKey) {
    const answerLabel = getQuestionAnswerLabel(answerKey).toLowerCase();
    const base = question.ajuda || 'Esse tema influencia diretamente a previsibilidade operacional.';
    return `${base} Hoje a resposta registrada foi "${answerLabel}", por isso vale observar se existe dono claro, rotina e evidência mínima.`;
  }

  function getQuestionReasonText(question, answerKey) {
    if (!answerKey) return '';
    const focus = getQuestionInterpretationFocus(question);
    const answerMap = {
      A: 'A resposta mostra ausencia pratica neste ponto, o que tende a empurrar a empresa para improviso quando houver pressao, auditoria ou incidente.',
      B: 'A resposta mostra intencao, mas ainda sem consistencia suficiente. O risco aqui e depender de pessoas-chave, esforco manual e excecoes frequentes.',
      C: 'A resposta mostra uma base funcional. O proximo ganho costuma vir de padronizar cadencia, dono e evidencia para que isso nao varie entre areas.',
      D: 'A resposta indica um ponto mais resolvido e integrado a rotina. O cuidado agora e sustentar essa disciplina com revisao periodica e menos excecoes.',
    };
    const answerNarrative = answerMap[answerKey];
    if (!focus || !answerNarrative) return '';
    return `Aqui o ponto central e ${focus}. ${answerNarrative}`;
  }

  function buildPlan306090(results) {
    const weakDomains = [...results.domainResults]
      .sort((a, b) => a.scorePercentual - b.scorePercentual)
      .slice(0, 3)
      .map((item) => item.domainKey);

    const dedupe = (items) => [...new Set(items)].slice(0, 4);
    return {
      30: dedupe(weakDomains.flatMap((domain) => PLAN_LIBRARY[domain]?.[30] || [])).slice(0, 4),
      60: dedupe(weakDomains.flatMap((domain) => PLAN_LIBRARY[domain]?.[60] || [])).slice(0, 4),
      90: dedupe(weakDomains.flatMap((domain) => PLAN_LIBRARY[domain]?.[90] || [])).slice(0, 4),
    };
  }

  function buildExecutiveReportModel() {
    const lead = state.leadContext || buildLeadContext(state.profile);
    const results = computeResults();
    const domainHighlights = getStrongestAndWeakestDomains(results.domainResults);
    const plan306090 = buildPlan306090(results);
    const generatedAt = new Date();
    const questionRows = content.questions.map((question) => ({
      question: question.pergunta,
      domain: getStageMeta(question.categoria).label,
      answer: getQuestionAnswerLabel(state.answers[question.id]),
      expected: getQuestionExpectedAnswer(question),
      reason: getQuestionReasonText(question, state.answers[question.id]),
    }));

    return {
      lead,
      results,
      generatedAt,
      domainHighlights,
      plan306090,
      questionRows,
      summaryText: `${getRigorNarrative(results, lead)} Os resultados indicam força em ${domainHighlights.strongest
        .map((item) => item.stage.label)
        .join(' e ')} e maior atenção em ${domainHighlights.weakest
        .map((item) => item.stage.label)
        .join(' e ')}.`,
    };
  }

  function buildTier3Plan(results) {
    const gapEntries = results.topGaps.slice(0, 3);
    const phases = [
      'Prioridade imediata (0–30 dias)',
      'Estabilização (30–90 dias)',
      'Estruturação (90+ dias)',
    ];

    return phases.map((phase, index) => {
      const gap = gapEntries[index] || gapEntries[0] || null;
      const service = results.recommendedServices[index] || results.recommendedServices[0] || null;
      const firstCapability = gap?.question?.capacidade?.[0];
      const title = gap
        ? getCapabilityAction(firstCapability, gap.question.categoria)
        : 'Consolidar dono, rotina e evidência mínima.';
      const body = gap
        ? `Baseado na lacuna "${gap.question.pergunta}". O objetivo aqui é sair do esforço manual e criar um padrão simples, visível e repetível.`
        : 'O objetivo é transformar intenção em prática estável, com dono claro e acompanhamento simples.';

      return {
        phase,
        title,
        body,
        serviceName: service?.name || 'Apoio consultivo Active Solutions',
      };
    });
  }

  function computeResults() {
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    const answeredQuestions = content.questions
      .map((question) => {
        const option = state.answers[question.id];
        if (!option) return null;
        const rawScore = OPTION_SCORES[option];
        const answerRatio = getAnswerRatio(option);
        return {
          question,
          option,
          rawScore,
          answerRatio,
          gapValue: (1 - answerRatio) * question.peso * (leadContext.rigorNorm || 0.5),
        };
      })
      .filter(Boolean);

    const domainResults = Object.keys(STAGE_META).map((domainKey) =>
      calculateDomainScore(
        domainKey,
        content.questions.filter((question) => question.categoria === domainKey),
        state.answers,
        leadContext.rigorNorm || 0.5
      )
    );

    const totalFinalWeight = domainResults.reduce((sum, item) => sum + item.scoreFinal, 0);
    const totalExpectedWeight = domainResults.reduce((sum, item) => sum + item.pesoEsperado, 0);
    const overallWeightedPercent = totalExpectedWeight ? (totalFinalWeight / totalExpectedWeight) * 100 : 0;
    const overallPercentRaw = overallWeightedPercent;

    const score = Math.max(0, Math.min(4, overallPercentRaw / 25));
    const percent = Math.round(overallPercentRaw);
    const observedTier = getObservedTier(score);
    const observedTierRank = Number(observedTier.rank ?? observedTier.level ?? 0);
    const expectedTier = leadContext.expectedTier;
    const gap = Math.max(expectedTier - observedTierRank, 0);
    const topGaps = answeredQuestions.sort((a, b) => b.gapValue - a.gapValue);
    const rankedServices = rankServices(domainResults, topGaps);
    const topServices = rankedServices.slice(0, 3);
    const recommendedServices = rankedServices.slice(0, 5);
    const classification =
      percent >= 80
        ? 'Maduro'
        : percent >= 60
          ? 'Estruturado'
          : percent >= 40
            ? 'Funcional'
            : percent >= 20
              ? 'Inicial'
              : 'Exposto';

    const summary =
      observedTierRank <= 1
        ? 'Você ainda depende de improviso em pontos que já deveriam ter dono e rotina.'
        : observedTierRank === 2
          ? 'Você já tem base, mas ainda depende de esforço manual em pontos críticos.'
          : observedTierRank === 3
            ? 'Você tem uma base mais consistente, mas ainda pode reduzir atrito e exceção em frentes importantes.'
            : 'Você já mostra uma operação mais estruturada, mas ainda vale consolidar o que sustenta crescimento com segurança.';
    const results = {
      score,
      percent,
      observedTier,
      expectedTier,
      gap,
      topGaps,
      topServices,
      recommendedServices,
      primaryService: topServices[0] || null,
      secondaryService: topServices[1] || topServices[0] || null,
      strategicService: topServices[2] || topServices[1] || topServices[0] || null,
      mainProblem: topGaps[0]?.question.pergunta || 'maturidade geral',
      mainRiskTheme: getGapTheme(topGaps[0]),
      domainResults,
      overallWeightedPercent: Math.round(overallWeightedPercent || 0),
      rigorValue: leadContext.rigorValue,
      rigorNorm: leadContext.rigorNorm,
      classification,
      summary,
    };
    results.pdsiPlan = buildTier3Plan(results);
    return results;
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

  function buildRdContactPayload(leadPayload) {
    return {
      email: leadPayload.email,
      name: leadPayload.nome,
      mobile_phone: leadPayload.telefone,
      company: leadPayload.empresa,
      job_title: leadPayload.cargo,
      cf_cep: leadPayload.cep,
      cf_cidade: leadPayload.cidade,
      cf_estado: leadPayload.estado,
      cf_setor: leadPayload.setor,
      cf_faixa_colaboradores: leadPayload.faixa_colaboradores,
      cf_lead_score: String(leadPayload.lead_score),
      tags: ['NAVE', 'Assessment', 'Lead Qualificado'],
      legal_bases: [
        {
          category: 'communications',
          type: 'consent',
          status: 'granted',
        },
      ],
    };
  }

  async function ensureRdCustomFields(headers) {
    if (!config.rdStationToken || config.rdEnsureCustomFields === false) return;

    const fieldsResponse = await fetch(config.rdFieldsEndpoint || RD_FIELDS_ENDPOINT, {
      method: 'GET',
      headers,
    });

    if (!fieldsResponse.ok) {
      throw new Error('Não foi possível consultar os campos customizados do RD Station.');
    }

    const fieldsData = await fieldsResponse.json();
    const existing = new Set((Array.isArray(fieldsData) ? fieldsData : fieldsData?.fields || []).map((field) => field.api_identifier));

    for (const field of RD_CUSTOM_FIELDS) {
      if (existing.has(field.api_identifier)) continue;
      const createResponse = await fetch(config.rdFieldsEndpoint || RD_FIELDS_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(field),
      });

      if (!createResponse.ok) {
        throw new Error(`Não foi possível criar o campo ${field.api_identifier} no RD Station.`);
      }
    }
  }

  async function sendLeadToRdStation(leadPayload) {
    const rdPayload = buildRdContactPayload(leadPayload);

    if (config.rdStationToken) {
      const headers = {
        Authorization: `Bearer ${config.rdStationToken}`,
        'Content-Type': 'application/json',
      };
      await ensureRdCustomFields(headers);
      const response = await fetch(config.rdStationEndpoint || RD_CONTACTS_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(rdPayload),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar o lead para o RD Station.');
      }

      return { mode: 'direct', rdPayload };
    }

    if (config.rdAdapterUrl) {
      const response = await fetch(config.rdAdapterUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: leadPayload,
          rd_payload: rdPayload,
          endpoint: config.rdStationEndpoint || RD_CONTACTS_ENDPOINT,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar o lead pelo adapter do RD Station.');
      }

      return { mode: 'adapter', rdPayload };
    }

    throw new Error('Integração RD Station ainda não configurada.');
  }

  function queueLeadForSync(leadPayload, source = 'lead_capture') {
    const queueItem = {
      id: `${slugify(leadPayload.email || leadPayload.nome || 'lead')}-${Date.now()}`,
      source,
      lead: leadPayload,
      attempts: 0,
      queuedAt: new Date().toISOString(),
      lastError: '',
    };

    state.rdQueue = [...(state.rdQueue || []), queueItem];
    saveState();
    emitEvent('lead_queue_saved', { source, email: leadPayload.email });
    if (config.rdStationToken || config.rdAdapterUrl) {
      processPendingRdQueue();
    }
  }

  function scheduleRdQueueRetry(delay = 15000) {
    clearTimeout(rdQueueRetryTimer);
    rdQueueRetryTimer = setTimeout(() => {
      processPendingRdQueue();
    }, delay);
  }

  async function processPendingRdQueue() {
    if (rdQueueProcessing || !state.rdQueue?.length) return;
    if (!config.rdStationToken && !config.rdAdapterUrl) return;

    rdQueueProcessing = true;
    const pending = [...state.rdQueue];
    const nextQueue = [];

    for (const item of pending) {
      try {
        await sendLeadToRdStation(item.lead);
        emitEvent('lead_rd_synced', { email: item.lead.email, source: item.source });
      } catch (error) {
        nextQueue.push({
          ...item,
          attempts: Number(item.attempts || 0) + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: error.message || 'Falha de integração',
        });
      }
    }

    state.rdQueue = nextQueue;
    saveState();
    rdQueueProcessing = false;

    if (nextQueue.length && (config.rdStationToken || config.rdAdapterUrl)) {
      scheduleRdQueueRetry();
    }
  }

  function buildWhatsAppMessage(service, extras = {}) {
    const lead = state.leadContext || buildLeadContext(state.profile);
    const results = getAnsweredCount() ? computeResults() : null;
    const intro = [];
    if (lead.name) intro.push(lead.name);
    if (lead.role) intro.push(lead.role);
    const firstLine = intro.length ? `Sou ${intro.join(', ')}.` : 'Quero orientação sobre o N.A.V.E.';
    const lines = [firstLine];

    if (lead.company) lines.push(`Empresa: ${lead.company}`);
    if (lead.size) lines.push(`Porte: ${lead.size}`);
    if (lead.segment) lines.push(`Segmento: ${lead.segment}`);
    if (results) {
      lines.push(`Meu principal ponto crítico apareceu em ${results.mainRiskTheme}.`);
      lines.push(`Nível atual: ${results.observedTier.level}.`);
      lines.push(`Nível esperado: ${results.expectedTier}.`);
    }
    if (service) lines.push(`Quero entender melhor o serviço ${service.name}.`);
    if (extras.slotLabel) lines.push(`Quero agendar para ${extras.slotLabel}.`);
    lines.push('Quero orientação.');

    return lines.join('\n');
  }

  function buildWhatsAppLink(service, extras = {}) {
    return `https://wa.me/${config.specialistWhatsApp}?text=${encodeURIComponent(
      buildWhatsAppMessage(service, extras)
    )}`;
  }

  function slugify(value) {
    return String(value || 'relatorio')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  function createReportPdfDocument() {
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      return null;
    }

    const model = buildExecutiveReportModel();
    const { lead, results, plan306090, questionRows, domainHighlights, generatedAt } = model;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 56;

    const addParagraph = (text, options = {}) => {
      const fontSize = options.fontSize || 11;
      const lineHeight = options.lineHeight || 17;
      const color = options.color || [71, 85, 105];
      const weight = options.weight || 'normal';
      const spacingAfter = options.spacingAfter ?? 12;
      const lines = doc.splitTextToSize(String(text || ''), contentWidth);

      if (y + lines.length * lineHeight > pageHeight - 56) {
        doc.addPage();
        y = 56;
      }

      doc.setFont('helvetica', weight);
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      doc.text(lines, margin, y);
      y += lines.length * lineHeight + spacingAfter;
    };

    const addRule = () => {
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, margin + contentWidth, y);
      y += 18;
    };

    doc.setFillColor(10, 26, 47);
    doc.roundedRect(margin, 32, contentWidth, 140, 22, 22, 'F');
    doc.setTextColor(248, 250, 252);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Active Solutions', margin + 20, 58);
    doc.setFontSize(24);
    doc.text('Relatório de Segurança da Informação', margin + 20, 92);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(ACTIVE_SOLUTIONS_DESCRIPTION, margin + 20, 118, { maxWidth: contentWidth - 40 });
    doc.text(
      `${lead.company || 'Empresa avaliada'} · ${lead.segment || 'Setor informado'} · ${lead.size || 'Porte informado'}`,
      margin + 20,
      152,
      { maxWidth: contentWidth - 40 }
    );
    y = 204;

    addParagraph('Sumário executivo', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    addParagraph(getRigorNarrative(results, lead), {
      fontSize: 11,
      lineHeight: 18,
      spacingAfter: 10,
    });
    addParagraph(model.summaryText, {
      fontSize: 11,
      lineHeight: 18,
      spacingAfter: 10,
    });
    addParagraph(`Score geral: ${results.percent}% · Score ajustado: ${results.overallWeightedPercent}% · Classificação: ${results.classification}`, {
      fontSize: 11,
      weight: 'bold',
      color: [0, 87, 231],
      spacingAfter: 8,
    });
    addParagraph(`Top 3 serviços recomendados agora: ${results.topServices.map((item) => item.name).join(', ')}.`, {
      fontSize: 11,
      lineHeight: 18,
      spacingAfter: 12,
    });

    addRule();

    addParagraph('Plano 30 / 60 / 90 dias', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    [['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias']].forEach(([key, label]) => {
      addParagraph(label, {
        fontSize: 12,
        weight: 'bold',
        color: [0, 87, 231],
        spacingAfter: 6,
      });
      addParagraph(plan306090[key].map((item) => `• ${item}`).join('\n'), {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 12,
      });
    });

    addRule();

    addParagraph('Recomendações prioritárias', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    results.topServices.forEach((service, index) => {
      addParagraph(`${index + 1}. ${service.name}`, {
        fontSize: 12,
        weight: 'bold',
        color: [10, 26, 47],
        spacingAfter: 4,
      });
      addParagraph(`${service.summary} ${service.whyAppeared}`, {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 10,
      });
    });

    addRule();

    addParagraph('Leitura por domínio', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    domainHighlights.strongest.forEach((item) => {
      addParagraph(`Melhor desempenho: ${item.stage.label} (${Math.round(item.scorePercentual)}%)`, {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 4,
        color: [89, 118, 108],
      });
    });
    domainHighlights.weakest.forEach((item) => {
      addParagraph(`Ponto fraco: ${item.stage.label} (${Math.round(item.scorePercentual)}%)`, {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 6,
        color: [173, 9, 43],
      });
    });
    addParagraph(`Hoje, seu maior risco está em: ${results.mainRiskTheme}.`, {
      fontSize: 11,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 12,
    });

    addRule();

    addParagraph('Perguntas e respostas', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    questionRows.forEach((row, index) => {
      addParagraph(`${index + 1}. ${row.question}`, {
        fontSize: 11,
        weight: 'bold',
        color: [10, 26, 47],
        spacingAfter: 4,
      });
      addParagraph(`Você: ${row.answer} · Esperado: ${row.expected} · Etapa: ${row.domain}`, {
        fontSize: 10,
        weight: 'bold',
        color: [0, 87, 231],
        spacingAfter: 4,
      });
      cursorY += 6;
    });

    addRule();

    addParagraph(
      'Este relatório foi gerado automaticamente e não substitui auditoria técnica. Os dados fornecidos podem ser usados pela Active Solutions para fins de comunicação e marketing, conforme a Política de Privacidade. O titular pode revogar o consentimento a qualquer momento.',
      {
        fontSize: 10,
        lineHeight: 16,
        spacingAfter: 8,
      }
    );
    addParagraph(
      `Data/Hora de geração: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(generatedAt)} · IP: ${state.clientIp || 'não disponível'}`,
      {
      fontSize: 10,
        lineHeight: 16,
        color: [71, 85, 105],
        spacingAfter: 0,
      }
    );

    return { doc, lead, results, model };
  }

  function downloadReportPdf() {
    const built = createReportPdfDocument();
    if (!built) {
      setNotice('O gerador de PDF ainda não carregou. Tente novamente em alguns segundos.');
      return;
    }

    const fileBase = built.lead.company || built.lead.name || 'relatorio-nave';
    built.doc.save(`nave-plano-tier-3-${slugify(fileBase)}.pdf`);
    emitEvent('pdf_download', { company: built.lead.company || '', score: built.results.percent });
  }

  function generateDefaultSchedulerSlots() {
    const slots = [];
    const cursor = new Date();

    while (slots.length < 5) {
      cursor.setDate(cursor.getDate() + 1);
      const weekday = cursor.getDay();
      if (weekday === 0 || weekday === 6) continue;

      const isoDate = cursor.toISOString().slice(0, 10);
      slots.push({
        date: isoDate,
        times: ['09:00', '11:00', '14:00', '16:00'],
      });
    }

    return slots;
  }

  function getSchedulerSlots() {
    const slots = Array.isArray(config.schedulerSlots) && config.schedulerSlots.length
      ? config.schedulerSlots
      : generateDefaultSchedulerSlots();

    return slots
      .filter((slot) => slot?.date && Array.isArray(slot.times) && slot.times.length)
      .map((slot) => ({
        date: slot.date,
        label: new Intl.DateTimeFormat('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        }).format(new Date(`${slot.date}T12:00:00`)),
        times: slot.times,
      }));
  }

  function openScheduler(serviceKey) {
    const slots = getSchedulerSlots();
    if (!slots.length) {
      setNotice('A agenda ainda não está configurada.');
      return;
    }

    state.modalServiceKey = '';
    state.schedulerServiceKey = serviceKey || computeResults().primaryService?.serviceKey || '';
    state.schedulerDay = slots[0].date;
    state.schedulerTime = slots[0].times[0];
    state.schedulerPending = false;
    saveState();
    render();
  }

  function closeScheduler() {
    state.schedulerServiceKey = '';
    state.schedulerDay = '';
    state.schedulerTime = '';
    state.schedulerPending = false;
    saveState();
    render();
  }

  function getSelectedScheduleLabel() {
    if (!state.schedulerDay || !state.schedulerTime) return '';
    const dateLabel = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date(`${state.schedulerDay}T12:00:00`));
    return `${dateLabel} às ${state.schedulerTime}`;
  }

  function getSelectedServiceForSchedule() {
    return services[state.schedulerServiceKey] || computeResults().primaryService || null;
  }

  function buildBookingDescription(service, results) {
    return [
      'Iniciado via N.A.V.E.',
      '',
      'Resumo:',
      `- Maturidade: ${results.observedTier.level}`,
      `- Gap principal: ${results.mainRiskTheme}`,
      `- Prioridade: ${results.primaryService?.name || 'Definir próximos passos'}`,
      '',
      'Objetivo:',
      'Ajudar a transformar diagnóstico em ação.',
      '',
      `Serviço em foco: ${service?.name || 'Apoio consultivo Active Solutions'}`,
    ].join('\n');
  }

  function buildBookingPayload(service) {
    const built = createReportPdfDocument();
    if (!built) return null;

    return {
      lead: built.lead,
      score: built.results.percent,
      levelCurrent: built.results.observedTier.level,
      levelExpected: built.results.expectedTier,
      mainGap: built.results.mainRiskTheme,
      recommendedServices: built.results.recommendedServices.map((item) => item.name),
      selectedService: service ? { key: service.serviceKey, name: service.name } : null,
      slot: {
        date: state.schedulerDay,
        time: state.schedulerTime,
        label: getSelectedScheduleLabel(),
      },
      reportPdfDataUri: built.doc.output('datauristring'),
      eventDescription: buildBookingDescription(service, built.results),
    };
  }

  function downloadTextFile(filename, contentText, type) {
    const blob = new Blob([contentText], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadBookingInvite(payload) {
    const start = `${payload.slot.date.replaceAll('-', '')}T${payload.slot.time.replace(':', '')}00`;
    const endTime = String(Number(payload.slot.time.slice(0, 2)) + 1).padStart(2, '0') + payload.slot.time.slice(2);
    const end = `${payload.slot.date.replaceAll('-', '')}T${endTime.replace(':', '')}00`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Active Solutions//NAVE//PT-BR',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@active-solutions`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:Conversa sobre ${payload.selectedService?.name || 'N.A.V.E.'}`,
      `DESCRIPTION:${payload.eventDescription.replace(/\n/g, '\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    downloadTextFile('nave-agendamento.ics', ics, 'text/calendar;charset=utf-8');
  }

  async function confirmSchedule() {
    if (!state.schedulerDay || !state.schedulerTime) {
      setNotice('Escolha um dia e um horário para continuar.');
      return;
    }

    const service = getSelectedServiceForSchedule();
    const payload = buildBookingPayload(service);
    if (!payload) {
      setNotice('Ainda não foi possível preparar o relatório deste agendamento.');
      return;
    }

    state.schedulerPending = true;
    saveState();
    render();

    try {
      if (config.schedulerAdapterUrl) {
        const response = await fetch(config.schedulerAdapterUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Falha ao enviar agendamento');
        }
      } else {
        downloadBookingInvite(payload);
        const built = createReportPdfDocument();
        if (built) {
          const fileBase = built.lead.company || built.lead.name || 'relatorio-nave';
          built.doc.save(`nave-plano-tier-3-${slugify(fileBase)}.pdf`);
        }
        window.open(buildWhatsAppLink(service, { slotLabel: payload.slot.label }), '_blank', 'noopener');
      }

      emitEvent('schedule_confirmed', payload);
      state.schedulerPending = false;
      closeScheduler();
      setNotice('Agendamento preparado com sucesso.');
    } catch (error) {
      state.schedulerPending = false;
      saveState();
      render();
      setNotice('Não foi possível concluir o agendamento agora. Você pode tentar novamente.');
    }
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

  async function lookupCep(rawCep) {
    const cep = normalizeCep(rawCep);
    if (cep.length !== 8) return;

    state.cepLookupPending = true;
    state.cepLookupFailed = false;
    saveState();
    render();

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha no CEP');
      const data = await response.json();
      if (data.erro) throw new Error('CEP inválido');

      state.profile = {
        ...state.profile,
        city: data.localidade || state.profile.city,
        state: data.uf || state.profile.state,
        cep: formatCep(cep),
      };
      state.cepLookupPending = false;
      state.cepLookupFailed = false;
      state.leadContext = buildLeadContext(state.profile);
      saveState();
      render();
    } catch (error) {
      state.cepLookupPending = false;
      state.cepLookupFailed = true;
      saveState();
      render();
    }
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
    state.tooltipOption = '';
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
    state.tooltipOption = '';
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
    state.tooltipOption = '';
    saveState();
    render();
  }

  function previousQuestion() {
    if (state.currentIndex === 0) return;
    state.currentIndex -= 1;
    state.tooltipOption = '';
    saveState();
    render();
  }

  function toggleTooltip(option) {
    state.tooltipOption = state.tooltipOption === option ? '' : option;
    saveState();
    render();
    if (state.tooltipOption) {
      emitEvent('help_open', { panel: 'option-tooltip', option, questionId: getCurrentQuestion().id });
    }
  }

  function renderHeader() {
    const totalQuestions = getAssessmentQuestionCount();
    const questionIndex = state.screen === 'questions' ? state.currentIndex + 1 : getAnsweredCount();
    const progressLabel =
      state.screen === 'questions'
        ? `Pergunta ${questionIndex} de ${totalQuestions}`
        : state.screen === 'results'
          ? 'Resultado'
          : 'Entrada';
    const showProgress = state.screen !== 'results';

    return `
      <header class="topbar">
        <div class="topbar__inner">
          <button class="brand" data-action="go-entry" aria-label="Voltar para a entrada">
            <span class="brand__name">${escapeHtml(content.meta.name)}</span>
          </button>
          ${showProgress ? `<span class="topbar__progress">${escapeHtml(progressLabel)}</span>` : ''}
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
        <div class="progress-card__notes">
          <p>As 48 perguntas existem para evitar um diagnóstico superficial.</p>
          <ul>
            <li>Cobrem estratégia, mapeamento, proteção, monitoramento, ação e recuperação.</li>
            <li>Usam o porte e o setor para ajustar o rigor da leitura.</li>
            <li>Entregam prioridades objetivas para avançar até o Tier 3.</li>
          </ul>
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

          <label class="field">
            <span>CEP</span>
            <input type="text" name="cep" data-field="cep" data-profile-input value="${escapeHtml(formatCep(state.profile.cep))}" aria-describedby="error-cep" aria-invalid="${errors.cep ? 'true' : 'false'}" />
            ${renderFieldError('cep', errors)}
          </label>

          <label class="field">
            <span>Cidade</span>
            <input type="text" name="city" data-field="city" data-profile-input value="${escapeHtml(state.profile.city)}" placeholder="${state.cepLookupPending ? 'Buscando...' : 'Preenchimento automático ou manual'}" />
          </label>

          <label class="field">
            <span>Estado</span>
            <input type="text" name="state" data-field="state" data-profile-input value="${escapeHtml(state.profile.state)}" placeholder="${state.cepLookupPending ? 'Buscando...' : 'UF'}" />
          </label>

          <label class="field">
            <span>Site <small>(opcional)</small></span>
            <input type="text" name="site" data-field="site" data-profile-input value="${escapeHtml(state.profile.site)}" />
          </label>

          <label class="field field--full">
            <span>Interesse principal <small>(opcional)</small></span>
            <input type="text" name="interest" data-field="interest" data-profile-input value="${escapeHtml(state.profile.interest)}" placeholder="Ex.: adequação, SOC, proteção, resposta a incidentes" />
          </label>

          <label class="field field--full">
            <span>Observações <small>(opcional)</small></span>
            <textarea name="observations" data-field="observations" data-profile-input rows="3" placeholder="Se quiser, descreva o contexto que mais preocupa hoje.">${escapeHtml(state.profile.observations)}</textarea>
          </label>

          <label class="checkbox-field field--full">
            <input type="checkbox" name="consentMarketing" data-field="consentMarketing" data-profile-input ${state.profile.consentMarketing ? 'checked' : ''} />
            <span>Autorizo o uso dos meus dados para contato e comunicação pela Active Solutions.</span>
          </label>
          ${renderFieldError('consentMarketing', errors)}

          ${state.cepLookupFailed ? `<p class="field__hint">Não foi possível localizar o CEP automaticamente. Você pode preencher cidade e estado manualmente.</p>` : ''}

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

  function renderFieldError(name, errors) {
    const shouldShow = state.leadAttemptedStep > 0 || state.touched[name];
    if (!shouldShow || !errors[name]) return '';
    return `<span class="field__error" id="error-${name}">${escapeHtml(errors[name])}</span>`;
  }

  function renderFieldWarning(name) {
    if (name !== 'email') return '';
    const email = sanitizeInlineText(state.profile.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isCorporateEmail(email)) return '';
    return `<span class="field__warning">Prefira seu e-mail corporativo para receber um diagnóstico mais preciso</span>`;
  }

  function renderLeadProgress() {
    const progress = state.leadStep === 1 ? 50 : 100;
    return `
      <div class="lead-progress">
        <div class="lead-progress__meta">
          <span>Etapa ${state.leadStep} de 2</span>
          <strong>${progress}%</strong>
        </div>
        <div class="progress-bar" aria-hidden="true">
          <span style="width:${progress}%"></span>
        </div>
      </div>
    `;
  }

  function renderLeadStepOne(errors) {
    return `
      <form class="lead-form lead-form--single" data-form="lead-step-one" novalidate>
        <div class="lead-step__copy">
          <span class="lead-step__eyebrow">Etapa rápida</span>
          <h2>Primeiro, só o essencial para começar</h2>
          <p>Leva menos de um minuto e já prepara a personalização do diagnóstico.</p>
        </div>

        <label class="field field--full">
          <span>Nome completo</span>
          <input
            type="text"
            name="name"
            data-field="name"
            data-profile-input
            autocomplete="name"
            value="${escapeHtml(state.profile.name)}"
            aria-describedby="error-name"
            aria-invalid="${errors.name ? 'true' : 'false'}"
          />
          ${renderFieldError('name', errors)}
        </label>

        <label class="field field--full">
          <span>E-mail</span>
          <input
            type="email"
            name="email"
            data-field="email"
            data-profile-input
            autocomplete="email"
            value="${escapeHtml(state.profile.email)}"
            aria-describedby="error-email"
            aria-invalid="${errors.email ? 'true' : 'false'}"
          />
          ${renderFieldError('email', errors)}
          ${renderFieldWarning('email')}
        </label>

        <label class="field field--full">
          <span>Telefone</span>
          <input
            type="tel"
            name="phone"
            data-field="phone"
            data-profile-input
            autocomplete="tel"
            value="${escapeHtml(formatPhoneDisplay(state.profile.phone))}"
            aria-describedby="error-phone"
            aria-invalid="${errors.phone ? 'true' : 'false'}"
          />
          ${renderFieldError('phone', errors)}
        </label>

        <button class="primary-button primary-button--full" type="submit">Continuar</button>
      </form>
    `;
  }

  function renderLeadStepTwo(errors) {
    return `
      <form class="lead-form" data-form="lead-step-two" novalidate>
        <div class="lead-step__copy field--full">
          <span class="lead-step__eyebrow">Qualificação</span>
          <h2>Agora vamos ajustar o diagnóstico ao contexto da sua empresa</h2>
          <p>Esses dados entram no rigor de leitura, no score e no relatório executivo.</p>
        </div>

        <label class="field field--full">
          <span>Empresa</span>
          <input type="text" name="company" data-field="company" data-profile-input autocomplete="organization" value="${escapeHtml(state.profile.company)}" aria-describedby="error-company" aria-invalid="${errors.company ? 'true' : 'false'}" />
          ${renderFieldError('company', errors)}
        </label>

        <label class="field field--full">
          <span>Cargo</span>
          <input type="text" name="role" data-field="role" data-profile-input autocomplete="organization-title" value="${escapeHtml(state.profile.role)}" aria-describedby="error-role" aria-invalid="${errors.role ? 'true' : 'false'}" />
          ${renderFieldError('role', errors)}
        </label>

        <label class="field">
          <span>CEP</span>
          <input type="text" name="cep" data-field="cep" data-profile-input inputmode="numeric" autocomplete="postal-code" value="${escapeHtml(formatCep(state.profile.cep))}" aria-describedby="error-cep" aria-invalid="${errors.cep ? 'true' : 'false'}" />
          ${renderFieldError('cep', errors)}
          ${state.cepLookupPending ? '<span class="field__hint">Buscando cidade e estado...</span>' : ''}
          ${state.cepLookupFailed ? '<span class="field__hint">CEP não encontrado. Preencha manualmente</span>' : ''}
        </label>

        <label class="field">
          <span>Cidade <small>(opcional)</small></span>
          <input type="text" name="city" data-field="city" data-profile-input autocomplete="address-level2" value="${escapeHtml(state.profile.city)}" />
        </label>

        <label class="field">
          <span>Estado <small>(opcional)</small></span>
          <input type="text" name="state" data-field="state" data-profile-input autocomplete="address-level1" value="${escapeHtml(state.profile.state)}" />
        </label>

        <label class="field">
          <span>Faixa de colaboradores</span>
          <select name="size" data-field="size" data-profile-input aria-describedby="error-size" aria-invalid="${errors.size ? 'true' : 'false'}">
            <option value="">Selecione</option>
            ${SIZE_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${state.profile.size === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
          </select>
          ${renderFieldError('size', errors)}
        </label>

        <label class="field">
          <span>Setor</span>
          <select name="segment" data-field="segment" data-profile-input aria-describedby="error-segment" aria-invalid="${errors.segment ? 'true' : 'false'}">
            <option value="">Selecione</option>
            ${SEGMENT_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${state.profile.segment === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
          </select>
          ${renderFieldError('segment', errors)}
        </label>

        <label class="field field--full">
          <span>Site <small>(opcional)</small></span>
          <input type="url" name="site" data-field="site" data-profile-input autocomplete="url" value="${escapeHtml(state.profile.site)}" />
        </label>

        <label class="field field--full">
          <span>Interesse <small>(opcional)</small></span>
          <input type="text" name="interest" data-field="interest" data-profile-input value="${escapeHtml(state.profile.interest)}" />
        </label>

        <label class="field field--full">
          <span>Observações <small>(opcional)</small></span>
          <textarea name="observations" data-field="observations" data-profile-input rows="4">${escapeHtml(state.profile.observations)}</textarea>
        </label>

        <label class="checkbox-field field--full">
          <input type="checkbox" name="consentMarketing" data-field="consentMarketing" data-profile-input ${state.profile.consentMarketing ? 'checked' : ''} />
          <span>Ao continuar, você concorda com o uso dos seus dados para contato e comunicações da Active Solutions.</span>
        </label>
        ${renderFieldError('consentMarketing', errors)}

        <div class="lead-actions field--full">
          <button class="secondary-button" type="button" data-action="lead-back-step">Voltar</button>
          <button class="primary-button" type="submit">Continuar para diagnóstico</button>
        </div>
      </form>
    `;
  }

  function renderLeadForm() {
    const errors = validateLeadStep(state.profile, 2);
    return `
      <section class="light-card lead-card">
        <div class="lead-card__head">
          <div>
            <span class="lead-step__eyebrow">Captura de lead</span>
            <h2>Comece seu diagnóstico executivo</h2>
          </div>
          <button class="link-button" data-action="back-to-hero">Voltar</button>
        </div>
        <p class="lead-card__text">Pedimos esses dados para calibrar o rigor do diagnóstico ao porte e ao setor da sua empresa e para entregar uma devolutiva útil no final.</p>
        <div class="lead-card__context">
          <strong>Por que são 48 perguntas?</strong>
          <p>Porque um diagnóstico confiável precisa olhar a operação por inteiro, e não só um recorte técnico. Responda com base no que acontece hoje, com honestidade.</p>
        </div>
        <form class="lead-form" data-form="lead" novalidate>
          <label class="field field--full">
            <span>Nome completo</span>
            <input
              type="text"
              name="name"
              data-field="name"
              data-profile-input
              autocomplete="name"
              value="${escapeHtml(state.profile.name)}"
              aria-describedby="error-name"
              aria-invalid="${errors.name ? 'true' : 'false'}"
            />
            ${renderFieldError('name', errors)}
          </label>

          <label class="field field--full">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              data-field="email"
              data-profile-input
              autocomplete="email"
              value="${escapeHtml(state.profile.email)}"
              aria-describedby="error-email"
              aria-invalid="${errors.email ? 'true' : 'false'}"
            />
            ${renderFieldError('email', errors)}
            ${renderFieldWarning('email')}
          </label>

          <label class="field field--full">
            <span>Telefone</span>
            <input
              type="tel"
              name="phone"
              data-field="phone"
              data-profile-input
              autocomplete="tel"
              inputmode="tel"
              value="${escapeHtml(formatPhoneDisplay(state.profile.phone))}"
              aria-describedby="error-phone"
              aria-invalid="${errors.phone ? 'true' : 'false'}"
            />
            ${renderFieldError('phone', errors)}
          </label>

          <label class="field field--full">
            <span>Empresa</span>
            <input
              type="text"
              name="company"
              data-field="company"
              data-profile-input
              autocomplete="organization"
              value="${escapeHtml(state.profile.company)}"
              aria-describedby="error-company"
              aria-invalid="${errors.company ? 'true' : 'false'}"
            />
            ${renderFieldError('company', errors)}
          </label>

          <label class="field field--full">
            <span>Cargo</span>
            <input
              type="text"
              name="role"
              data-field="role"
              data-profile-input
              autocomplete="organization-title"
              value="${escapeHtml(state.profile.role)}"
              aria-describedby="error-role"
              aria-invalid="${errors.role ? 'true' : 'false'}"
            />
            ${renderFieldError('role', errors)}
          </label>

          <label class="field">
            <span>CEP</span>
            <input
              type="text"
              name="cep"
              data-field="cep"
              data-profile-input
              inputmode="numeric"
              autocomplete="postal-code"
              value="${escapeHtml(formatCep(state.profile.cep))}"
              aria-describedby="error-cep"
              aria-invalid="${errors.cep ? 'true' : 'false'}"
            />
            ${renderFieldError('cep', errors)}
            ${state.cepLookupPending ? '<span class="field__hint">Buscando cidade e estado...</span>' : ''}
            ${state.cepLookupFailed ? '<span class="field__hint">CEP não encontrado. Preencha manualmente</span>' : ''}
          </label>

          <label class="field">
            <span>Cidade <small>(opcional)</small></span>
            <input type="text" name="city" data-field="city" data-profile-input autocomplete="address-level2" value="${escapeHtml(state.profile.city)}" />
          </label>

          <label class="field">
            <span>Estado <small>(opcional)</small></span>
            <input type="text" name="state" data-field="state" data-profile-input autocomplete="address-level1" value="${escapeHtml(state.profile.state)}" />
          </label>

          <label class="field">
            <span>Faixa de colaboradores</span>
            <select
              name="size"
              data-field="size"
              data-profile-input
              aria-describedby="error-size"
              aria-invalid="${errors.size ? 'true' : 'false'}"
            >
              <option value="">Selecione</option>
              ${SIZE_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${state.profile.size === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
            </select>
            ${renderFieldError('size', errors)}
          </label>

          <label class="field">
            <span>Setor</span>
            <select
              name="segment"
              data-field="segment"
              data-profile-input
              aria-describedby="error-segment"
              aria-invalid="${errors.segment ? 'true' : 'false'}"
            >
              <option value="">Selecione</option>
              ${SEGMENT_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${state.profile.segment === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
            </select>
            ${renderFieldError('segment', errors)}
          </label>

          <label class="field field--full">
            <span>Site <small>(opcional)</small></span>
            <input type="url" name="site" data-field="site" data-profile-input autocomplete="url" value="${escapeHtml(state.profile.site)}" />
          </label>

          <label class="checkbox-field field--full">
            <input type="checkbox" name="consentMarketing" data-field="consentMarketing" data-profile-input ${state.profile.consentMarketing ? 'checked' : ''} />
            <span>Ao continuar, você concorda com o uso dos seus dados para contato e comunicações da Active Solutions.</span>
          </label>
          ${renderFieldError('consentMarketing', errors)}

          <button class="primary-button primary-button--full field--full" type="submit">Continuar para diagnóstico</button>
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
            <h1>Avaliação de Maturidade de Segurança da Informação segundo NIST CSF 2.0</h1>
            <p>São 48 perguntas para produzir uma leitura confiável, sem superficialidade, sobre como sua empresa decide, protege, monitora, reage e se recupera.</p>
            <ul class="entry__list">
              <li>Você não precisa ser técnico para responder bem.</li>
              <li>O que importa é descrever o que acontece na prática hoje.</li>
              <li>No final, você recebe prioridades objetivas para evoluir até o Tier 3.</li>
            </ul>
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
    const tooltip = getOptionTooltip(question, key);
    return `
      <article class="option-card ${selected === key ? 'is-selected' : ''}">
        <button
          class="option-card__select"
          data-action="select-answer"
          data-option="${key}"
          aria-pressed="${selected === key ? 'true' : 'false'}"
        >
          <span class="option-card__label">${key}</span>
          <strong class="option-card__title">${escapeHtml(getHumanOptionLabel(key))}</strong>
        </button>
        <button
          class="option-card__info"
          type="button"
          data-action="toggle-tooltip"
          data-option="${key}"
          aria-label="Ver exemplo prático da opção ${escapeHtml(getHumanOptionLabel(key))}"
          aria-expanded="${state.tooltipOption === key ? 'true' : 'false'}"
        >
          i
        </button>
        <div class="option-tooltip ${state.tooltipOption === key ? 'is-open' : ''}">
          ${escapeHtml(tooltip)}
        </div>
      </article>
    `;
  }

  function renderQuestionScreen() {
    const question = getCurrentQuestion();
    const answer = getCurrentAnswer();
    const stage = getStageMeta(question.categoria);

    return `
      <main class="app-shell app-shell--question">
        <section class="question-screen">
          <article class="question-card">
            <div class="question-card__header">
              <span class="question-card__step">Etapa ${stage.order} — ${escapeHtml(stage.label)}</span>
            </div>

            <div class="question-card__body">
              <p class="question-card__stage-subtext">${escapeHtml(stage.subtext)}</p>
              <h1>${escapeHtml(question.pergunta)}</h1>
              <p class="question-card__guide">${escapeHtml(getRoleAwareHint())}</p>
            </div>

            <div class="question-card__choices">
              ${OPTION_ORDER.map((key) => renderOptionCard(question, key, answer)).join('')}
            </div>

            <div class="question-card__actions">
              <button class="primary-button primary-button--full-mobile" data-action="next-question" ${answer ? '' : 'disabled'}>
                ${state.currentIndex === content.questions.length - 1 ? 'Ver resultado' : 'Próxima pergunta'}
              </button>
            </div>
          </article>
        </section>
      </main>
    `;
  }

  function renderPdsiCard(item, tone) {
    return `
      <article class="pdsi-card pdsi-card--${tone}">
        <span class="pdsi-card__label">${escapeHtml(item.phase)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.body)}</p>
        <strong>${escapeHtml(item.serviceName)}</strong>
      </article>
    `;
  }

  function renderServiceRecommendation(service, index) {
    return `
      <article class="service-card">
        <span class="service-card__rank">Serviço ${index + 1}</span>
        <h3>${escapeHtml(service.name)}</h3>
        <p>${escapeHtml(service.summary)}</p>
        <div class="service-card__why">
          <strong>Por que foi recomendado</strong>
          <p>${escapeHtml(service.whyAppeared)}</p>
        </div>
        <button class="link-button link-button--strong" data-action="open-service" data-service-key="${service.serviceKey}">
          Saiba mais
        </button>
      </article>
    `;
  }

  function renderExecutiveReportPreview() {
    if (!state.reportPreviewOpen) return '';
    const model = buildExecutiveReportModel();
    const { lead, results, plan306090, questionRows, generatedAt } = model;

    return `
      <div class="modal-backdrop" data-action="close-report-preview">
        <section class="modal-card modal-card--report" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
          <div class="modal-card__header">
            <div>
              <span class="modal-card__eyebrow">Relatório executivo</span>
              <h2 id="report-preview-title">Relatório de Segurança da Informação</h2>
            </div>
            <button class="link-button" data-action="close-report-preview">Fechar</button>
          </div>

          <article class="report-preview">
            <section class="report-preview__cover">
              <span class="report-preview__brand">Active Solutions</span>
              <h3>Relatório de Segurança da Informação</h3>
              <p>${escapeHtml(ACTIVE_SOLUTIONS_DESCRIPTION)}</p>
              <div class="report-preview__meta">
                <span>${escapeHtml(lead.company || 'Empresa avaliada')}</span>
                <span>${escapeHtml(lead.segment || 'Setor informado')}</span>
                <span>${escapeHtml(lead.size || 'Porte informado')}</span>
                <span>${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(generatedAt))}</span>
              </div>
            </section>

            <section class="report-preview__section">
              <h3>Sumário executivo</h3>
              <p>${escapeHtml(model.summaryText)}</p>
              <ul>
                <li>${escapeHtml(getRigorNarrative(results, lead))}</li>
                <li>${escapeHtml(`Top 3 serviços recomendados: ${results.topServices.map((item) => item.name).join(', ')}.`)}</li>
                <li>${escapeHtml('30 dias: eliminar riscos óbvios. 60 dias: estabelecer monitoramento e resposta. 90 dias: consolidar controles para auditoria.')}</li>
                <li>Este relatório é gerado automaticamente com base em autodeclarações e não substitui auditoria técnica.</li>
              </ul>
            </section>

            <section class="report-preview__section">
              <h3>Leitura de maturidade</h3>
              <div class="report-preview__grid">
                <article class="metric-card">
                  <span>Score geral</span>
                  <strong>${results.percent}%</strong>
                </article>
                <article class="metric-card">
                  <span>Nível atual</span>
                  <strong>${results.observedTier.level}</strong>
                </article>
                <article class="metric-card">
                  <span>Nível esperado</span>
                  <strong>${results.expectedTier}</strong>
                </article>
              </div>
              <p><strong>Hoje, seu maior risco está em:</strong> ${escapeHtml(results.mainRiskTheme)}</p>
            </section>

            <section class="report-preview__section">
              <h3>Plano 30 / 60 / 90 dias</h3>
              <div class="report-preview__grid report-preview__grid--three">
                <article class="pdsi-card pdsi-card--now"><span class="pdsi-card__label">30 dias</span><p>${plan306090[30].map((item) => `- ${escapeHtml(item)}`).join('<br/>')}</p></article>
                <article class="pdsi-card pdsi-card--soon"><span class="pdsi-card__label">60 dias</span><p>${plan306090[60].map((item) => `- ${escapeHtml(item)}`).join('<br/>')}</p></article>
                <article class="pdsi-card pdsi-card--later"><span class="pdsi-card__label">90 dias</span><p>${plan306090[90].map((item) => `- ${escapeHtml(item)}`).join('<br/>')}</p></article>
              </div>
            </section>

            <section class="report-preview__section">
              <h3>Perguntas e respostas</h3>
              <div class="report-table">
                <div class="report-table__head">
                  <span>Pergunta</span>
                  <span>Você</span>
                  <span>Esperado</span>
                </div>
                ${questionRows
                  .map(
                    (row) => `
                      <div class="report-table__row">
                        <span>${escapeHtml(row.question)}</span>
                        <span>${escapeHtml(row.answer)}</span>
                        <span>${escapeHtml(row.expected)}</span>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </section>

            <section class="report-preview__footer">
              <p>Este relatório foi gerado automaticamente e não substitui auditoria técnica. Os dados fornecidos podem ser usados pela Active Solutions para comunicação e marketing, com possibilidade de revogação do consentimento a qualquer momento.</p>
              <p>Data/Hora: ${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(generatedAt))} · IP: ${escapeHtml(state.clientIp || 'não disponível')}</p>
            </section>
          </article>

          <div class="results-actions">
            <button class="secondary-button" data-action="print-report-preview">Imprimir / salvar em PDF</button>
            <button class="primary-button" data-action="download-pdf">Baixar PDF</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderResultsScreen() {
    const results = computeResults();
    const lead = state.leadContext || buildLeadContext(state.profile);
    const maturityTitle = `Nível ${results.observedTier.level}`;
    const intro = lead.firstName ? `${lead.firstName}, ` : '';

    return `
      <main class="app-shell app-shell--results">
        <section class="results-screen">
          <article class="results-hero">
            <span class="results-hero__eyebrow">Resumo executivo</span>
            <h1>${escapeHtml(maturityTitle)}</h1>
            <p>${escapeHtml(results.summary)}</p>
            <div class="results-hero__meta">
              <span>Score geral: ${results.percent}%</span>
              <span>Classificação: ${escapeHtml(results.classification)}</span>
              <span>Nível esperado: ${results.expectedTier}</span>
            </div>
          </article>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Resumo interativo</span>
              <h2>Visão geral dos domínios</h2>
            </div>
            <div class="results-radar">
              <canvas id="results-radar-chart" aria-label="Gráfico radar de maturidade" role="img"></canvas>
            </div>
          </section>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Relatório de maturidade</span>
              <h2>O que esse diagnóstico mostra agora</h2>
            </div>
            <div class="maturity-grid">
              <article class="metric-card">
                <span>Nível atual</span>
                <strong>${results.observedTier.level}</strong>
              </article>
              <article class="metric-card">
                <span>Nível esperado</span>
                <strong>${results.expectedTier}</strong>
              </article>
              <article class="metric-card">
                <span>Gap principal</span>
                <strong>${results.gap > 0 ? `${results.gap} nível${results.gap > 1 ? 's' : ''}` : 'Sem defasagem relevante'}</strong>
              </article>
            </div>
            <article class="risk-highlight">
              <strong>Hoje, seu maior risco está em: ${escapeHtml(results.mainRiskTheme)}</strong>
              <p>${escapeHtml(`${intro}o ponto que mais pede atenção agora aparece em "${results.mainProblem}".`)}</p>
            </article>
          </section>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Plano Diretor de Segurança da Informação</span>
              <h2>O que fazer agora, depois e em seguida</h2>
            </div>
            <div class="pdsi-grid">
              ${renderPdsiCard(results.pdsiPlan[0], 'now')}
              ${renderPdsiCard(results.pdsiPlan[1], 'soon')}
              ${renderPdsiCard(results.pdsiPlan[2], 'later')}
            </div>
          </section>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Serviços recomendados</span>
              <h2>O que faz mais sentido contratar primeiro</h2>
            </div>
            <div class="services-grid">
              ${results.recommendedServices.map((service, index) => renderServiceRecommendation(service, index)).join('')}
            </div>
          </section>

          <div class="results-actions">
            <button class="secondary-button" data-action="back-to-questions">Voltar às perguntas</button>
            <button class="secondary-button" data-action="open-report-preview">Visualizar relatório executivo</button>
            <button class="primary-button" data-action="download-pdf">Baixar PDF do relatório</button>
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
              <strong>Explicação clara</strong>
              <p>${escapeHtml(service.summary || service.description)}</p>
            </section>
            <section>
              <strong>Quando faz sentido</strong>
              <p>${escapeHtml(service.whenItMakesSense || service.description)}</p>
            </section>
            <section>
              <strong>Impacto no negócio</strong>
              <p>${escapeHtml(service.pain || service.description)}</p>
            </section>
          </div>

          <button class="primary-button primary-button--full" data-action="open-scheduler" data-service-key="${service.serviceKey}">
            Agendar conversa sobre isso
          </button>
        </section>
      </div>
    `;
  }

  function renderSchedulerModal() {
    if (!state.schedulerServiceKey) return '';
    const slots = getSchedulerSlots();
    const service = getSelectedServiceForSchedule();
    const selectedDay = slots.find((item) => item.date === state.schedulerDay) || slots[0];
    const times = selectedDay?.times || [];

    return `
      <div class="modal-backdrop" data-action="close-scheduler">
        <section class="modal-card modal-card--scheduler" role="dialog" aria-modal="true" aria-labelledby="scheduler-title">
          <div class="modal-card__header">
            <div>
              <span class="modal-card__eyebrow">Agendar conversa</span>
              <h2 id="scheduler-title">${escapeHtml(service?.name || 'Especialista Active Solutions')}</h2>
            </div>
            <button class="link-button" data-action="close-scheduler">Fechar</button>
          </div>

          <div class="scheduler-copy">
            <p>Escolha um dia e um horário. O contexto do diagnóstico segue junto automaticamente.</p>
          </div>

          <section class="scheduler-group">
            <strong>Dias disponíveis</strong>
            <div class="scheduler-slots">
              ${slots
                .map(
                  (slot) => `
                    <button
                      class="slot-chip ${state.schedulerDay === slot.date ? 'is-selected' : ''}"
                      data-action="select-scheduler-day"
                      data-date="${slot.date}"
                    >
                      ${escapeHtml(slot.label)}
                    </button>
                  `
                )
                .join('')}
            </div>
          </section>

          <section class="scheduler-group">
            <strong>Horários disponíveis</strong>
            <div class="scheduler-slots">
              ${times
                .map(
                  (time) => `
                    <button
                      class="slot-chip ${state.schedulerTime === time ? 'is-selected' : ''}"
                      data-action="select-scheduler-time"
                      data-time="${time}"
                    >
                      ${escapeHtml(time)}
                    </button>
                  `
                )
                .join('')}
            </div>
          </section>

          <div class="scheduler-summary">
            <strong>${escapeHtml(getSelectedScheduleLabel())}</strong>
            <p>Nome, empresa, nível atual, nível esperado, principal gap, serviços recomendados e PDF seguem juntos neste agendamento.</p>
          </div>

          <button class="primary-button primary-button--full" data-action="confirm-scheduler" ${state.schedulerPending ? 'disabled' : ''}>
            ${state.schedulerPending ? 'Confirmando...' : 'Confirmar horário'}
          </button>
        </section>
      </div>
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
              <strong>Explicação clara</strong>
              <p>${escapeHtml(service.summary || service.description)}</p>
            </section>
            <section>
              <strong>Quando faz sentido</strong>
              <p>${escapeHtml(service.whenItMakesSense || service.description)}</p>
            </section>
            <section>
              <strong>Impacto no negócio</strong>
              <p>${escapeHtml(service.pain || service.description)}</p>
            </section>
          </div>

          <button class="primary-button primary-button--full" data-action="open-scheduler" data-service-key="${service.serviceKey}">
            Agendar conversa sobre isso
          </button>
        </section>
      </div>
    `;
  }

  function renderSchedulerModal() {
    if (!state.schedulerServiceKey) return '';
    const slots = getSchedulerSlots();
    const service = getSelectedServiceForSchedule();
    const selectedDay = slots.find((item) => item.date === state.schedulerDay) || slots[0];
    const times = selectedDay?.times || [];

    return `
      <div class="modal-backdrop" data-action="close-scheduler">
        <section class="modal-card modal-card--scheduler" role="dialog" aria-modal="true" aria-labelledby="scheduler-title">
          <div class="modal-card__header">
            <div>
              <span class="modal-card__eyebrow">Agendar conversa</span>
              <h2 id="scheduler-title">${escapeHtml(service?.name || 'Especialista Active Solutions')}</h2>
            </div>
            <button class="link-button" data-action="close-scheduler">Fechar</button>
          </div>

          <div class="scheduler-copy">
            <p>Escolha um dia e um horário. O contexto do diagnóstico segue junto automaticamente.</p>
          </div>

          <section class="scheduler-group">
            <strong>Dias disponíveis</strong>
            <div class="scheduler-slots">
              ${slots
                .map(
                  (slot) => `
                    <button
                      class="slot-chip ${state.schedulerDay === slot.date ? 'is-selected' : ''}"
                      data-action="select-scheduler-day"
                      data-date="${slot.date}"
                    >
                      ${escapeHtml(slot.label)}
                    </button>
                  `
                )
                .join('')}
            </div>
          </section>

          <section class="scheduler-group">
            <strong>Horários disponíveis</strong>
            <div class="scheduler-slots">
              ${times
                .map(
                  (time) => `
                    <button
                      class="slot-chip ${state.schedulerTime === time ? 'is-selected' : ''}"
                      data-action="select-scheduler-time"
                      data-time="${time}"
                    >
                      ${escapeHtml(time)}
                    </button>
                  `
                )
                .join('')}
            </div>
          </section>

          <div class="scheduler-summary">
            <strong>${escapeHtml(getSelectedScheduleLabel())}</strong>
            <p>Nome, empresa, nível atual, nível esperado, principal gap, serviços recomendados e PDF seguem juntos neste agendamento.</p>
          </div>

          <button class="primary-button primary-button--full" data-action="confirm-scheduler" ${state.schedulerPending ? 'disabled' : ''}>
            ${state.schedulerPending ? 'Confirmando...' : 'Confirmar horário'}
          </button>
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
      ${renderSchedulerModal()}
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

    const panelOpen = state.tooltipOption;
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
    window.addEventListener('online', () => processPendingRdQueue());

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && (state.modalServiceKey || state.schedulerServiceKey || state.reportPreviewOpen)) {
        state.modalServiceKey = '';
        state.schedulerServiceKey = '';
        state.schedulerDay = '';
        state.schedulerTime = '';
        state.reportPreviewOpen = false;
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
    if (!actionTarget) {
      if (state.tooltipOption) {
        state.tooltipOption = '';
        saveState();
        render();
      }
      return;
    }
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
      case 'toggle-tooltip':
        toggleTooltip(actionTarget.dataset.option);
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
      case 'open-scheduler':
        openScheduler(actionTarget.dataset.serviceKey);
        break;
      case 'close-scheduler':
        closeScheduler();
        break;
      case 'select-scheduler-day':
        state.schedulerDay = actionTarget.dataset.date;
        state.schedulerTime = getSchedulerSlots().find((item) => item.date === state.schedulerDay)?.times?.[0] || '';
        saveState();
        render();
        break;
      case 'select-scheduler-time':
        state.schedulerTime = actionTarget.dataset.time;
        saveState();
        render();
        break;
      case 'confirm-scheduler':
        confirmSchedule();
        break;
      case 'back-to-questions':
        state.screen = 'questions';
        saveState();
        render();
        break;
      case 'download-pdf':
        downloadReportPdf();
        break;
      case 'close-notice':
        clearNotice();
        break;
      default:
        break;
    }
  }

  function getRoleAwareHint() {
    return 'Considere o que acontece na prática, não no ideal.';
  }

  function renderQuestionScreen() {
    const question = getCurrentQuestion();
    const answer = getCurrentAnswer();
    const stage = getStageMeta(question.categoria);

    return `
      <main class="app-shell app-shell--question">
        <section class="question-screen">
          <article class="question-card">
            <div class="question-card__header">
              <span class="question-card__step">Etapa ${stage.order} — ${escapeHtml(stage.label)}</span>
            </div>

            <div class="question-card__body">
              <p class="question-card__stage-subtext">${escapeHtml(stage.subtext)}</p>
              <h1>${escapeHtml(question.pergunta)}</h1>
              <p class="question-card__guide">${escapeHtml(getRoleAwareHint())}</p>
            </div>

            <div class="question-card__choices">
              ${OPTION_ORDER.map((key) => renderOptionCard(question, key, answer)).join('')}
            </div>

            <div class="question-card__actions">
              <button class="primary-button primary-button--full-mobile" data-action="next-question" ${answer ? '' : 'disabled'}>
                ${state.currentIndex === content.questions.length - 1 ? 'Ver resultado' : 'Próxima pergunta'}
              </button>
            </div>
          </article>
        </section>
      </main>
    `;
  }

  function renderExecutiveReportPreview() {
    if (!state.reportPreviewOpen) return '';
    const model = buildExecutiveReportModel();
    const { lead, results, plan306090, questionRows, generatedAt } = model;

    return `
      <div class="modal-backdrop" data-action="close-report-preview">
        <section class="modal-card modal-card--report" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
          <div class="modal-card__header">
            <div>
              <span class="modal-card__eyebrow">Relatório executivo</span>
              <h2 id="report-preview-title">Relatório de Segurança da Informação</h2>
            </div>
            <button class="link-button" data-action="close-report-preview">Fechar</button>
          </div>

          <article class="report-preview">
            <section class="report-preview__cover">
              <div class="report-preview__brandline">
                <img src="${escapeHtml(content.meta.brandAssets.logoColor)}" alt="Active Solutions" class="report-preview__logo" />
                <div>
                  <span class="report-preview__brand">Active Solutions</span>
                  <p>Relatório executivo gerado pelo N.A.V.E.</p>
                </div>
              </div>
              <h3>Relatório de Segurança da Informação</h3>
              <p>Há 25 anos especializada em soluções de segurança cibernética, privacidade e continuidade para organizações que precisam transformar risco em decisão.</p>
              <div class="report-preview__meta">
                <span>${escapeHtml(lead.company || 'Empresa avaliada')}</span>
                <span>${escapeHtml(lead.segment || 'Setor informado')}</span>
                <span>${escapeHtml(lead.size || 'Porte informado')}</span>
                <span>${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(generatedAt))}</span>
              </div>
            </section>

            <section class="report-preview__section">
              <h3>Sumário executivo</h3>
              <p>${escapeHtml(model.summaryText)}</p>
              <ul>
                <li>${escapeHtml(getRigorNarrative(results, lead))}</li>
                <li>${escapeHtml(`Top 3 serviços recomendados: ${results.topServices.map((item) => item.name).join(', ')}.`)}</li>
                <li>${escapeHtml('30 dias: eliminar riscos óbvios. 60 dias: estabelecer monitoramento e resposta. 90 dias: consolidar controles para auditoria.')}</li>
                <li>Este relatório é gerado automaticamente com base em autodeclarações e não substitui auditoria técnica.</li>
              </ul>
            </section>

            <section class="report-preview__section">
              <h3>Leitura de maturidade</h3>
              <div class="report-preview__grid">
                <article class="metric-card">
                  <span>Score geral</span>
                  <strong>${results.percent}%</strong>
                </article>
                <article class="metric-card">
                  <span>Nível atual</span>
                  <strong>${results.observedTier.level}</strong>
                </article>
                <article class="metric-card">
                  <span>Nível esperado</span>
                  <strong>${results.expectedTier}</strong>
                </article>
              </div>
              <p><strong>Hoje, seu maior risco está em:</strong> ${escapeHtml(results.mainRiskTheme)}</p>
            </section>

            <section class="report-preview__section">
              <h3>Plano 30 / 60 / 90 dias</h3>
              <div class="report-preview__grid report-preview__grid--three">
                <article class="pdsi-card pdsi-card--now"><span class="pdsi-card__label">30 dias</span><p>${plan306090[30].map((item) => `• ${escapeHtml(item)}`).join('<br/>')}</p></article>
                <article class="pdsi-card pdsi-card--soon"><span class="pdsi-card__label">60 dias</span><p>${plan306090[60].map((item) => `• ${escapeHtml(item)}`).join('<br/>')}</p></article>
                <article class="pdsi-card pdsi-card--later"><span class="pdsi-card__label">90 dias</span><p>${plan306090[90].map((item) => `• ${escapeHtml(item)}`).join('<br/>')}</p></article>
              </div>
            </section>

            <section class="report-preview__section">
              <h3>Perguntas e respostas</h3>
              <div class="report-table">
                <div class="report-table__head">
                  <span>Pergunta</span>
                  <span>Você</span>
                  <span>Esperado</span>
                </div>
                ${questionRows
                  .map(
                    (row) => `
                      <div class="report-table__row">
                        <span>${escapeHtml(row.question)}</span>
                        <span>${escapeHtml(row.answer)}</span>
                        <span>${escapeHtml(row.expected)}</span>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </section>

            <section class="report-preview__footer">
              <p>Este relatório foi gerado automaticamente e não substitui auditoria técnica. Os dados fornecidos podem ser usados pela Active Solutions para comunicação e marketing, com possibilidade de revogação do consentimento a qualquer momento.</p>
              <p>Data/Hora: ${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(generatedAt))} · IP: ${escapeHtml(state.clientIp || 'não disponível')}</p>
            </section>
          </article>

          <div class="results-actions">
            <button class="secondary-button" data-action="print-report-preview">Imprimir / salvar em PDF</button>
            <button class="primary-button" data-action="download-pdf">Baixar PDF</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderResultsScreen() {
    const results = computeResults();
    const lead = state.leadContext || buildLeadContext(state.profile);
    const maturityTitle = `Nível ${results.observedTier.level}`;
    const intro = lead.firstName ? `${lead.firstName}, ` : '';

    return `
      <main class="app-shell app-shell--results">
        <section class="results-screen">
          <article class="results-hero">
            <span class="results-hero__eyebrow">Resumo executivo</span>
            <h1>${escapeHtml(maturityTitle)}</h1>
            <p>${escapeHtml(results.summary)}</p>
            <div class="results-hero__meta">
              <span>Score geral: ${results.percent}%</span>
              <span>Classificação: ${escapeHtml(results.classification)}</span>
              <span>Nível esperado: ${results.expectedTier}</span>
              ${state.rdQueue.length ? `<span>Envio pendente: ${state.rdQueue.length}</span>` : ''}
            </div>
          </article>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Relatório de maturidade</span>
              <h2>O que esse diagnóstico mostra agora</h2>
            </div>
            <div class="maturity-grid">
              <article class="metric-card">
                <span>Nível atual</span>
                <strong>${results.observedTier.level}</strong>
              </article>
              <article class="metric-card">
                <span>Nível esperado</span>
                <strong>${results.expectedTier}</strong>
              </article>
              <article class="metric-card">
                <span>Gap principal</span>
                <strong>${results.gap > 0 ? `${results.gap} nível${results.gap > 1 ? 's' : ''}` : 'Sem defasagem relevante'}</strong>
              </article>
            </div>
            <article class="risk-highlight">
              <strong>Hoje, seu maior risco está em: ${escapeHtml(results.mainRiskTheme)}</strong>
              <p>${escapeHtml(`${intro}o ponto que mais pede atenção agora aparece em "${results.mainProblem}".`)}</p>
            </article>
          </section>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Plano Diretor de Segurança da Informação</span>
              <h2>O que fazer agora, depois e em seguida</h2>
            </div>
            <div class="pdsi-grid">
              ${renderPdsiCard(results.pdsiPlan[0], 'now')}
              ${renderPdsiCard(results.pdsiPlan[1], 'soon')}
              ${renderPdsiCard(results.pdsiPlan[2], 'later')}
            </div>
          </section>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Serviços recomendados</span>
              <h2>O que faz mais sentido contratar primeiro</h2>
            </div>
            <div class="services-grid">
              ${results.recommendedServices.map((service, index) => renderServiceRecommendation(service, index)).join('')}
            </div>
          </section>

          <div class="results-actions">
            <button class="secondary-button" data-action="back-to-questions">Voltar às perguntas</button>
            <button class="secondary-button" data-action="open-report-preview">Visualizar relatório executivo</button>
            <button class="primary-button" data-action="download-pdf">Baixar PDF do relatório</button>
          </div>
        </section>
      </main>
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
      ${renderSchedulerModal()}
      ${renderExecutiveReportPreview()}
    `;

    scheduleFabPreview();
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
    let value = field.type === 'checkbox' ? field.checked : field.value;
    if (field.name === 'phone') {
      value = formatPhoneDisplay(value);
      field.value = value;
    }
    if (field.name === 'cep') {
      value = formatCep(value);
      field.value = value;
    }
    state.profile = { ...state.profile, [field.name]: value };
    state.leadContext = buildLeadContext(state.profile);
    saveState();
  }

  async function handleBlur(event) {
    const field = event.target.closest('[data-field]');
    if (!field) return;
    state.touched[field.dataset.field] = true;
    saveState();
    render();
    if (field.dataset.field === 'cep' && normalizeCep(field.value).length === 8) {
      await lookupCep(field.value);
    }
  }

  function updateLeadComputedState() {
    state.leadContext = buildLeadContext(state.profile);
    state.leadPayload = buildLeadPayload(state.profile);
    state.emailWarningVisible = Boolean(state.profile.email) && !state.leadContext.isCorporateEmail;
  }

  function sanitizeFieldInput(name, value) {
    if (name === 'consentMarketing') return Boolean(value);
    if (name === 'email') return String(value || '').replace(/[<>]/g, '');
    if (name === 'phone') return formatPhoneDisplay(value);
    if (name === 'cep') return formatCep(value);
    if (name === 'assessmentMode') return value === 'pocket' ? 'pocket' : 'full';
    if (name === 'size' || name === 'segment') return String(value || '');
    if (name === 'state') return String(value || '').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    return String(value || '').replace(/[<>]/g, '');
  }

  function finalizeFieldValue(name, value) {
    if (name === 'name') return normalizeFullName(value);
    if (name === 'email') return sanitizeInlineText(value).toLowerCase();
    if (name === 'company' || name === 'role' || name === 'city' || name === 'site' || name === 'interest') {
      return sanitizeInlineText(value);
    }
    if (name === 'observations') return sanitizeTextareaText(value);
    if (name === 'assessmentMode') return value === 'pocket' ? 'pocket' : 'full';
    if (name === 'size') return mapLegacySizeValue(value);
    if (name === 'segment') return mapLegacySegmentValue(value);
    if (name === 'phone') return formatPhoneDisplay(value);
    if (name === 'cep') return formatCep(value);
    if (name === 'state') return String(value || '').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    if (name === 'consentMarketing') return Boolean(value);
    return sanitizeInlineText(value);
  }

  function renderPreservingFocus(fieldName, selectionStart, selectionEnd) {
    render();
    if (!fieldName) return;
    const next = root.querySelector(`[data-profile-input][name="${fieldName}"]`);
    if (!next) return;
    next.focus({ preventScroll: true });
    if (typeof selectionStart === 'number' && typeof next.setSelectionRange === 'function') {
      const end = typeof selectionEnd === 'number' ? selectionEnd : selectionStart;
      next.setSelectionRange(selectionStart, end);
    }
  }

  function scheduleCepLookup(rawCep) {
    clearTimeout(cepLookupTimer);
    const cep = normalizeCep(rawCep);
    if (cep.length !== 8) {
      state.cepLookupPending = false;
      state.cepLookupFailed = false;
      saveState();
      return;
    }
    cepLookupTimer = setTimeout(() => {
      lookupCep(cep);
    }, 500);
  }

  function goToLeadStepTwo() {
    state.leadAttemptedStep = 1;
    const errors = validateLeadStep(state.profile, 1);
    if (Object.keys(errors).length) {
      setNotice('Revise os campos destacados para continuar.');
      state.fabPreview = 'Se quiser, eu posso te ajudar a começar.';
      return;
    }
    state.leadStep = 2;
    state.notice = '';
    state.entryMode = 'lead';
    updateLeadComputedState();
    saveState();
    render();
    emitEvent('lead_step_one_completed', {
      nome: state.leadPayload?.nome || '',
      email: state.leadPayload?.email || '',
      telefone: state.leadPayload?.telefone || '',
    });
  }

  function goToLeadStepOne() {
    state.leadStep = 1;
    state.notice = '';
    saveState();
    render();
  }

  function submitLead() {
    state.leadAttemptedStep = 2;
    const errors = validateLeadStep(state.profile, 2);
    if (Object.keys(errors).length) {
      setNotice('Revise os campos destacados para continuar.');
      state.fabPreview = 'Se quiser, eu posso te ajudar a concluir essa etapa.';
      return;
    }

    updateLeadComputedState();
    state.screen = 'questions';
    state.entryMode = 'hero';
    state.startedAt = state.startedAt || Date.now();
    state.notice = '';
    state.tooltipOption = '';
    saveState();
    render();

    queueLeadForSync(state.leadPayload, 'lead_capture');
    emitEvent('lead_completed', state.leadPayload);
    emitEvent('assessment_start', { lead: state.leadContext, lead_score: state.leadPayload.lead_score });
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
    updateLeadComputedState();
    saveState();
    render();
  }

  function handleSubmit(event) {
    const leadForm = event.target.closest('[data-form="lead"]');
    if (!leadForm) return;
    event.preventDefault();
    submitLead();
  }

  function handleInput(event) {
    const field = event.target.closest('[data-profile-input]');
    if (!field) return;

    const rawValue = field.type === 'checkbox' ? field.checked : field.value;
    const value = sanitizeFieldInput(field.name, rawValue);
    const selectionStart = typeof field.selectionStart === 'number' ? field.selectionStart : null;
    const selectionEnd = typeof field.selectionEnd === 'number' ? field.selectionEnd : null;

    if (field.type !== 'checkbox') {
      field.value = value;
    }

    state.profile = {
      ...state.profile,
      [field.name]: value,
    };
    updateLeadComputedState();
    saveState();

    if (field.name === 'cep') {
      scheduleCepLookup(value);
    }
    if (field.name === 'assessmentMode') {
      const total = getAssessmentQuestionCount(state.profile);
      state.currentIndex = Math.min(state.currentIndex, Math.max(total - 1, 0));
      render();
    } else if (field.type === 'checkbox') {
      render();
    }
  }

  async function handleBlur(event) {
    const field = event.target.closest('[data-field]');
    if (!field) return;

    state.touched[field.dataset.field] = true;
    state.profile = {
      ...state.profile,
      [field.name]: finalizeFieldValue(field.name, field.type === 'checkbox' ? field.checked : field.value),
    };
    updateLeadComputedState();
    saveState();
    render();

    if (field.dataset.field === 'cep' && normalizeCep(field.value).length === 8 && !state.profile.city && !state.profile.state) {
      await lookupCep(field.value);
    }
  }

  function handleClick(event) {
    const link = event.target.closest('a[href*="wa.me/"]');
    if (link) {
      emitEvent('whatsapp_click', { screen: state.screen });
      return;
    }

    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) {
      if (state.tooltipOption) {
        state.tooltipOption = '';
        saveState();
        render();
      }
      return;
    }

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
        state.notice = '';
        saveState();
        render();
        break;
      case 'lead-back-step':
        goToLeadStepOne();
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
      case 'toggle-tooltip':
        toggleTooltip(actionTarget.dataset.option);
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
      case 'open-scheduler':
        openScheduler(actionTarget.dataset.serviceKey);
        break;
      case 'close-scheduler':
        closeScheduler();
        break;
      case 'select-scheduler-day':
        state.schedulerDay = actionTarget.dataset.date;
        state.schedulerTime = getSchedulerSlots().find((item) => item.date === state.schedulerDay)?.times?.[0] || '';
        saveState();
        render();
        break;
      case 'select-scheduler-time':
        state.schedulerTime = actionTarget.dataset.time;
        saveState();
        render();
        break;
      case 'confirm-scheduler':
        confirmSchedule();
        break;
      case 'back-to-questions':
        state.screen = 'questions';
        saveState();
        render();
        break;
      case 'open-report-preview':
        state.reportPreviewOpen = true;
        saveState();
        render();
        break;
      case 'close-report-preview':
        state.reportPreviewOpen = false;
        saveState();
        render();
        break;
      case 'print-report-preview':
        window.print();
        break;
      case 'download-pdf':
        downloadReportPdf();
        break;
      case 'close-notice':
        clearNotice();
        break;
      default:
        break;
    }
  }
  function getObservedTier(score) {
    if (score < 1) {
      return {
        level: 'Base',
        rank: 0,
        title: 'abaixo do nÃ­vel 1 de maturidade',
        description: 'A operaÃ§Ã£o ainda depende mais de improviso do que de padrÃ£o.',
      };
    }
    if (score < 2) {
      return {
        level: 1,
        rank: 1,
        title: 'nÃ­vel 1 de maturidade',
        description: 'JÃ¡ existe base, mas pontos crÃ­ticos ainda pedem esforÃ§o manual demais.',
      };
    }
    if (score < 3) {
      return {
        level: 2,
        rank: 2,
        title: 'nÃ­vel 2 de maturidade',
        description: 'A empresa jÃ¡ opera com mais consistÃªncia, mas ainda hÃ¡ espaÃ§o claro para integrar melhor.',
      };
    }
    if (score < 3.7) {
      return {
        level: 3,
        rank: 3,
        title: 'nÃ­vel 3 de maturidade',
        description: 'A prÃ¡tica jÃ¡ aparece de forma mais estruturada e conectada ao negÃ³cio.',
      };
    }
    return {
      level: 4,
      rank: 4,
      title: 'nÃ­vel 4 de maturidade',
      description: 'A operaÃ§Ã£o mostra disciplina forte, previsibilidade e integraÃ§Ã£o real com o negÃ³cio.',
    };
  }
  function getObservedTier(score) {
    if (score < 1) {
      return {
        level: 'Base',
        rank: 0,
        title: 'abaixo do nivel 1 de maturidade',
        description: 'A operacao ainda depende mais de improviso do que de padrao.',
      };
    }
    if (score < 2) {
      return {
        level: 1,
        rank: 1,
        title: 'nivel 1 de maturidade',
        description: 'Ja existe base, mas pontos criticos ainda pedem esforco manual demais.',
      };
    }
    if (score < 3) {
      return {
        level: 2,
        rank: 2,
        title: 'nivel 2 de maturidade',
        description: 'A empresa ja opera com mais consistencia, mas ainda ha espaco claro para integrar melhor.',
      };
    }
    if (score < 3.7) {
      return {
        level: 3,
        rank: 3,
        title: 'nivel 3 de maturidade',
        description: 'A pratica ja aparece de forma mais estruturada e conectada ao negocio.',
      };
    }
    return {
      level: 4,
      rank: 4,
      title: 'nivel 4 de maturidade',
      description: 'A operacao mostra disciplina forte, previsibilidade e integracao real com o negocio.',
    };
  }
  function getAnsweredCount() {
    const questionIds = new Set(getAssessmentQuestions().map((question) => question.id));
    return Object.keys(state.answers).filter((id) => questionIds.has(id)).length;
  }

  function getProgressPercent() {
    const total = getAssessmentQuestionCount();
    return total ? (getAnsweredCount() / total) * 100 : 0;
  }

  function getCurrentQuestion() {
    const questions = getAssessmentQuestions();
    if (!questions.length) return null;
    const index = Math.min(state.currentIndex, Math.max(questions.length - 1, 0));
    return questions[index];
  }

  function renderHeader() {
    const totalQuestions = getAssessmentQuestionCount();
    const questionIndex = state.screen === 'questions' ? Math.min(state.currentIndex + 1, totalQuestions) : getAnsweredCount();
    const progressLabel =
      state.screen === 'questions'
        ? `Pergunta ${questionIndex} de ${totalQuestions}`
        : state.screen === 'results'
          ? 'Resultado'
          : 'Entrada';
    const showProgress = state.screen !== 'results';

    return `
      <header class="topbar">
        <div class="topbar__inner">
          <button class="brand" data-action="go-entry" aria-label="Voltar para a entrada">
            <span class="brand__name">${escapeHtml(content.meta.name)}</span>
          </button>
          ${showProgress ? `<span class="topbar__progress">${escapeHtml(progressLabel)}</span>` : ''}
        </div>
      </header>
    `;
  }

  function renderProgressCard(answered) {
    const totalQuestions = getAssessmentQuestionCount();
    const modeLabel = state.profile.assessmentMode === 'pocket' ? 'Pocket' : 'Full';
    return `
      <section class="light-card progress-card">
        <span class="progress-card__count">${answered} de ${totalQuestions} perguntas</span>
        <div class="progress-bar" aria-hidden="true">
          <span style="width:${getProgressPercent()}%"></span>
        </div>
        <div class="progress-card__notes">
          <p>Modo ${modeLabel}: ${totalQuestions} perguntas para entregar uma leitura proporcional ao tempo que voce quer investir agora.</p>
          <ul>
            <li>Cobrem estrategia, mapeamento, protecao, monitoramento, acao e recuperacao.</li>
            <li>Usam o porte e o setor para ajustar o rigor da leitura.</li>
            <li>Entregam prioridades objetivas para avancar ate o Tier 3.</li>
          </ul>
        </div>
      </section>
    `;
  }

  function renderLeadForm() {
    const errors = validateLeadStep(state.profile, 2);
    const mode = state.profile.assessmentMode === 'pocket' ? 'pocket' : 'full';
    return `
      <section class="light-card lead-card">
        <div class="lead-card__head">
          <div>
            <span class="lead-step__eyebrow">Captura de lead</span>
            <h2>Comece seu diagnostico executivo</h2>
          </div>
          <button class="link-button" data-action="back-to-hero">Voltar</button>
        </div>
        <p class="lead-card__text">Pedimos esses dados para calibrar o rigor do diagnostico ao porte e ao setor da sua empresa e para devolver prioridades realmente uteis no final.</p>
        <div class="lead-card__context">
          <strong>Por que responder com atencao?</strong>
          <p>A versao Full investiga a operacao inteira e reduz superficialidade. A Pocket acelera a entrada e entrega uma leitura inicial, mas com menos profundidade.</p>
        </div>
        <form class="lead-form" data-form="lead" novalidate>
          <fieldset class="field field--full assessment-mode" aria-describedby="hint-assessment-mode">
            <span>Versao da avaliacao</span>
            <div class="assessment-mode__grid">
              <label class="mode-card ${mode === 'full' ? 'is-selected' : ''}">
                <input type="radio" name="assessmentMode" value="full" data-field="assessmentMode" data-profile-input ${mode === 'full' ? 'checked' : ''} />
                <strong>Full</strong>
                <small>48 perguntas para uma leitura mais completa e confiavel.</small>
              </label>
              <label class="mode-card ${mode === 'pocket' ? 'is-selected' : ''}">
                <input type="radio" name="assessmentMode" value="pocket" data-field="assessmentMode" data-profile-input ${mode === 'pocket' ? 'checked' : ''} />
                <strong>Pocket</strong>
                <small>12 perguntas para uma analise inicial mais rapida.</small>
              </label>
            </div>
            <span class="field__hint" id="hint-assessment-mode">A versao Full ja vem marcada por padrao.</span>
          </fieldset>

          <label class="field field--full">
            <span>Nome completo</span>
            <input type="text" name="name" data-field="name" data-profile-input autocomplete="name" value="${escapeHtml(state.profile.name)}" aria-describedby="error-name" aria-invalid="${errors.name ? 'true' : 'false'}" />
            ${renderFieldError('name', errors)}
          </label>

          <label class="field field--full">
            <span>E-mail</span>
            <input type="email" name="email" data-field="email" data-profile-input autocomplete="email" value="${escapeHtml(state.profile.email)}" aria-describedby="error-email" aria-invalid="${errors.email ? 'true' : 'false'}" />
            ${renderFieldError('email', errors)}
            ${renderFieldWarning('email')}
          </label>

          <label class="field field--full">
            <span>Telefone</span>
            <input type="tel" name="phone" data-field="phone" data-profile-input autocomplete="tel" inputmode="tel" value="${escapeHtml(formatPhoneDisplay(state.profile.phone))}" aria-describedby="error-phone" aria-invalid="${errors.phone ? 'true' : 'false'}" />
            ${renderFieldError('phone', errors)}
          </label>

          <label class="field field--full">
            <span>Empresa</span>
            <input type="text" name="company" data-field="company" data-profile-input autocomplete="organization" value="${escapeHtml(state.profile.company)}" aria-describedby="error-company" aria-invalid="${errors.company ? 'true' : 'false'}" />
            ${renderFieldError('company', errors)}
          </label>

          <label class="field field--full">
            <span>Cargo</span>
            <input type="text" name="role" data-field="role" data-profile-input autocomplete="organization-title" value="${escapeHtml(state.profile.role)}" aria-describedby="error-role" aria-invalid="${errors.role ? 'true' : 'false'}" />
            ${renderFieldError('role', errors)}
          </label>

          <label class="field">
            <span>CEP</span>
            <input type="text" name="cep" data-field="cep" data-profile-input inputmode="numeric" autocomplete="postal-code" value="${escapeHtml(formatCep(state.profile.cep))}" aria-describedby="error-cep" aria-invalid="${errors.cep ? 'true' : 'false'}" />
            ${renderFieldError('cep', errors)}
            ${state.cepLookupPending ? '<span class="field__hint">Buscando cidade e estado...</span>' : ''}
            ${state.cepLookupFailed ? '<span class="field__hint">CEP nao encontrado. Preencha manualmente</span>' : ''}
          </label>

          <label class="field">
            <span>Cidade <small>(opcional)</small></span>
            <input type="text" name="city" data-field="city" data-profile-input autocomplete="address-level2" value="${escapeHtml(state.profile.city)}" />
          </label>

          <label class="field">
            <span>Estado <small>(opcional)</small></span>
            <input type="text" name="state" data-field="state" data-profile-input autocomplete="address-level1" value="${escapeHtml(state.profile.state)}" />
          </label>

          <label class="field">
            <span>Faixa de colaboradores</span>
            <select name="size" data-field="size" data-profile-input aria-describedby="error-size" aria-invalid="${errors.size ? 'true' : 'false'}">
              <option value="">Selecione</option>
              ${SIZE_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${state.profile.size === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
            </select>
            ${renderFieldError('size', errors)}
          </label>

          <label class="field">
            <span>Setor</span>
            <select name="segment" data-field="segment" data-profile-input aria-describedby="error-segment" aria-invalid="${errors.segment ? 'true' : 'false'}">
              <option value="">Selecione</option>
              ${SEGMENT_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${state.profile.segment === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
            </select>
            ${renderFieldError('segment', errors)}
          </label>

          <label class="field field--full">
            <span>Site <small>(opcional)</small></span>
            <input type="url" name="site" data-field="site" data-profile-input autocomplete="url" value="${escapeHtml(state.profile.site)}" />
          </label>

          <label class="checkbox-field field--full">
            <input type="checkbox" name="consentMarketing" data-field="consentMarketing" data-profile-input ${state.profile.consentMarketing ? 'checked' : ''} />
            <span>Ao continuar, voce concorda com o uso dos seus dados para contato e comunicacoes da Active Solutions.</span>
          </label>
          ${renderFieldError('consentMarketing', errors)}

          <button class="primary-button primary-button--full field--full" type="submit">Continuar para diagnostico</button>
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
            <h1>Avaliacao de Maturidade de Seguranca da Informacao segundo NIST CSF 2.0</h1>
            <p>Uma jornada leve e guiada para transformar respostas em direcao pratica de negocio.</p>
            <ul class="entry__list">
              <li>A versao Full aprofunda a leitura com 48 perguntas.</li>
              <li>A versao Pocket acelera a entrada com uma leitura inicial mais rapida.</li>
              <li>Voce nao precisa ser tecnico para responder bem.</li>
            </ul>
            <button class="primary-button" data-action="start-journey">
              ${hasProgress && isLeadReady() ? 'Continuar avaliacao' : 'Comecar avaliacao'}
            </button>
          </div>

          <div class="entry__side">
            ${showForm ? renderLeadForm() : renderProgressCard(answered)}
          </div>
        </section>
      </main>
    `;
  }

  function renderQuestionScreen() {
    const question = getCurrentQuestion();
    const totalQuestions = getAssessmentQuestionCount();
    if (!question) {
      return `
        <main class="app-shell app-shell--question">
          <section class="question-screen">
            <article class="question-card">
              <div class="question-card__body">
                <h1>Nenhuma pergunta disponivel no modo selecionado.</h1>
              </div>
            </article>
          </section>
        </main>
      `;
    }
    const answer = getCurrentAnswer();
    const stage = getStageMeta(question.categoria);

    return `
      <main class="app-shell app-shell--question">
        <section class="question-screen">
          <article class="question-card">
            <div class="question-card__header">
              <span class="question-card__step">Etapa ${stage.order} — ${escapeHtml(stage.label)}</span>
            </div>

            <div class="question-card__body">
              <h1>${escapeHtml(question.pergunta)}</h1>
              <p class="question-card__guide">${escapeHtml(getRoleAwareHint())}</p>
            </div>

            <div class="question-card__choices">
              ${OPTION_ORDER.map((key) => renderOptionCard(question, key, answer)).join('')}
            </div>

            <div class="question-card__actions">
              <button class="primary-button primary-button--full-mobile" data-action="next-question" ${answer ? '' : 'disabled'}>
                ${state.currentIndex === totalQuestions - 1 ? 'Ver resultado' : 'Proxima pergunta'}
              </button>
            </div>
          </article>
        </section>
      </main>
    `;
  }

  function buildExecutiveReportModel() {
    const lead = state.leadContext || buildLeadContext(state.profile);
    const results = computeResults();
    const domainHighlights = getStrongestAndWeakestDomains(results.domainResults);
    const plan306090 = buildPlan306090(results);
    const generatedAt = new Date();
    const questionRows = getAssessmentQuestions().map((question) => ({
      question: question.pergunta,
      domain: getStageMeta(question.categoria).label,
      answer: getQuestionAnswerLabel(state.answers[question.id]),
      expected: getQuestionExpectedAnswer(question),
    }));

    return {
      lead,
      results,
      generatedAt,
      domainHighlights,
      plan306090,
      questionRows,
      summaryText: `${getRigorNarrative(results, lead)} Os resultados indicam forca em ${domainHighlights.strongest
        .map((item) => item.stage.label)
        .join(' e ')} e maior atencao em ${domainHighlights.weakest
        .map((item) => item.stage.label)
        .join(' e ')}.`,
    };
  }

  function computeResults() {
    const leadContext = state.leadContext || buildLeadContext(state.profile);
    const activeQuestions = getAssessmentQuestions();
    const answeredQuestions = activeQuestions
      .map((question) => {
        const option = state.answers[question.id];
        if (!option) return null;
        const rawScore = OPTION_SCORES[option];
        const answerRatio = getAnswerRatio(option);
        return {
          question,
          option,
          rawScore,
          answerRatio,
          gapValue: (1 - answerRatio) * question.peso * (leadContext.rigorNorm || 0.5),
        };
      })
      .filter(Boolean);

    const domainResults = Object.keys(STAGE_META).map((domainKey) =>
      calculateDomainScore(
        domainKey,
        activeQuestions.filter((question) => question.categoria === domainKey),
        state.answers,
        leadContext.rigorNorm || 0.5
      )
    );

    const totalFinalWeight = domainResults.reduce((sum, item) => sum + item.scoreFinal, 0);
    const totalExpectedWeight = domainResults.reduce((sum, item) => sum + item.pesoEsperado, 0);
    const overallWeightedPercent = totalExpectedWeight ? (totalFinalWeight / totalExpectedWeight) * 100 : 0;
    const overallPercentRaw = overallWeightedPercent;

    const score = Math.max(0, Math.min(4, overallPercentRaw / 25));
    const percent = Math.round(overallPercentRaw);
    const observedTier = getObservedTier(score);
    const observedTierRank = Number(observedTier.rank ?? observedTier.level ?? 0);
    const expectedTier = leadContext.expectedTier;
    const gap = Math.max(expectedTier - observedTierRank, 0);
    const topGaps = answeredQuestions.sort((a, b) => b.gapValue - a.gapValue);
    const rankedServices = rankServices(domainResults, topGaps);
    const topServices = rankedServices.slice(0, 3);
    const recommendedServices = rankedServices.slice(0, 5);
    const classification =
      percent >= 80
        ? 'Maduro'
        : percent >= 60
          ? 'Estruturado'
          : percent >= 40
            ? 'Funcional'
            : percent >= 20
              ? 'Inicial'
              : 'Exposto';

    const summary =
      observedTierRank <= 1
        ? 'Voce ainda depende de improviso em pontos que ja deveriam ter dono e rotina.'
        : observedTierRank === 2
          ? 'Voce ja tem base, mas ainda depende de esforco manual em pontos criticos.'
          : observedTierRank === 3
            ? 'Voce tem uma base mais consistente, mas ainda pode reduzir atrito e excecao em frentes importantes.'
            : 'Voce ja mostra uma operacao mais estruturada, mas ainda vale consolidar o que sustenta crescimento com seguranca.';
    const results = {
      score,
      percent,
      observedTier,
      expectedTier,
      gap,
      topGaps,
      topServices,
      recommendedServices,
      primaryService: topServices[0] || null,
      secondaryService: topServices[1] || topServices[0] || null,
      strategicService: topServices[2] || topServices[1] || topServices[0] || null,
      mainProblem: topGaps[0]?.question.pergunta || 'maturidade geral',
      mainRiskTheme: getGapTheme(topGaps[0]),
      domainResults,
      overallWeightedPercent: Math.round(overallWeightedPercent || 0),
      rigorValue: leadContext.rigorValue,
      rigorNorm: leadContext.rigorNorm,
      classification,
      summary,
    };
    results.pdsiPlan = buildTier3Plan(results);
    return results;
  }

  function startJourney() {
    const totalQuestions = getAssessmentQuestionCount();
    if (isLeadReady() && getAnsweredCount() >= totalQuestions) {
      state.screen = 'results';
      saveState();
      render();
      return;
    }
    if (isLeadReady() && getAnsweredCount() < totalQuestions) {
      state.screen = 'questions';
      state.startedAt = state.startedAt || Date.now();
      saveState();
      render();
      return;
    }
    state.entryMode = 'lead';
    updateLeadComputedState();
    saveState();
    render();
  }

  function nextQuestion() {
    if (!getCurrentAnswer()) return;
    const totalQuestions = getAssessmentQuestionCount();
    if (state.currentIndex >= totalQuestions - 1) {
      state.screen = 'results';
      state.completedAt = Date.now();
      saveState();
      render();
      emitEvent('assessment_complete', computeResults());
      return;
    }
    state.currentIndex += 1;
    state.tooltipOption = '';
    saveState();
    render();
  }

  function repairMojibake(value) {
    const raw = String(value || '');
    if (!/[ÃÂâ�]/.test(raw)) return raw;
    try {
      return decodeURIComponent(escape(raw));
    } catch (error) {
      return raw;
    }
  }

  function escapeHtml(value) {
    return repairMojibake(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getQuestionExpectedAnswer() {
    return 'Esta bem resolvido';
  }

  function getQuestionAnswerLabel(answerKey) {
    if (!answerKey) return 'Nao respondida';
    return getHumanOptionLabel(answerKey);
  }

  function renderQuestionScreen() {
    const question = getCurrentQuestion();
    const totalQuestions = getAssessmentQuestionCount();
    if (!question) {
      return `
        <main class="app-shell app-shell--question">
          <section class="question-screen">
            <article class="question-card">
              <div class="question-card__body">
                <h1>Nenhuma pergunta disponivel no modo selecionado.</h1>
              </div>
            </article>
          </section>
        </main>
      `;
    }
    const answer = getCurrentAnswer();
    const stage = getStageMeta(question.categoria);

    return `
      <main class="app-shell app-shell--question">
        <section class="question-screen">
          <article class="question-card">
            <div class="question-card__header">
              <span class="question-card__step">Etapa ${stage.order} - ${escapeHtml(stage.label)}</span>
            </div>

            <div class="question-card__body">
              <h1>${escapeHtml(question.pergunta)}</h1>
              <p class="question-card__guide">Considere o que acontece na pratica, nao no ideal.</p>
            </div>

            <div class="question-card__choices">
              ${OPTION_ORDER.map((key) => renderOptionCard(question, key, answer)).join('')}
            </div>

            <div class="question-card__actions">
              <button class="primary-button primary-button--full-mobile" data-action="next-question" ${answer ? '' : 'disabled'}>
                ${state.currentIndex === totalQuestions - 1 ? 'Ver resultado' : 'Proxima pergunta'}
              </button>
            </div>
          </article>
        </section>
      </main>
    `;
  }

  function renderExecutiveReportPreview() {
    if (!state.reportPreviewOpen) return '';
    const model = buildExecutiveReportModel();
    const { lead, results, plan306090, questionRows, generatedAt } = model;

    return `
      <div class="modal-backdrop" data-action="close-report-preview">
        <section class="modal-card modal-card--report" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
          <div class="modal-card__header">
            <div>
              <span class="modal-card__eyebrow">Relatorio executivo</span>
              <h2 id="report-preview-title">Relatorio de Seguranca da Informacao</h2>
            </div>
            <button class="link-button" data-action="close-report-preview">Fechar</button>
          </div>

          <article class="report-preview">
            <section class="report-preview__cover">
              <div class="report-preview__brandline">
                <img src="${escapeHtml(content.meta.brandAssets.logoColor)}" alt="Active Solutions" class="report-preview__logo" />
                <div>
                  <span class="report-preview__brand">Active Solutions</span>
                  <p>Relatorio executivo gerado pelo N.A.V.E.</p>
                </div>
              </div>
              <h3>Relatorio de Seguranca da Informacao</h3>
              <p>${escapeHtml(ACTIVE_SOLUTIONS_DESCRIPTION)}</p>
              <div class="report-preview__meta">
                <span>${escapeHtml(lead.company || 'Empresa avaliada')}</span>
                <span>${escapeHtml(lead.segment || 'Setor informado')}</span>
                <span>${escapeHtml(lead.size || 'Porte informado')}</span>
                <span>${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(generatedAt))}</span>
              </div>
            </section>

            <section class="report-preview__section">
              <h3>Sumario executivo</h3>
              <p>${escapeHtml(model.summaryText)}</p>
              <ul>
                <li>${escapeHtml(getRigorNarrative(results, lead))}</li>
                <li>${escapeHtml(`Top 3 servicos recomendados: ${results.topServices.map((item) => item.name).join(', ')}.`)}</li>
                <li>${escapeHtml('30 dias: eliminar riscos obvios. 60 dias: estabelecer monitoramento e resposta. 90 dias: consolidar controles e disciplina operacional.')}</li>
                <li>Este relatorio e gerado automaticamente com base em autodeclaracoes e nao substitui auditoria tecnica.</li>
              </ul>
            </section>

            <section class="report-preview__section">
              <h3>Leitura de maturidade</h3>
              <div class="report-preview__grid">
                <article class="metric-card">
                  <span>Score geral</span>
                  <strong>${results.percent}%</strong>
                </article>
                <article class="metric-card">
                  <span>Nivel atual</span>
                  <strong>${results.observedTier.level}</strong>
                </article>
                <article class="metric-card">
                  <span>Nivel esperado</span>
                  <strong>${results.expectedTier}</strong>
                </article>
              </div>
              <p><strong>Hoje, seu maior risco esta em:</strong> ${escapeHtml(results.mainRiskTheme)}</p>
            </section>

            <section class="report-preview__section">
              <h3>Plano 30 / 60 / 90 dias</h3>
              <div class="report-preview__grid report-preview__grid--three">
                <article class="pdsi-card pdsi-card--now"><span class="pdsi-card__label">30 dias</span><p>${plan306090[30].map((item) => `• ${escapeHtml(item)}`).join('<br/>')}</p></article>
                <article class="pdsi-card pdsi-card--soon"><span class="pdsi-card__label">60 dias</span><p>${plan306090[60].map((item) => `• ${escapeHtml(item)}`).join('<br/>')}</p></article>
                <article class="pdsi-card pdsi-card--later"><span class="pdsi-card__label">90 dias</span><p>${plan306090[90].map((item) => `• ${escapeHtml(item)}`).join('<br/>')}</p></article>
              </div>
            </section>

            <section class="report-preview__section">
              <h3>Perguntas e respostas</h3>
              <div class="report-table">
                <div class="report-table__head">
                  <span>Pergunta</span>
                  <span>Voce</span>
                  <span>Esperado</span>
                </div>
                ${questionRows
                  .map(
                    (row) => `
                      <div class="report-table__row">
                        <span>${escapeHtml(row.question)}</span>
                        <span>${escapeHtml(row.answer)}</span>
                        <span>${escapeHtml(row.expected)}</span>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </section>

            <section class="report-preview__footer">
              <p>Este relatorio foi gerado automaticamente e nao substitui auditoria tecnica. Os dados fornecidos podem ser usados pela Active Solutions para comunicacao e marketing, com possibilidade de revogacao do consentimento a qualquer momento.</p>
              <p>Data/Hora: ${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(generatedAt))} / IP: ${escapeHtml(state.clientIp || 'nao disponivel')}</p>
            </section>
          </article>

          <div class="results-actions">
            <button class="secondary-button" data-action="print-report-preview">Imprimir / salvar em PDF</button>
            <button class="primary-button" data-action="download-pdf">Baixar PDF</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderResultsScreen() {
    const results = computeResults();
    const lead = state.leadContext || buildLeadContext(state.profile);
    const maturityTitle = `Nivel ${results.observedTier.level}`;
    const intro = lead.firstName ? `${lead.firstName}, ` : '';

    return `
      <main class="app-shell app-shell--results">
        <section class="results-screen">
          <article class="results-hero">
            <span class="results-hero__eyebrow">Resumo executivo</span>
            <h1>${escapeHtml(maturityTitle)}</h1>
            <p>${escapeHtml(results.summary)}</p>
            <div class="results-hero__meta">
              <span>Score geral: ${results.percent}%</span>
              <span>Classificacao: ${escapeHtml(results.classification)}</span>
              <span>Nivel esperado: ${results.expectedTier}</span>
              ${state.rdQueue.length ? `<span>Envio pendente: ${state.rdQueue.length}</span>` : ''}
            </div>
          </article>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Relatorio de maturidade</span>
              <h2>O que esse diagnostico mostra agora</h2>
            </div>
            <div class="maturity-grid">
              <article class="metric-card">
                <span>Nivel atual</span>
                <strong>${results.observedTier.level}</strong>
              </article>
              <article class="metric-card">
                <span>Nivel esperado</span>
                <strong>${results.expectedTier}</strong>
              </article>
              <article class="metric-card">
                <span>Gap principal</span>
                <strong>${results.gap > 0 ? `${results.gap} nivel${results.gap > 1 ? 'is' : ''}` : 'Sem defasagem relevante'}</strong>
              </article>
            </div>
            <article class="risk-highlight">
              <strong>Hoje, seu maior risco esta em: ${escapeHtml(results.mainRiskTheme)}</strong>
              <p>${escapeHtml(`${intro}o ponto que mais pede atencao agora aparece em "${results.mainProblem}".`)}</p>
            </article>
          </section>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Plano Diretor de Seguranca da Informacao</span>
              <h2>O que fazer agora, depois e em seguida</h2>
            </div>
            <div class="pdsi-grid">
              ${renderPdsiCard(results.pdsiPlan[0], 'now')}
              ${renderPdsiCard(results.pdsiPlan[1], 'soon')}
              ${renderPdsiCard(results.pdsiPlan[2], 'later')}
            </div>
          </section>

          <section class="results-block">
            <div class="results-block__head">
              <span class="results-hero__eyebrow">Servicos recomendados</span>
              <h2>O que faz mais sentido contratar primeiro</h2>
            </div>
            <div class="services-grid">
              ${results.recommendedServices.map((service, index) => renderServiceRecommendation(service, index)).join('')}
            </div>
          </section>

          <div class="results-actions">
            <button class="secondary-button" data-action="back-to-questions">Voltar as perguntas</button>
            <button class="secondary-button" data-action="open-report-preview">Visualizar relatorio executivo</button>
            <button class="primary-button" data-action="download-pdf">Baixar PDF do relatorio</button>
          </div>
        </section>
      </main>
    `;
  }

  function createReportPdfDocument() {
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      return null;
    }

    const model = buildExecutiveReportModel();
    const { lead, results, plan306090, questionRows, domainHighlights, generatedAt } = model;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 56;

    const addParagraph = (text, options = {}) => {
      const safeText = repairMojibake(text);
      const fontSize = options.fontSize || 11;
      const lineHeight = options.lineHeight || 17;
      const color = options.color || [71, 85, 105];
      const weight = options.weight || 'normal';
      const spacingAfter = options.spacingAfter ?? 12;
      const lines = doc.splitTextToSize(String(safeText || ''), contentWidth);

      if (y + lines.length * lineHeight > pageHeight - 56) {
        doc.addPage();
        y = 56;
      }

      doc.setFont('helvetica', weight);
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      doc.text(lines, margin, y);
      y += lines.length * lineHeight + spacingAfter;
    };

    const addRule = () => {
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, margin + contentWidth, y);
      y += 18;
    };

    doc.setFillColor(10, 26, 47);
    doc.roundedRect(margin, 32, contentWidth, 140, 22, 22, 'F');
    doc.setTextColor(248, 250, 252);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Active Solutions', margin + 20, 58);
    doc.setFontSize(24);
    doc.text('Relatorio de Seguranca da Informacao', margin + 20, 92);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(repairMojibake(ACTIVE_SOLUTIONS_DESCRIPTION), margin + 20, 118, { maxWidth: contentWidth - 40 });
    doc.text(
      repairMojibake(`${lead.company || 'Empresa avaliada'} - ${lead.segment || 'Setor informado'} - ${lead.size || 'Porte informado'}`),
      margin + 20,
      152,
      { maxWidth: contentWidth - 40 }
    );
    y = 204;

    addParagraph('Sumario executivo', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    addParagraph(getRigorNarrative(results, lead), {
      fontSize: 11,
      lineHeight: 18,
      spacingAfter: 10,
    });
    addParagraph(model.summaryText, {
      fontSize: 11,
      lineHeight: 18,
      spacingAfter: 10,
    });
    addParagraph(`Score geral: ${results.percent}% | Score ajustado: ${results.overallWeightedPercent}% | Classificacao: ${results.classification}`, {
      fontSize: 11,
      weight: 'bold',
      color: [0, 87, 231],
      spacingAfter: 8,
    });
    addParagraph(`Top 3 servicos recomendados agora: ${results.topServices.map((item) => item.name).join(', ')}.`, {
      fontSize: 11,
      lineHeight: 18,
      spacingAfter: 12,
    });

    addRule();

    addParagraph('Plano 30 / 60 / 90 dias', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    [['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias']].forEach(([key, label]) => {
      addParagraph(label, {
        fontSize: 12,
        weight: 'bold',
        color: [10, 26, 47],
        spacingAfter: 6,
      });
      (plan306090[key] || []).forEach((item) => {
        addParagraph(`- ${item}`, {
          fontSize: 11,
          lineHeight: 17,
          spacingAfter: 4,
        });
      });
      y += 4;
    });

    addRule();

    addParagraph('Leitura por dominio', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    domainHighlights.strongest.forEach((item) => {
      addParagraph(`Ponto forte: ${item.stage.label} (${Math.round(item.scorePercentual)}%)`, {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 4,
        color: [89, 118, 108],
      });
    });
    domainHighlights.weakest.forEach((item) => {
      addParagraph(`Ponto fraco: ${item.stage.label} (${Math.round(item.scorePercentual)}%)`, {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 6,
        color: [173, 9, 43],
      });
    });
    addParagraph(`Hoje, seu maior risco esta em: ${results.mainRiskTheme}.`, {
      fontSize: 11,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 12,
    });

    addRule();

    addParagraph('Perguntas e respostas', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });
    questionRows.forEach((row, index) => {
      addParagraph(`${index + 1}. ${row.question}`, {
        fontSize: 11,
        weight: 'bold',
        color: [10, 26, 47],
        spacingAfter: 4,
      });
      addParagraph(`Voce: ${row.answer} | Esperado: ${row.expected} | Etapa: ${row.domain}`, {
        fontSize: 10,
        weight: 'bold',
        color: [0, 87, 231],
        spacingAfter: 10,
      });
    });

    addRule();

    addParagraph(
      'Este relatorio foi gerado automaticamente e nao substitui auditoria tecnica. Os dados fornecidos podem ser usados pela Active Solutions para fins de comunicacao e marketing, conforme a Politica de Privacidade. O titular pode revogar o consentimento a qualquer momento.',
      {
        fontSize: 10,
        lineHeight: 16,
        spacingAfter: 8,
      }
    );
    addParagraph(
      `Data/Hora de geracao: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(generatedAt)} / IP: ${state.clientIp || 'nao disponivel'}`,
      {
        fontSize: 10,
        lineHeight: 16,
        color: [71, 85, 105],
      }
    );

    return doc;
  }

  function renderExecutiveReportPreview() {
    if (!state.reportPreviewOpen) return '';
    const model = buildExecutiveReportModel();
    const { lead, results, plan306090, questionRows, generatedAt } = model;
    const renderPlan = (items = []) => items.map((item) => `- ${escapeHtml(item)}`).join('<br/>');

    return `
      <div class="modal-backdrop" data-action="close-report-preview">
        <section class="modal-card modal-card--report" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
          <div class="modal-card__header">
            <div>
              <span class="modal-card__eyebrow">Relatorio executivo</span>
              <h2 id="report-preview-title">Relatorio de Seguranca da Informacao</h2>
            </div>
            <button class="link-button" data-action="close-report-preview">Fechar</button>
          </div>

          <article class="report-preview">
            <section class="report-preview__cover">
              <div class="report-preview__brandline">
                <img src="${escapeHtml(content.meta.brandAssets.logoColor)}" alt="Active Solutions" class="report-preview__logo" />
                <div>
                  <span class="report-preview__brand">Active Solutions</span>
                  <p>Relatorio executivo gerado pelo N.A.V.E.</p>
                </div>
              </div>
              <h3>Relatorio de Seguranca da Informacao</h3>
              <p>${escapeHtml(ACTIVE_SOLUTIONS_DESCRIPTION)}</p>
              <div class="report-preview__meta">
                <span>${escapeHtml(lead.company || 'Empresa avaliada')}</span>
                <span>${escapeHtml(lead.segment || 'Setor informado')}</span>
                <span>${escapeHtml(lead.size || 'Porte informado')}</span>
                <span>${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(generatedAt))}</span>
              </div>
            </section>

            <section class="report-preview__section">
              <h3>Sumario executivo</h3>
              <p>${escapeHtml(model.summaryText)}</p>
              <ul>
                <li>${escapeHtml(getRigorNarrative(results, lead))}</li>
                <li>${escapeHtml(`Top 3 servicos recomendados: ${results.topServices.map((item) => item.name).join(', ')}.`)}</li>
                <li>${escapeHtml('30 dias: eliminar riscos obvios. 60 dias: estabelecer monitoramento e resposta. 90 dias: consolidar controles e disciplina operacional.')}</li>
                <li>Este relatorio e gerado automaticamente com base em autodeclaracoes e nao substitui auditoria tecnica.</li>
              </ul>
            </section>

            <section class="report-preview__section">
              <h3>Leitura de maturidade</h3>
              <div class="report-preview__grid">
                <article class="metric-card">
                  <span>Score geral</span>
                  <strong>${results.percent}%</strong>
                </article>
                <article class="metric-card">
                  <span>Nivel atual</span>
                  <strong>${results.observedTier.level}</strong>
                </article>
                <article class="metric-card">
                  <span>Nivel esperado</span>
                  <strong>${results.expectedTier}</strong>
                </article>
              </div>
              <p><strong>Hoje, seu maior risco esta em:</strong> ${escapeHtml(results.mainRiskTheme)}</p>
            </section>

            <section class="report-preview__section">
              <h3>Plano 30 / 60 / 90 dias</h3>
              <div class="report-preview__grid report-preview__grid--three">
                <article class="pdsi-card pdsi-card--now"><span class="pdsi-card__label">30 dias</span><p>${renderPlan(plan306090[30])}</p></article>
                <article class="pdsi-card pdsi-card--soon"><span class="pdsi-card__label">60 dias</span><p>${renderPlan(plan306090[60])}</p></article>
                <article class="pdsi-card pdsi-card--later"><span class="pdsi-card__label">90 dias</span><p>${renderPlan(plan306090[90])}</p></article>
              </div>
            </section>

            <section class="report-preview__section">
              <h3>Perguntas e respostas</h3>
              <div class="report-table">
                <div class="report-table__head">
                  <span>Pergunta</span>
                  <span>Voce</span>
                  <span>Esperado</span>
                </div>
                ${questionRows
                  .map(
                    (row) => `
                      <div class="report-table__row">
                        <span>${escapeHtml(row.question)}</span>
                        <span>${escapeHtml(row.answer)}</span>
                        <span>${escapeHtml(row.expected)}</span>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </section>

            <section class="report-preview__footer">
              <p>Este relatorio foi gerado automaticamente e nao substitui auditoria tecnica. Os dados fornecidos podem ser usados pela Active Solutions para comunicacao e marketing, com possibilidade de revogacao do consentimento a qualquer momento.</p>
              <p>Data/Hora: ${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(generatedAt))} / IP: ${escapeHtml(state.clientIp || 'nao disponivel')}</p>
            </section>
          </article>

          <div class="results-actions">
            <button class="secondary-button" data-action="print-report-preview">Imprimir / salvar em PDF</button>
            <button class="primary-button" data-action="download-pdf">Baixar PDF</button>
          </div>
        </section>
      </div>
    `;
  }
})();
