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
      tooltipOption: '',
      modalServiceKey: '',
      schedulerServiceKey: '',
      schedulerDay: '',
      schedulerTime: '',
      schedulerPending: false,
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
    if (state.modalServiceKey && !services[state.modalServiceKey]) state.modalServiceKey = '';
    if (state.schedulerServiceKey && !services[state.schedulerServiceKey]) state.schedulerServiceKey = '';
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

    const filtered = ranking
      .filter((item) => item.rankingScore > 0)
      .sort((a, b) => b.rankingScore - a.rankingScore);
    if (filtered.length) return filtered;
    return ranking.slice(0, 5).map((item) => ({
      ...item,
      rankingScore: 1,
      whyAppeared: 'Foi recomendado porque ajuda a transformar o diagnóstico em uma frente concreta de evolução.',
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
    const recommendedServices = rankedServices.slice(0, 5);

    const summary =
      observedTier.level <= 1
        ? 'Você ainda depende de improviso em pontos que já deveriam ter dono e rotina.'
        : observedTier.level === 2
          ? 'Você já tem base, mas ainda depende de esforço manual em pontos críticos.'
          : observedTier.level === 3
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

    const lead = state.leadContext || buildLeadContext(state.profile);
    const results = computeResults();
    const plan = results.pdsiPlan;
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
    doc.roundedRect(margin, 32, contentWidth, 92, 22, 22, 'F');
    doc.setTextColor(248, 250, 252);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('N.A.V.E. · Active Solutions', margin + 20, 58);
    doc.setFontSize(24);
    doc.text('Plano executivo até o Tier 3', margin + 20, 90);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(
      `Emitido em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}`,
      margin + 20,
      112
    );
    y = 148;

    addParagraph(
      `${lead.name || 'Liderança responsável'}${lead.company ? ` · ${lead.company}` : ''}${lead.role ? ` · ${lead.role}` : ''}`,
      { fontSize: 12, weight: 'bold', color: [10, 26, 47], spacingAfter: 10 }
    );
    addParagraph(
      `Tier observado: ${results.observedTier.level} · Tier esperado para o contexto: ${results.expectedTier} · Score executivo: ${results.percent}%`,
      { fontSize: 12, color: [0, 87, 231], weight: 'bold', spacingAfter: 16 }
    );
    addParagraph(results.summary, {
      fontSize: 13,
      color: [15, 23, 42],
      lineHeight: 20,
      spacingAfter: 18,
    });

    addParagraph('Plano Diretor de Segurança da Informação', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });

    plan.forEach((item, index) => {
      addParagraph(`${index + 1}. ${item.phase}`, {
        fontSize: 12,
        weight: 'bold',
        color: [0, 87, 231],
        spacingAfter: 6,
      });
      addParagraph(item.title, {
        fontSize: 14,
        weight: 'bold',
        color: [10, 26, 47],
        lineHeight: 20,
        spacingAfter: 6,
      });
      addParagraph(item.body, {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 6,
      });
      addParagraph(`Serviço que mais acelera essa frente: ${item.serviceName}`, {
        fontSize: 11,
        weight: 'bold',
        color: [89, 118, 108],
        spacingAfter: 14,
      });
    });

    addRule();

    addParagraph('Serviços mais indicados agora', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 10,
    });

    results.recommendedServices.slice(0, 5).forEach((service, index) => {
      addParagraph(`${index + 1}. ${service.name}`, {
        fontSize: 13,
        weight: 'bold',
        color: [10, 26, 47],
        spacingAfter: 5,
      });
      addParagraph(service.summary, {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 5,
      });
      addParagraph(service.whyAppeared, {
        fontSize: 11,
        lineHeight: 18,
        color: [71, 85, 105],
        spacingAfter: 12,
      });
    });

    addRule();

    addParagraph('Próximo passo recomendado', {
      fontSize: 16,
      weight: 'bold',
      color: [10, 26, 47],
      spacingAfter: 8,
    });
    addParagraph(
      'Use este plano como guia prático. Se quiser acelerar a execução, o melhor movimento agora é validar prioridades, esforço e sequência com um especialista da Active Solutions.',
      {
        fontSize: 11,
        lineHeight: 18,
        spacingAfter: 12,
      }
    );
    addParagraph(buildWhatsAppMessage(results.primaryService), {
      fontSize: 10,
      lineHeight: 16,
      color: [71, 85, 105],
      spacingAfter: 0,
    });

    return { doc, lead, results };
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
    const questionIndex = state.screen === 'questions' ? state.currentIndex + 1 : getAnsweredCount();
    const progressLabel =
      state.screen === 'questions'
        ? `Pergunta ${questionIndex} de ${content.questions.length}`
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
              <span>Nível esperado: ${results.expectedTier}</span>
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

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && (state.modalServiceKey || state.schedulerServiceKey)) {
        state.modalServiceKey = '';
        state.schedulerServiceKey = '';
        state.schedulerDay = '';
        state.schedulerTime = '';
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
