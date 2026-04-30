(function () {
  const root = document.getElementById('calculator-root');
  const dosimetry = window.AnpdDosimetry;
  if (!root || !dosimetry) return;

  const config = {
    specialistWhatsApp: '5511991559361',
    rdAdapterUrl: '',
    rdStationToken: '',
    rdStationEndpoint: 'https://api.rd.services/platform/contacts',
    rdFieldsEndpoint: 'https://api.rd.services/platform/contacts/fields',
    rdEnsureCustomFields: false,
    sendExactRevenueToRd: false,
    productEventHook: '',
    appVersion: '1.0.0',
    ...(window.CALCULADORA_ANPD_CONFIG || {}),
  };

  const STORAGE_KEY = 'calculadora-anpd-v1';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const WHATSAPP_MESSAGE =
    'Olá! Estou usando a calculadora de dosimetria da ANPD e gostaria de ajuda para entender melhor o resultado.';
  const WHATSAPP_URL = `https://wa.me/${config.specialistWhatsApp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  const RD_CONTACTS_ENDPOINT = 'https://api.rd.services/platform/contacts';
  const RD_FIELDS_ENDPOINT = 'https://api.rd.services/platform/contacts/fields';

  const STEPS = [
    { id: 'privacy', label: 'Aviso' },
    { id: 'organization', label: 'Organização' },
    { id: 'classification', label: 'Cenário' },
    { id: 'damage', label: 'Dano' },
    { id: 'aggravating', label: 'Agravantes' },
    { id: 'mitigating', label: 'Atenuantes' },
    { id: 'lead', label: 'Contato' },
    { id: 'result', label: 'Resultado' },
  ];

  const ENTITY_LABELS = {
    legal_with_revenue: 'Pessoa jurídica com faturamento',
    natural_person: 'Pessoa natural',
    legal_without_revenue: 'Pessoa jurídica sem faturamento',
  };

  const CLASSIFICATION_LABELS = {
    leve: 'Leve',
    media: 'Média',
    grave: 'Grave',
  };

  const RD_CUSTOM_FIELDS = [
    buildRdField('cf_tipo_organizacao_avaliada', 'Tipo da organização avaliada'),
    buildRdField('cf_faixa_faturamento', 'Faixa de faturamento'),
    buildRdField('cf_classificacao_cenario', 'Classificação do cenário'),
    buildRdField('cf_grau_dano', 'Grau do dano', 'NUMBER_INPUT', 'INTEGER'),
    buildRdField('cf_percentual_agravantes', 'Percentual total de agravantes'),
    buildRdField('cf_percentual_atenuantes', 'Percentual total de atenuantes'),
    buildRdField('cf_valor_final_estimado', 'Valor final estimado'),
    buildRdField('cf_landing_page_origem', 'Landing page de origem'),
    buildRdField('cf_utm_source', 'UTM source'),
    buildRdField('cf_utm_medium', 'UTM medium'),
    buildRdField('cf_utm_campaign', 'UTM campaign'),
    buildRdField('cf_utm_term', 'UTM term'),
    buildRdField('cf_utm_content', 'UTM content'),
  ];

  let state = loadState();
  syncOrigin();
  bindEvents();
  render();
  processPendingRdQueue();

  function defaultState() {
    return {
      currentStep: 'privacy',
      privacyAccepted: false,
      leadSubmitted: false,
      simulation: {
        assessedEntityType: 'legal_with_revenue',
        revenue: '',
        taxes: '',
        economicAdvantage: '',
        scenarioClassification: '',
        damageDegree: '',
        aggravatingFactors: {
          specificRecidivism: 0,
          genericRecidivism: 0,
          orientationOrPreventiveMeasure: 0,
          correctiveMeasure: 0,
        },
        mitigatingFactors: {
          cessationMoment: 'none',
          governanceProgram: false,
          mitigationMeasuresMoment: 'none',
          cooperationOrGoodFaith: false,
        },
      },
      lead: {
        name: '',
        email: '',
        whatsapp: '',
        company: '',
        role: '',
      },
      origin: readOrigin(),
      errors: {},
      rdQueue: [],
      rdStatus: '',
      submittedAt: '',
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return mergeState(defaultState(), parsed || {});
    } catch (error) {
      return defaultState();
    }
  }

  function mergeState(base, value) {
    return {
      ...base,
      ...value,
      simulation: {
        ...base.simulation,
        ...(value.simulation || {}),
        aggravatingFactors: {
          ...base.simulation.aggravatingFactors,
          ...(value.simulation?.aggravatingFactors || {}),
        },
        mitigatingFactors: {
          ...base.simulation.mitigatingFactors,
          ...(value.simulation?.mitigatingFactors || {}),
        },
      },
      lead: { ...base.lead, ...(value.lead || {}) },
      origin: { ...base.origin, ...(value.origin || {}) },
      errors: value.errors || {},
      rdQueue: Array.isArray(value.rdQueue) ? value.rdQueue : [],
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function syncOrigin() {
    state.origin = { ...state.origin, ...readOrigin() };
    saveState();
  }

  function readOrigin() {
    const params = new URLSearchParams(window.location.search || '');
    const utm = UTM_KEYS.reduce((acc, key) => {
      const value = sanitizeInlineText(params.get(key) || '');
      acc[key] = value;
      return acc;
    }, {});

    let pageUrl = window.location.href.split('#')[0];
    try {
      const url = new URL(window.location.href);
      const cleanParams = new URLSearchParams();
      UTM_KEYS.forEach((key) => {
        if (utm[key]) cleanParams.set(key, utm[key]);
      });
      url.search = cleanParams.toString();
      url.hash = '';
      pageUrl = url.href;
    } catch (error) {
      // noop
    }

    return {
      landing_page_origem: 'calculadora-anpd',
      ...utm,
      referrer: sanitizeInlineText(document.referrer || ''),
      page_url: sanitizeInlineText(pageUrl),
    };
  }

  function sanitizeInlineText(value) {
    return String(value || '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getStepIndex(stepId = state.currentStep) {
    return Math.max(0, STEPS.findIndex((step) => step.id === stepId));
  }

  function getSimulationInput() {
    return {
      assessedEntityType: state.simulation.assessedEntityType,
      revenue: state.simulation.revenue,
      taxes: state.simulation.taxes,
      economicAdvantage: state.simulation.economicAdvantage,
      scenarioClassification: state.simulation.scenarioClassification,
      damageDegree: state.simulation.damageDegree,
      aggravatingFactors: { ...state.simulation.aggravatingFactors },
      mitigatingFactors: { ...state.simulation.mitigatingFactors },
    };
  }

  function getSimulationResult() {
    return dosimetry.calculateDosimetry(getSimulationInput());
  }

  function getSimulationResultOrNull() {
    try {
      return getSimulationResult();
    } catch (error) {
      return null;
    }
  }

  function setPath(target, path, value) {
    const parts = path.split('.');
    let cursor = target;
    parts.slice(0, -1).forEach((part) => {
      cursor[part] = cursor[part] || {};
      cursor = cursor[part];
    });
    cursor[parts[parts.length - 1]] = value;
  }

  function getPath(target, path) {
    return path.split('.').reduce((cursor, part) => (cursor ? cursor[part] : undefined), target);
  }

  function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const sanitized = String(value || '').replace(/[^\d,.-]/g, '').trim();
    if (!sanitized) return 0;
    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const normalized =
      decimalSeparator === ','
        ? sanitized.replace(/\./g, '').replace(',', '.')
        : sanitized.replace(/,/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatCurrency(value) {
    if (!Number.isFinite(value)) return 'Não aplicável';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    }).format(value || 0);
  }

  function formatPercent(value, digits = 0) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value || 0);
  }

  function formatAliquot(value) {
    return `${((value || 0) * 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    })}%`;
  }

  function normalizePhoneDigits(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits.slice(2);
    return digits.slice(0, 11);
  }

  function normalizePhoneE164(value) {
    const digits = normalizePhoneDigits(value);
    return digits.length >= 10 ? `+55${digits}` : '';
  }

  function formatPhoneDisplay(value) {
    const digits = normalizePhoneDigits(value);
    if (!digits) return '';
    if (digits.length < 3) return `(${digits}`;
    if (digits.length < 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length < 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function entityTypeLabel(value = state.simulation.assessedEntityType) {
    return ENTITY_LABELS[value] || 'Não informado';
  }

  function classificationLabel(value = state.simulation.scenarioClassification) {
    return CLASSIFICATION_LABELS[value] || 'Não informado';
  }

  function validateStep(stepId) {
    const errors = {};
    const sim = state.simulation;

    if (stepId === 'organization') {
      if (!sim.assessedEntityType) errors.assessedEntityType = 'Selecione o tipo de organização avaliada.';
      if (sim.assessedEntityType === 'legal_with_revenue') {
        if (toNumber(sim.revenue) <= 0) errors.revenue = 'Informe um faturamento aproximado maior que zero.';
        if (toNumber(sim.taxes) < 0) errors.taxes = 'Informe zero ou um valor positivo.';
        if (toNumber(sim.taxes) > toNumber(sim.revenue)) errors.taxes = 'Os tributos não devem superar o faturamento informado.';
      }
      if (toNumber(sim.economicAdvantage) < 0) errors.economicAdvantage = 'Informe zero ou um valor positivo.';
    }

    if (stepId === 'classification' && !sim.scenarioClassification) {
      errors.scenarioClassification = 'Selecione a classificação do cenário.';
    }

    if (stepId === 'damage' && !['0', '1', '2', '3', 0, 1, 2, 3].includes(sim.damageDegree)) {
      errors.damageDegree = 'Selecione o grau do dano.';
    }

    if (stepId === 'lead') {
      const lead = state.lead;
      if (!sanitizeInlineText(lead.name)) errors.name = 'Informe seu nome.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(lead.email || '').trim())) errors.email = 'Informe um email válido.';
      if (normalizePhoneDigits(lead.whatsapp).length < 10) errors.whatsapp = 'Informe um WhatsApp com DDD.';
      if (!sanitizeInlineText(lead.company)) errors.company = 'Informe a empresa.';
      if (!sanitizeInlineText(lead.role)) errors.role = 'Informe seu cargo.';
    }

    return errors;
  }

  function goToStep(stepId) {
    state.currentStep = stepId;
    state.errors = {};
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    const errors = validateStep(state.currentStep);
    if (Object.keys(errors).length) {
      state.errors = errors;
      saveState();
      render();
      return;
    }

    const next = STEPS[getStepIndex() + 1];
    if (next) goToStep(next.id);
  }

  function goBack() {
    const previous = STEPS[getStepIndex() - 1];
    if (previous) goToStep(previous.id);
  }

  function resetSimulation() {
    const origin = readOrigin();
    state = defaultState();
    state.origin = origin;
    saveState();
    render();
  }

  function buildRdField(apiIdentifier, label, presentationType = 'TEXT_INPUT', dataType = 'STRING') {
    return {
      api_identifier: apiIdentifier,
      data_type: dataType,
      name: { value: label },
      label: { value: label },
      presentation_type: presentationType,
    };
  }

  function buildLeadPayload(result) {
    const submittedAt = new Date().toISOString();
    const payload = {
      nome: sanitizeInlineText(state.lead.name),
      email: sanitizeInlineText(state.lead.email).toLowerCase(),
      whatsapp: normalizePhoneE164(state.lead.whatsapp),
      empresa: sanitizeInlineText(state.lead.company),
      cargo: sanitizeInlineText(state.lead.role),
      tipo_organizacao_avaliada: entityTypeLabel(result.assessedEntityType),
      faixa_faturamento: result.revenueBand,
      classificacao_cenario: classificationLabel(result.scenarioClassification),
      grau_dano: String(result.damageDegree),
      percentual_agravantes: Math.round(result.aggravatingPercentage * 10000) / 100,
      percentual_atenuantes: Math.round(result.mitigatingPercentage * 10000) / 100,
      valor_final_estimado: result.estimatedFine,
      data_hora_simulacao: submittedAt,
      landing_page_origem: 'calculadora-anpd',
      utm_source: state.origin.utm_source || '',
      utm_medium: state.origin.utm_medium || '',
      utm_campaign: state.origin.utm_campaign || '',
      utm_term: state.origin.utm_term || '',
      utm_content: state.origin.utm_content || '',
      referrer: state.origin.referrer || '',
      page_url: state.origin.page_url || '',
    };

    if (config.sendExactRevenueToRd) {
      payload.faturamento_exato = result.revenue;
    }

    return payload;
  }

  function buildRdContactPayload(leadPayload) {
    return {
      email: leadPayload.email,
      name: leadPayload.nome,
      mobile_phone: leadPayload.whatsapp,
      company: leadPayload.empresa,
      job_title: leadPayload.cargo,
      cf_tipo_organizacao_avaliada: leadPayload.tipo_organizacao_avaliada,
      cf_faixa_faturamento: leadPayload.faixa_faturamento,
      cf_classificacao_cenario: leadPayload.classificacao_cenario,
      cf_grau_dano: leadPayload.grau_dano,
      cf_percentual_agravantes: String(leadPayload.percentual_agravantes),
      cf_percentual_atenuantes: String(leadPayload.percentual_atenuantes),
      cf_valor_final_estimado: String(leadPayload.valor_final_estimado),
      cf_landing_page_origem: leadPayload.landing_page_origem,
      cf_utm_source: leadPayload.utm_source,
      cf_utm_medium: leadPayload.utm_medium,
      cf_utm_campaign: leadPayload.utm_campaign,
      cf_utm_term: leadPayload.utm_term,
      cf_utm_content: leadPayload.utm_content,
      tags: ['calculadora-anpd', 'dosimetria-anpd'],
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

    const response = await fetch(config.rdFieldsEndpoint || RD_FIELDS_ENDPOINT, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new Error('Não foi possível consultar campos personalizados no RD Station.');
    const data = await response.json();
    const existing = new Set((Array.isArray(data) ? data : data?.fields || []).map((field) => field.api_identifier));

    for (const field of RD_CUSTOM_FIELDS) {
      if (existing.has(field.api_identifier)) continue;
      const createResponse = await fetch(config.rdFieldsEndpoint || RD_FIELDS_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(field),
      });
      if (!createResponse.ok) throw new Error(`Não foi possível criar o campo ${field.api_identifier}.`);
    }
  }

  function sendViaTrackingCode(leadPayload) {
    try {
      if (!window.RdIntegration || typeof window.RdIntegration.post !== 'function') return false;
      const fields = [
        ['identificador', 'calculadora-anpd'],
        ['nome', leadPayload.nome],
        ['email', leadPayload.email],
        ['telefone', leadPayload.whatsapp],
        ['empresa', leadPayload.empresa],
        ['cargo', leadPayload.cargo],
        ['cf_tipo_organizacao_avaliada', leadPayload.tipo_organizacao_avaliada],
        ['cf_faixa_faturamento', leadPayload.faixa_faturamento],
        ['cf_classificacao_cenario', leadPayload.classificacao_cenario],
        ['cf_grau_dano', leadPayload.grau_dano],
        ['cf_percentual_agravantes', String(leadPayload.percentual_agravantes)],
        ['cf_percentual_atenuantes', String(leadPayload.percentual_atenuantes)],
        ['cf_valor_final_estimado', String(leadPayload.valor_final_estimado)],
        ['cf_landing_page_origem', leadPayload.landing_page_origem],
        ['cf_utm_source', leadPayload.utm_source],
        ['cf_utm_medium', leadPayload.utm_medium],
        ['cf_utm_campaign', leadPayload.utm_campaign],
        ['cf_utm_term', leadPayload.utm_term],
        ['cf_utm_content', leadPayload.utm_content],
        ['landing_page_origem', leadPayload.landing_page_origem],
        ['referrer', leadPayload.referrer],
        ['page_url', leadPayload.page_url],
      ].map(([name, value]) => ({ name, value }));
      window.RdIntegration.post(fields);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function sendLeadToRdStation(leadPayload) {
    const rdPayload = buildRdContactPayload(leadPayload);

    if (sendViaTrackingCode(leadPayload)) {
      return { mode: 'tracking-code', rdPayload };
    }

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
      if (!response.ok) throw new Error('Falha ao enviar contato para o RD Station.');
      return { mode: 'direct', rdPayload };
    }

    if (config.rdAdapterUrl) {
      const response = await fetch(config.rdAdapterUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: leadPayload,
          rd_payload: rdPayload,
          simulation_summary: {
            tipo_organizacao_avaliada: leadPayload.tipo_organizacao_avaliada,
            faixa_faturamento: leadPayload.faixa_faturamento,
            classificacao_cenario: leadPayload.classificacao_cenario,
            grau_dano: leadPayload.grau_dano,
            percentual_agravantes: leadPayload.percentual_agravantes,
            percentual_atenuantes: leadPayload.percentual_atenuantes,
            valor_final_estimado: leadPayload.valor_final_estimado,
            data_hora_simulacao: leadPayload.data_hora_simulacao,
          },
          origin: {
            landing_page_origem: leadPayload.landing_page_origem,
            utm_source: leadPayload.utm_source,
            utm_medium: leadPayload.utm_medium,
            utm_campaign: leadPayload.utm_campaign,
            utm_term: leadPayload.utm_term,
            utm_content: leadPayload.utm_content,
            referrer: leadPayload.referrer,
            page_url: leadPayload.page_url,
          },
        }),
      });
      if (!response.ok) throw new Error('Falha ao enviar contato pelo adaptador do RD Station.');
      return { mode: 'adapter', rdPayload };
    }

    throw new Error('Integração RD Station aguardando configuração.');
  }

  function queueLeadForSync(leadPayload) {
    const queueItem = {
      id: `${leadPayload.email || 'lead'}-${Date.now()}`,
      lead: leadPayload,
      attempts: 0,
      queuedAt: new Date().toISOString(),
      lastError: '',
    };
    state.rdQueue = [...(state.rdQueue || []), queueItem];
    state.rdStatus = 'Contato preparado para envio ao RD Station.';
    saveState();
    emitEvent('lead_queued', { email: leadPayload.email, source: 'calculadora-anpd' });
    processPendingRdQueue();
  }

  async function processPendingRdQueue() {
    if (!state.rdQueue?.length) return;
    const pending = [...state.rdQueue];
    const nextQueue = [];

    for (const item of pending) {
      try {
        await sendLeadToRdStation(item.lead);
        state.rdStatus = 'Contato e resumo enviados ao RD Station.';
        emitEvent('lead_rd_synced', { email: item.lead.email, source: 'calculadora-anpd' });
      } catch (error) {
        nextQueue.push({
          ...item,
          attempts: Number(item.attempts || 0) + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: error.message || 'Falha de integração',
        });
        state.rdStatus = error.message || 'Integração RD pendente.';
      }
    }

    state.rdQueue = nextQueue;
    saveState();
    if (state.currentStep === 'result') render();
  }

  function emitEvent(type, payload) {
    const detail = {
      type,
      payload: payload || {},
      timestamp: new Date().toISOString(),
    };
    try {
      document.dispatchEvent(new CustomEvent('calculadora-anpd:event', { detail }));
    } catch (error) {
      // noop
    }
    try {
      if (typeof config.productEventHook === 'function') {
        config.productEventHook(detail);
      } else if (config.productEventHook) {
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

  function render() {
    const result = getSimulationResultOrNull();
    root.innerHTML = `
      ${renderHeader()}
      <main class="app-shell">
        ${renderIntro()}
        ${renderStepper()}
        ${renderCurrentStep(result)}
      </main>
      ${renderFloatingWhatsAppButton()}
    `;
  }

  function renderHeader() {
    return `
      <header class="topbar">
        <div class="topbar__inner">
          <a class="brand" href="../" aria-label="Voltar para a central Active Solutions">
            <img src="../nave/MVP1/assets/logo-active-negative.jpg" alt="" />
            <span>
              <strong>Active Solutions</strong>
              <small>Calculadora de dosimetria ANPD</small>
            </span>
          </a>
          <a class="topbar__link" href="../">Voltar para a central</a>
        </div>
      </header>
    `;
  }

  function renderIntro() {
    return `
      <section class="page-intro">
        <div class="page-intro__copy">
          <span class="eyebrow">Calculadora ANPD</span>
          <h1>Estimativa técnica de multa administrativa.</h1>
          <p>
            Simule um cenário com a metodologia de dosimetria da Resolução CD/ANPD nº 4/2023.
            O cálculo é local, didático e baseado apenas nos dados informados por você.
          </p>
        </div>
        <aside class="intro-note">
          <p>
            Use dados aproximados ou simulados. Não insira informações pessoais de titulares nem
            detalhes confidenciais de incidentes reais.
          </p>
        </aside>
      </section>
    `;
  }

  function renderStepper() {
    const activeIndex = getStepIndex();
    return `
      <nav class="stepper" aria-label="Etapas da calculadora">
        ${STEPS.map(
          (step, index) => `
            <div class="stepper__item ${index === activeIndex ? 'is-active' : ''} ${index < activeIndex ? 'is-complete' : ''}">
              <span class="stepper__dot">${index + 1}</span>
              <span class="stepper__label">${escapeHtml(step.label)}</span>
            </div>
          `
        ).join('')}
      </nav>
    `;
  }

  function renderCurrentStep(result) {
    if (state.currentStep === 'privacy') return renderPrivacyNoticeCard();
    if (state.currentStep === 'organization') return renderOrganizationStep();
    if (state.currentStep === 'classification') return renderClassificationStep();
    if (state.currentStep === 'damage') return renderDamageStep();
    if (state.currentStep === 'aggravating') return renderAggravatingStep();
    if (state.currentStep === 'mitigating') return renderMitigatingStep();
    if (state.currentStep === 'lead') return renderLeadStep(result);
    return renderResultStep(result || getSimulationResult());
  }

  function renderCardHeader(eyebrow, title, text) {
    return `
      <div class="calculator-card__header">
        <div>
          <span class="eyebrow">${escapeHtml(eyebrow)}</span>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }

  function renderPrivacyNoticeCard() {
    return `
      <section class="calculator-card" aria-labelledby="privacy-title">
        <div class="calculator-card__header">
          <div>
            <span class="eyebrow">Antes de começar</span>
            <h2 id="privacy-title">Antes de começar</h2>
          </div>
        </div>
        <div class="privacy-copy">
          <p>
            Esta calculadora realiza uma simulação estimativa de multa com base nos dados informados por você.
            Para melhorar nosso atendimento e entender o interesse neste conteúdo, poderemos registrar seus
            dados de contato, a origem da visita e um resumo do resultado da simulação no RD Station Marketing
            da Active Solutions.
          </p>
          <p>
            Não informe dados pessoais sensíveis, dados reais de titulares, documentos pessoais ou detalhes
            confidenciais de incidentes. Use valores aproximados ou cenários simulados sempre que possível.
          </p>
          <p>Este resultado não substitui análise jurídica, parecer técnico ou decisão da ANPD.</p>
        </div>
        <div class="actions">
          <span></span>
          <div class="actions__right">
            <a class="secondary-button" href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Falar com um especialista</a>
            <button class="primary-button" type="button" data-action="accept-privacy">Entendi e quero continuar</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderOrganizationStep() {
    const sim = state.simulation;
    const isRevenueType = sim.assessedEntityType === 'legal_with_revenue';
    return `
      <section class="calculator-card" aria-labelledby="organization-title">
        ${renderCardHeader(
          'Dados mínimos da organização avaliada',
          'Informe os dados da organização avaliada',
          'Esses campos existem apenas para calcular a estimativa e reduzir exposição desnecessária de dados.'
        )}
        <div class="form-grid">
          <div class="field field--full ${state.errors.assessedEntityType ? 'has-error' : ''}">
            <span class="field__label">Tipo de organização avaliada</span>
            <div class="option-grid">
              ${renderEntityOption('legal_with_revenue', 'Pessoa jurídica com faturamento', 'Usa faturamento bruto, tributos e alíquota-base.')}
              ${renderEntityOption('natural_person', 'Pessoa natural', 'Usa a tabela de valores absolutos por classificação e dano.')}
              ${renderEntityOption('legal_without_revenue', 'Pessoa jurídica sem faturamento', 'Usa a tabela de valores absolutos por classificação e dano.')}
            </div>
            <span class="field__error">${escapeHtml(state.errors.assessedEntityType || '')}</span>
          </div>

          ${isRevenueType ? renderCurrencyField('revenue', 'Faturamento bruto no último exercício', 'Informe valor aproximado. O valor exato fica no navegador e o RD recebe apenas a faixa de faturamento.') : ''}
          ${isRevenueType ? renderCurrencyField('taxes', 'Tributos incidentes', 'Informe os tributos aproximados que devem ser excluídos da base de cálculo.') : ''}
          ${renderCurrencyField('economicAdvantage', 'Vantagem econômica auferida ou pretendida, se estimável', 'Campo opcional. Use zero se não for possível estimar com segurança.')}
        </div>
        <details>
          <summary>Por que perguntamos isso?</summary>
          <p>
            A metodologia usa caminhos diferentes para pessoa jurídica com faturamento e para cenários sem faturamento.
            A vantagem econômica, quando estimável, pode elevar o limite mínimo da multa simulada.
          </p>
        </details>
        ${renderActions()}
      </section>
    `;
  }

  function renderEntityOption(value, title, description) {
    const selected = state.simulation.assessedEntityType === value;
    return `
      <button class="option-card ${selected ? 'is-selected' : ''}" type="button" data-action="select-entity" data-value="${value}">
        <span>${selected ? 'Selecionado' : 'Opção'}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </button>
    `;
  }

  function renderCurrencyField(field, label, hint) {
    const value = getPath(state.simulation, field) || '';
    const error = state.errors[field] || '';
    return `
      <div class="field ${error ? 'has-error' : ''}">
        <label for="${field}">${escapeHtml(label)}</label>
        <div class="currency-control">
          <span>R$</span>
          <input
            id="${field}"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            data-simulation-field="${field}"
            value="${escapeHtml(value)}"
            aria-invalid="${error ? 'true' : 'false'}"
          />
        </div>
        <span class="field__hint">${escapeHtml(hint)}</span>
        <span class="field__error">${escapeHtml(error)}</span>
      </div>
    `;
  }

  function renderClassificationStep() {
    return `
      <section class="calculator-card" aria-labelledby="classification-title">
        ${renderCardHeader(
          'Classifique o cenário',
          'Classifique o cenário',
          'Escolha a opção que melhor representa a situação analisada, usando linguagem simples e conservadora.'
        )}
        <div class="field ${state.errors.scenarioClassification ? 'has-error' : ''}">
          <div class="option-grid">
            ${renderClassificationOption('leve', 'Leve', 'Quando não houver enquadramento como média ou grave.')}
            ${renderClassificationOption('media', 'Média', 'Quando puder afetar significativamente interesses e direitos fundamentais dos titulares.')}
            ${renderClassificationOption(
              'grave',
              'Grave',
              'Quando houver hipótese média com fator adicional, como larga escala, vantagem econômica, risco à vida, dados sensíveis, ausência de hipótese legal, efeitos discriminatórios, práticas irregulares sistemáticas ou obstrução à fiscalização.'
            )}
          </div>
          <span class="field__error">${escapeHtml(state.errors.scenarioClassification || '')}</span>
        </div>
        <details>
          <summary>Por que perguntamos isso?</summary>
          <p>
            A classificação define a faixa de alíquota ou de valores absolutos usada no cálculo do valor-base.
          </p>
        </details>
        ${renderActions()}
      </section>
    `;
  }

  function renderClassificationOption(value, title, description) {
    const selected = state.simulation.scenarioClassification === value;
    return `
      <button class="option-card ${selected ? 'is-selected' : ''}" type="button" data-action="select-classification" data-value="${value}">
        <span>${selected ? 'Selecionado' : 'Cenário'}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </button>
    `;
  }

  function renderDamageStep() {
    const descriptions = {
      0: 'Sem dano ou dano insignificante.',
      1: 'Dano limitado, reversível ou de baixa repercussão.',
      2: 'Dano relevante, material ou moral, sem se enquadrar nos graus 0, 1 ou 3.',
      3: 'Dano grave, difícil reversão, discriminação, fraude, impacto à imagem, reputação, integridade ou obstrução relevante à atuação da ANPD.',
    };

    return `
      <section class="calculator-card" aria-labelledby="damage-title">
        ${renderCardHeader(
          'Simule o grau de dano',
          'Simule o grau de dano',
          'O grau do dano varia de 0 a 3 e movimenta a alíquota ou o valor-base dentro da faixa da classificação.'
        )}
        <div class="field ${state.errors.damageDegree ? 'has-error' : ''}">
          <div class="option-grid option-grid--four">
            ${Object.entries(descriptions)
              .map(([degree, description]) => renderDamageOption(degree, description))
              .join('')}
          </div>
          <span class="field__error">${escapeHtml(state.errors.damageDegree || '')}</span>
        </div>
        <details>
          <summary>Por que perguntamos isso?</summary>
          <p>
            O grau do dano é aplicado diretamente nas fórmulas da Resolução para chegar ao valor-base.
          </p>
        </details>
        ${renderActions()}
      </section>
    `;
  }

  function renderDamageOption(degree, description) {
    const selected = String(state.simulation.damageDegree) === String(degree);
    return `
      <button class="option-card ${selected ? 'is-selected' : ''}" type="button" data-action="select-damage" data-value="${degree}">
        <span>Grau ${degree}</span>
        <strong>${degree}</strong>
        <p>${escapeHtml(description)}</p>
      </button>
    `;
  }

  function renderAggravatingStep() {
    const total = dosimetry.calculateAggravatingPercentage(state.simulation.aggravatingFactors);
    return `
      <section class="calculator-card" aria-labelledby="aggravating-title">
        ${renderCardHeader(
          'Agravantes',
          'Informe agravantes, se existirem',
          'Use quantidade zero quando o fator não se aplicar. Os limites por fator são aplicados automaticamente.'
        )}
        <div class="counter-grid">
          ${renderCounter('aggravatingFactors.specificRecidivism', 'Reincidência específica', '+10% por caso, limite de 40%')}
          ${renderCounter('aggravatingFactors.genericRecidivism', 'Reincidência genérica', '+5% por caso, limite de 20%')}
          ${renderCounter('aggravatingFactors.orientationOrPreventiveMeasure', 'Medida de orientação ou preventiva descumprida', '+20% por medida, limite de 80%')}
          ${renderCounter('aggravatingFactors.correctiveMeasure', 'Medida corretiva descumprida', '+30% por medida, limite de 90%')}
        </div>
        <div class="live-total">
          <span>Total de agravantes</span>
          <strong>${formatPercent(total)}</strong>
        </div>
        <details>
          <summary>Por que perguntamos isso?</summary>
          <p>
            A soma dos agravantes entra na fórmula como decimal. Por exemplo, 30% é usado como 0,30.
          </p>
        </details>
        ${renderActions()}
      </section>
    `;
  }

  function renderCounter(path, title, description) {
    const value = Number(getPath(state.simulation, path) || 0);
    return `
      <article class="counter-card">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(description)}</p>
        </div>
        <div class="counter-control">
          <button type="button" data-action="decrement" data-field="${path}" aria-label="Reduzir ${escapeHtml(title)}">-</button>
          <input type="number" min="0" step="1" data-simulation-field="${path}" value="${value}" aria-label="${escapeHtml(title)}" />
          <button type="button" data-action="increment" data-field="${path}" aria-label="Aumentar ${escapeHtml(title)}">+</button>
        </div>
      </article>
    `;
  }

  function renderMitigatingStep() {
    const total = dosimetry.calculateMitigatingPercentage(state.simulation.mitigatingFactors);
    return `
      <section class="calculator-card" aria-labelledby="mitigating-title">
        ${renderCardHeader(
          'Atenuantes',
          'Selecione atenuantes, se existirem',
          'Marque apenas fatores que façam sentido no cenário analisado. A soma entra no cálculo como percentual de redução.'
        )}
        <div class="checkbox-grid">
          <article class="checkbox-card">
            <strong>Cessação da situação analisada</strong>
            <div class="radio-stack">
              ${renderRadio('mitigatingFactors.cessationMoment', 'none', 'Não considerar')}
              ${renderRadio('mitigatingFactors.cessationMoment', 'before_preparatory', '75% se antes de procedimento preparatório pela ANPD')}
              ${renderRadio('mitigatingFactors.cessationMoment', 'after_preparatory_before_sanctioning', '50% se após procedimento preparatório e até processo administrativo sancionador')}
              ${renderRadio('mitigatingFactors.cessationMoment', 'after_sanctioning_before_first_decision', '30% se após processo administrativo sancionador e até decisão de primeira instância')}
            </div>
          </article>
          <article class="checkbox-card">
            <strong>Governança e mitigação</strong>
            <div class="radio-stack">
              ${renderCheckbox('mitigatingFactors.governanceProgram', '20% por política de boas práticas/governança ou mecanismos internos capazes de minimizar danos')}
              ${renderRadio('mitigatingFactors.mitigationMeasuresMoment', 'none', 'Não considerar medidas de reversão ou mitigação')}
              ${renderRadio('mitigatingFactors.mitigationMeasuresMoment', 'before_preparatory_or_sanctioning', '20% por medidas antes de procedimento preparatório ou processo administrativo sancionador')}
              ${renderRadio('mitigatingFactors.mitigationMeasuresMoment', 'after_preparatory_before_sanctioning', '10% por medidas após procedimento preparatório e até processo administrativo sancionador')}
              ${renderCheckbox('mitigatingFactors.cooperationOrGoodFaith', '5% por cooperação ou boa-fé')}
            </div>
          </article>
        </div>
        <div class="live-total">
          <span>Total de atenuantes</span>
          <strong>${formatPercent(total)}</strong>
        </div>
        <details>
          <summary>Por que perguntamos isso?</summary>
          <p>
            A soma das atenuantes reduz o valor-base ajustado. Se as reduções superarem o fator final, a calculadora zera o valor antes dos limites.
          </p>
        </details>
        ${renderActions('Calcular simulação')}
      </section>
    `;
  }

  function renderRadio(path, value, label) {
    const checked = getPath(state.simulation, path) === value;
    return `
      <label class="radio-row">
        <input type="radio" name="${path}" value="${value}" data-simulation-field="${path}" ${checked ? 'checked' : ''} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function renderCheckbox(path, label) {
    const checked = Boolean(getPath(state.simulation, path));
    return `
      <label class="checkbox-row">
        <input type="checkbox" data-simulation-field="${path}" ${checked ? 'checked' : ''} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function renderLeadStep(result) {
    if (!result) {
      return `
        <section class="calculator-card">
          ${renderCardHeader('Quase lá', 'Revise os dados da simulação', 'Ainda faltam dados para calcular o cenário.')}
          ${renderActions()}
        </section>
      `;
    }

    return `
      <section class="calculator-card" aria-labelledby="lead-title">
        ${renderCardHeader(
          'Dados de contato',
          'Sua simulação está pronta',
          'Preencha seus dados para visualizar a memória de cálculo completa e, se quiser, conversar com um especialista.'
        )}
        <div class="lead-gate">
          ${renderCalculationSummary(result, false)}
          <form class="form-grid" data-form="lead" novalidate>
            ${renderLeadField('name', 'Nome', 'text', 'name')}
            ${renderLeadField('email', 'Email', 'email', 'email')}
            ${renderLeadField('whatsapp', 'WhatsApp', 'tel', 'tel')}
            ${renderLeadField('company', 'Empresa', 'text', 'organization')}
            ${renderLeadField('role', 'Cargo', 'text', 'organization-title')}
            ${renderHiddenOriginFields()}
            <div class="field field--full">
              <span class="field__hint">
                Use dados aproximados ou simulados. Não insira informações pessoais de titulares nem detalhes confidenciais de incidentes reais.
              </span>
            </div>
            <div class="field field--full">
              <button class="primary-button" type="submit">Visualizar memória de cálculo</button>
            </div>
          </form>
        </div>
        ${renderActions(null, true)}
      </section>
    `;
  }

  function renderLeadField(field, label, type, autocomplete) {
    const error = state.errors[field] || '';
    const value = field === 'whatsapp' ? formatPhoneDisplay(state.lead[field]) : state.lead[field] || '';
    return `
      <div class="field ${error ? 'has-error' : ''}">
        <label for="lead-${field}">${escapeHtml(label)}</label>
        <input
          id="lead-${field}"
          type="${type}"
          autocomplete="${autocomplete}"
          data-lead-field="${field}"
          value="${escapeHtml(value)}"
          aria-invalid="${error ? 'true' : 'false'}"
        />
        <span class="field__error">${escapeHtml(error)}</span>
      </div>
    `;
  }

  function renderHiddenOriginFields() {
    const origin = state.origin;
    return `
      <input type="hidden" name="landing_page_origem" value="calculadora-anpd" />
      <input type="hidden" name="utm_source" value="${escapeHtml(origin.utm_source || '')}" />
      <input type="hidden" name="utm_medium" value="${escapeHtml(origin.utm_medium || '')}" />
      <input type="hidden" name="utm_campaign" value="${escapeHtml(origin.utm_campaign || '')}" />
      <input type="hidden" name="utm_term" value="${escapeHtml(origin.utm_term || '')}" />
      <input type="hidden" name="utm_content" value="${escapeHtml(origin.utm_content || '')}" />
      <input type="hidden" name="referrer" value="${escapeHtml(origin.referrer || '')}" />
    `;
  }

  function renderResultStep(result) {
    return `
      <section class="results-layout" aria-labelledby="result-title">
        ${renderCalculationSummary(result, true)}
        ${renderWarnings(result)}
        ${renderFormulaBreakdown(result)}
        <article class="disclaimer-card">
          <h3>Aviso de limitação</h3>
          <p>
            Este resultado é uma estimativa técnica baseada nos dados informados. A aplicação concreta de sanções depende de processo administrativo,
            contraditório, ampla defesa e decisão fundamentada da ANPD.
          </p>
        </article>
        <div class="actions">
          <button class="secondary-button secondary-button--dark" type="button" data-action="restart">Nova simulação</button>
          <div class="actions__right">
            <a class="secondary-button secondary-button--dark" href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Falar com especialista</a>
          </div>
        </div>
      </section>
    `;
  }

  function renderCalculationSummary(result, full) {
    return `
      <article class="summary-card" aria-labelledby="result-title">
        <div>
          <span class="summary-card__label">Resultado estimado da multa</span>
          <h2 id="result-title" class="summary-card__value">${formatCurrency(result.estimatedFine)}</h2>
        </div>
        <p>Esta simulação considera os dados informados por você.</p>
        <div class="summary-grid">
          <article class="metric-card">
            <span>Valor-base</span>
            <strong>${formatCurrency(result.baseValue)}</strong>
          </article>
          <article class="metric-card">
            <span>Valor antes dos limites</span>
            <strong>${formatCurrency(result.rawFine)}</strong>
          </article>
          <article class="metric-card">
            <span>Limite aplicado</span>
            <strong>${escapeHtml(appliedLimitLabel(result.appliedLimit))}</strong>
          </article>
          <article class="metric-card">
            <span>Limite mínimo aplicado</span>
            <strong>${formatCurrency(result.minFine)}</strong>
          </article>
          <article class="metric-card">
            <span>Limite máximo aplicado</span>
            <strong>${formatCurrency(result.maxFine)}</strong>
          </article>
          <article class="metric-card">
            <span>Agravantes / atenuantes</span>
            <strong>${formatPercent(result.aggravatingPercentage)} / ${formatPercent(result.mitigatingPercentage)}</strong>
          </article>
        </div>
        ${
          full
            ? `<span class="status-pill">${escapeHtml(state.rdStatus || 'Resumo preparado para integração RD Station.')}</span>`
            : ''
        }
      </article>
    `;
  }

  function appliedLimitLabel(value) {
    if (value === 'minimum') return 'Mínimo';
    if (value === 'maximum') return 'Máximo';
    return 'Nenhum';
  }

  function renderWarnings(result) {
    const warnings = [];
    if (result.warnings.adjustmentBelowZero) {
      warnings.push('As atenuantes superaram os agravantes e tornaram o fator final menor que zero. O valor antes dos limites foi considerado como zero.');
    }
    if (result.warnings.taxesExceedRevenue) {
      warnings.push('Os tributos informados superam o faturamento. A base líquida foi considerada como zero.');
    }
    if (result.warnings.boundsInconsistent) {
      warnings.push('O limite mínimo calculado ficou acima do limite máximo. Revise os valores informados antes de usar a estimativa.');
    }
    if (!warnings.length) return '';

    return `
      <div class="alert-card">
        ${warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join('')}
      </div>
    `;
  }

  function renderFormulaBreakdown(result) {
    const hasRevenue = result.assessedEntityType === 'legal_with_revenue';
    return `
      <div class="formula-grid">
        <article class="formula-card">
          <span class="formula-card__label">Memória de cálculo</span>
          <h3>Valor-base</h3>
          <ul class="formula-list">
            <li><code>Tipo</code>: ${escapeHtml(entityTypeLabel(result.assessedEntityType))}</li>
            <li><code>Classificação</code>: ${escapeHtml(classificationLabel(result.scenarioClassification))}</li>
            <li><code>GD</code>: ${escapeHtml(result.damageDegree)}</li>
            ${
              hasRevenue
                ? `
                  <li><code>A1 / A2</code>: ${formatAliquot(result.aliquotRange.a1)} / ${formatAliquot(result.aliquotRange.a2)}</li>
                  <li><code>A_base = ((A2 - A1) / 3) * GD + A1</code>: ${formatAliquot(result.baseAliquot)}</li>
                  <li><code>Faturamento - tributos</code>: ${formatCurrency(result.netRevenue)}</li>
                  <li><code>V_base = A_base * (Faturamento - Tributos)</code>: ${formatCurrency(result.baseValue)}</li>
                `
                : `
                  <li><code>V1 / V2</code>: ${formatCurrency(result.absoluteBaseRange.v1)} / ${formatCurrency(result.absoluteBaseRange.v2)}</li>
                  <li><code>V_base = ((V2 - V1) / 3) * GD + V1</code>: ${formatCurrency(result.baseValue)}</li>
                `
            }
          </ul>
        </article>
        <article class="formula-card">
          <span class="formula-card__label">Ajustes e limites</span>
          <h3>Valor final</h3>
          <ul class="formula-list">
            <li><code>Agravantes</code>: ${formatPercent(result.aggravatingPercentage)} (${formatPercent(result.aggravatingPercentage, 0).replace('%', '')} / 100)</li>
            <li><code>Atenuantes</code>: ${formatPercent(result.mitigatingPercentage)} (${formatPercent(result.mitigatingPercentage, 0).replace('%', '')} / 100)</li>
            <li><code>V_multa = V_base * (1 + Agravantes - Atenuantes)</code>: ${formatCurrency(result.rawFine)}</li>
            <li><code>V_min</code>: ${formatCurrency(result.minFine)}</li>
            <li><code>V_max</code>: ${formatCurrency(result.maxFine)}</li>
            <li><code>V_final</code>: ${formatCurrency(result.estimatedFine)}</li>
          </ul>
        </article>
      </div>
    `;
  }

  function renderActions(nextLabel = 'Continuar', backOnly = false) {
    return `
      <div class="actions">
        <button class="secondary-button" type="button" data-action="back" ${getStepIndex() === 0 ? 'disabled' : ''}>Voltar</button>
        ${
          backOnly
            ? '<span></span>'
            : `<div class="actions__right"><button class="primary-button" type="button" data-action="next">${escapeHtml(nextLabel)}</button></div>`
        }
      </div>
    `;
  }

  function renderFloatingWhatsAppButton() {
    return `
      <a class="floating-whatsapp" href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" aria-label="Falar com especialista pelo WhatsApp">
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M16 3.5c-6.9 0-12.5 5.4-12.5 12.1 0 2.2.6 4.3 1.8 6.2L3.5 28l6.4-1.7c1.8.9 3.9 1.4 6.1 1.4 6.9 0 12.5-5.4 12.5-12.1S22.9 3.5 16 3.5Zm0 21.9c-1.9 0-3.7-.5-5.2-1.4l-.4-.2-3.8 1 1-3.6-.2-.4c-1.1-1.6-1.6-3.4-1.6-5.3 0-5.4 4.6-9.8 10.2-9.8s10.2 4.4 10.2 9.8-4.6 9.9-10.2 9.9Zm5.8-7.4c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.3.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.8.6.8.2 1.5.2 2 .1.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.7-.3Z" />
        </svg>
        <span>
          <strong>WhatsApp</strong>
          <small>Falar com especialista</small>
        </span>
      </a>
    `;
  }

  function bindEvents() {
    root.addEventListener('click', handleClick);
    root.addEventListener('input', handleInput);
    root.addEventListener('change', handleChange);
    root.addEventListener('submit', handleSubmit);
    window.addEventListener('online', processPendingRdQueue);
  }

  function handleClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'accept-privacy') {
      state.privacyAccepted = true;
      goToStep('organization');
      return;
    }

    if (action === 'back') {
      goBack();
      return;
    }

    if (action === 'next') {
      goNext();
      return;
    }

    if (action === 'restart') {
      resetSimulation();
      return;
    }

    if (action === 'select-entity') {
      state.simulation.assessedEntityType = target.dataset.value;
      state.errors = {};
      saveState();
      render();
      return;
    }

    if (action === 'select-classification') {
      state.simulation.scenarioClassification = target.dataset.value;
      state.errors = {};
      saveState();
      render();
      return;
    }

    if (action === 'select-damage') {
      state.simulation.damageDegree = target.dataset.value;
      state.errors = {};
      saveState();
      render();
      return;
    }

    if (action === 'increment' || action === 'decrement') {
      const path = target.dataset.field;
      const current = Number(getPath(state.simulation, path) || 0);
      setPath(state.simulation, path, Math.max(0, current + (action === 'increment' ? 1 : -1)));
      saveState();
      render();
    }
  }

  function handleInput(event) {
    const simulationField = event.target.closest('[data-simulation-field]');
    const leadField = event.target.closest('[data-lead-field]');

    if (simulationField) {
      const input = simulationField;
      const path = input.dataset.simulationField;
      const value = input.type === 'checkbox' ? input.checked : input.value;
      setPath(state.simulation, path, value);
      saveState();
    }

    if (leadField) {
      const input = leadField;
      const field = input.dataset.leadField;
      state.lead[field] = field === 'whatsapp' ? normalizePhoneDigits(input.value) : input.value;
      saveState();
    }
  }

  function handleChange(event) {
    const simulationField = event.target.closest('[data-simulation-field]');
    if (!simulationField) return;
    const input = simulationField;
    const path = input.dataset.simulationField;
    const value = input.type === 'checkbox' ? input.checked : input.value;
    setPath(state.simulation, path, value);
    state.errors = {};
    saveState();

    if (input.type === 'radio' || input.type === 'checkbox' || input.type === 'number') {
      render();
    }
  }

  function handleSubmit(event) {
    const form = event.target.closest('[data-form="lead"]');
    if (!form) return;
    event.preventDefault();

    form.querySelectorAll('[data-lead-field]').forEach((input) => {
      const field = input.dataset.leadField;
      state.lead[field] = field === 'whatsapp' ? normalizePhoneDigits(input.value) : input.value;
    });

    const errors = validateStep('lead');
    if (Object.keys(errors).length) {
      state.errors = errors;
      saveState();
      render();
      return;
    }

    const result = getSimulationResult();
    const leadPayload = buildLeadPayload(result);
    state.leadSubmitted = true;
    state.submittedAt = leadPayload.data_hora_simulacao;
    state.currentStep = 'result';
    state.errors = {};
    saveState();
    queueLeadForSync(leadPayload);
    render();
  }
})();
