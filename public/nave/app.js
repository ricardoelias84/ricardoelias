(function () {
  const content = window.NAVE_CONTENT;
  const app = document.getElementById('app');

  if (!content || !app) {
    return;
  }

  const config = window.NAVE_RUNTIME_CONFIG || {};
  const storageKey = 'nave-active-solutions-v2';
  const questions = content.questions.slice().sort((left, right) => left.order - right.order);
  const questionsById = Object.fromEntries(questions.map((item) => [item.id, item]));
  const checkpoints = (content.checkpoints || [])
    .slice()
    .sort(
      (left, right) =>
        (questionsById[left.questionIds[0]]?.order || 0) - (questionsById[right.questionIds[0]]?.order || 0)
    );
  const checkpointsById = Object.fromEntries(checkpoints.map((item) => [item.id, item]));
  const functionsByKey = Object.fromEntries(content.functions.map((item) => [item.key, item]));
  const capabilitiesByKey = Object.fromEntries(content.capabilities.map((item) => [item.key, item]));
  const servicesByKey = content.services;
  const scoreFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const mobileQuery =
    typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 760px)') : null;

  let state = loadState();

  function createSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `nave-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
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
      version: content.appMeta.dataVersion,
      screen: 'landing',
      sessionId: createSessionId(),
      profile: defaultProfile(),
      answers: {},
      currentQuestionIndex: 0,
      startedAt: null,
      completedAt: null,
      lastSavedAt: null,
      submissionQueue: [],
      sentStatuses: { started: false, completed: false },
      notice: null,
      modal: null,
      reviewOrigin: 'assessment',
      reportDirty: false,
      helpDrawers: {},
      serviceDetailKey: '',
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
      const next = {
        ...base,
        ...parsed,
        profile: { ...base.profile, ...(parsed.profile || {}) },
        answers: parsed.answers || {},
        sentStatuses: { ...base.sentStatuses, ...(parsed.sentStatuses || {}) },
        submissionQueue: Array.isArray(parsed.submissionQueue) ? parsed.submissionQueue : [],
        modal: null,
        reviewOrigin: parsed.reviewOrigin || 'assessment',
        reportDirty: Boolean(parsed.reportDirty),
        helpDrawers: parsed.helpDrawers && typeof parsed.helpDrawers === 'object' ? parsed.helpDrawers : {},
      };
      if (next.screen === 'results' && !isAssessmentComplete(next.answers)) {
        next.screen = 'assessment';
      }
      if (next.screen === 'review' && !isLeadReady(next.profile)) {
        next.screen = 'lead';
      }
      return next;
    } catch (error) {
      return defaultState();
    }
  }

  function saveState() {
    state.lastSavedAt = Date.now();
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...state,
        modal: null,
      })
    );
  }

  function persistAndRender() {
    saveState();
    render();
  }

  function resetState() {
    state = defaultState();
    persistAndRender();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function clampIndex(index) {
    return Math.min(Math.max(index, 0), questions.length - 1);
  }

  function getCurrentQuestion() {
    state.currentQuestionIndex = clampIndex(state.currentQuestionIndex);
    return questions[state.currentQuestionIndex];
  }

  function getQuestion(questionId) {
    return questionsById[questionId] || null;
  }

  function getQuestionIndex(questionId) {
    return questionsById[questionId] ? clampIndex(questionsById[questionId].order - 1) : 0;
  }

  function getCheckpointById(checkpointId) {
    return checkpointsById[checkpointId] || null;
  }

  function getCheckpointQuestions(checkpointId) {
    const checkpoint = getCheckpointById(checkpointId);
    return checkpoint ? checkpoint.questionIds.map((questionId) => questionsById[questionId]).filter(Boolean) : [];
  }

  function getCurrentCheckpoint() {
    const currentQuestion = getCurrentQuestion();
    return getCheckpointById(currentQuestion.checkpointId) || checkpoints[0] || null;
  }

  function getMissionCheckpoints(functionKey) {
    return checkpoints.filter((checkpoint) => checkpoint.functionKey === functionKey);
  }

  function getCheckpointStats(checkpointId, answers) {
    const checkpointQuestions = getCheckpointQuestions(checkpointId);
    const answered = checkpointQuestions.filter((question) => getAnswer(question.id, answers)).length;
    const highRiskCount = checkpointQuestions.filter((question) => {
      const answer = getAnswer(question.id, answers);
      return answer && (answer.selectedOption === 'A' || answer.selectedOption === 'B') && question.weight === 3;
    }).length;
    return {
      answered,
      total: checkpointQuestions.length,
      missing: checkpointQuestions.length - answered,
      highRiskCount,
      complete: checkpointQuestions.length > 0 && answered === checkpointQuestions.length,
    };
  }

  function getAnswerMap(answers) {
    return answers || state.answers;
  }

  function getAnswer(questionId, answers) {
    const answer = getAnswerMap(answers)[questionId];
    return answer && answer.selectedOption ? answer : null;
  }

  function getAnsweredCount(answers) {
    return questions.filter((question) => getAnswer(question.id, answers)).length;
  }

  function getCompletionPercent(answers) {
    return (getAnsweredCount(answers) / questions.length) * 100;
  }

  function isAssessmentComplete(answers) {
    return getAnsweredCount(answers) === questions.length;
  }

  function getMissionQuestions(functionKey) {
    return questions.filter((question) => question.primaryFunctionKey === functionKey);
  }

  function getMissionStats(functionKey) {
    const missionQuestions = getMissionQuestions(functionKey);
    const answered = missionQuestions.filter((question) => getAnswer(question.id)).length;
    const missionCheckpoints = getMissionCheckpoints(functionKey);
    const completedCheckpoints = missionCheckpoints.filter((checkpoint) =>
      getCheckpointStats(checkpoint.id).complete
    ).length;
    return {
      answered,
      total: missionQuestions.length,
      percent: missionQuestions.length ? (answered / missionQuestions.length) * 100 : 0,
      completedCheckpoints,
      totalCheckpoints: missionCheckpoints.length,
    };
  }

  function firstUnansweredIndex() {
    const index = questions.findIndex((question) => !getAnswer(question.id));
    return index === -1 ? questions.length - 1 : index;
  }

  function firstIncompleteCheckpointId(functionKey) {
    const list = functionKey ? getMissionCheckpoints(functionKey) : checkpoints;
    const target = list.find((checkpoint) => !getCheckpointStats(checkpoint.id).complete);
    return target ? target.id : list[0]?.id || checkpoints[0]?.id || '';
  }

  function getNextCheckpointId(checkpointId) {
    const index = checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
    return index === -1 ? '' : checkpoints[index + 1]?.id || '';
  }

  function getPreviousCheckpointId(checkpointId) {
    const index = checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
    return index <= 0 ? '' : checkpoints[index - 1]?.id || '';
  }

  function formatScore(value) {
    return Number.isFinite(value) ? scoreFormatter.format(value) : '—';
  }

  function formatPercent(value) {
    return `${integerFormatter.format(Math.round(value))}%`;
  }

  function scoreToPercent(value) {
    return (value / 4) * 100;
  }

  function formatTime(timestamp) {
    return timestamp ? timeFormatter.format(new Date(timestamp)) : 'agora';
  }

  function isMobileLayout() {
    return Boolean(mobileQuery && mobileQuery.matches);
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

  function getPhonePayloadValue() {
    return normalizePhoneDigits(state.profile.phone);
  }

  function getFirstName() {
    return String(state.profile.name || '').trim().split(/\s+/).filter(Boolean)[0] || '';
  }

  function getPersonalContextLine() {
    const parts = [];
    if (state.profile.role) {
      parts.push(state.profile.role);
    }
    if (state.profile.company) {
      parts.push(`na ${state.profile.company}`);
    }
    if (state.profile.size) {
      parts.push(`em uma empresa de ${state.profile.size.toLowerCase()}`);
    }
    return parts.join(' ');
  }

  function getLeadPersonalization() {
    const firstName = getFirstName();
    const contextLine = getPersonalContextLine();
    if (firstName && state.profile.role && state.profile.size) {
      return {
        title: `${firstName}, vamos calibrar a jornada para o seu contexto.`,
        body: `Usaremos o seu papel ${contextLine || 'atual'} para explicar melhor o assessment e deixar a leitura final mais consultiva.`,
      };
    }
    if (firstName || state.profile.role || state.profile.size) {
      return {
        title: `${firstName || 'Vamos'} montar uma leitura mais aderente a sua realidade.`,
        body: 'Com algumas informações de contexto, a experiência fica menos genérica e mais útil para quem decide.',
      };
    }
    return {
      title: 'Vamos personalizar a experiência antes de começar.',
      body: 'São poucos dados, mas eles ajudam a tornar a jornada mais consultiva, mais clara e mais relevante para o seu cenário.',
    };
  }

  function getMissionPersonalization(functionMeta) {
    const firstName = getFirstName();
    const contextLine = getPersonalContextLine();
    if (firstName && contextLine) {
      return `${firstName}, este checkpoint foi guiado para alguém ${contextLine}. O objetivo aqui é transformar o técnico em resposta segura de negócio.`;
    }
    if (state.profile.role || state.profile.size) {
      return 'Este checkpoint foi suavizado para uma leitura executiva, especialmente útil para quem precisa decidir sem mergulhar no detalhe técnico.';
    }
    return functionMeta.executiveSubtitle || functionMeta.heroText;
  }

  function getExecutivePersonaLine() {
    const role = String(state.profile.role || '').trim();
    const size = String(state.profile.size || '').trim();
    if (role && size) {
      return `Para uma liderança ${role.toLowerCase()} em uma empresa de ${size.toLowerCase()}, esta leitura prioriza clareza, contexto e decisão.`;
    }
    if (role) {
      return `Para quem atua como ${role.toLowerCase()}, esta leitura foi suavizada para apoiar decisão sem excesso de tecnicismo.`;
    }
    if (size) {
      return `Este conteúdo foi ajustado para uma leitura executiva, especialmente útil em empresas de ${size.toLowerCase()}.`;
    }
    return 'Esta leitura foi organizada para ajudar lideranças a responder com segurança, mesmo sem mergulhar no detalhe técnico.';
  }

  function getQuestionPersonalization(question) {
    const role = String(state.profile.role || '').trim();
    const size = String(state.profile.size || '').trim();
    if (role && size) {
      return `Para alguém em ${role} numa empresa de ${size.toLowerCase()}, este ponto costuma depender de TI, governança e dos donos do processo para validação final.`;
    }
    if (role) {
      return `Para ${role}, este ponto costuma ser respondido melhor quando a visão de negócio é combinada com a validação técnica adequada.`;
    }
    return `Se esta pergunta parecer técnica demais, tudo bem: ${question.whoCanAnswer.toLowerCase()} costuma ajudar bastante aqui.`;
  }

  function getBrandName() {
    return content.appMeta.name || 'N.A.V.E';
  }

  function getBrandSubtitle() {
    return `${content.appMeta.subtitle || ''} · By ${content.appMeta.company || 'Active Solutions'}`;
  }

  function getHelpDrawerState(questionId) {
    return state.helpDrawers[questionId] || '';
  }

  function toggleHelpDrawer(questionId, drawerKey) {
    const current = getHelpDrawerState(questionId);
    if (current === drawerKey) {
      delete state.helpDrawers[questionId];
    } else {
      state.helpDrawers[questionId] = drawerKey;
    }
    persistAndRender();
  }

  function buildWhatsAppMessage(extraContext) {
    const lines = [content.appMeta.specialistMessage];
    if (state.profile.name) {
      lines.push(`Nome: ${state.profile.name}`);
    }
    if (state.profile.company) {
      lines.push(`Empresa: ${state.profile.company}`);
    }
    if (extraContext) {
      lines.push(extraContext);
    }
    return lines.join('\n');
  }

  function buildWhatsAppUrl(extraContext) {
    const number = normalizePhoneDigits(config.specialistWhatsApp || '5511991559361');
    return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(extraContext))}`;
  }

  function isLeadReady(profile) {
    const subject = profile || state.profile;
    return ['name', 'role', 'email', 'company', 'size', 'segment'].every(
      (field) => String(subject[field] || '').trim() !== ''
    );
  }

  function getQuestionScore(question, answers) {
    const answer = getAnswer(question.id, answers);
    return answer ? Number(answer.score) : null;
  }

  function getWeightedAverage(questionList, answers) {
    let weightTotal = 0;
    let weightedScore = 0;
    questionList.forEach((question) => {
      const score = getQuestionScore(question, answers);
      if (!Number.isFinite(score)) {
        return;
      }
      weightTotal += question.weight;
      weightedScore += question.weight * score;
    });
    if (!weightTotal) {
      return null;
    }
    return weightedScore / weightTotal;
  }

  function getOverallScore(answers) {
    return getWeightedAverage(questions, answers) || 0;
  }

  function getFunctionMetrics(answers) {
    return Object.fromEntries(
      content.functions.map((item) => {
        const relatedQuestions = questions.filter((question) => question.functionKeys.includes(item.key));
        return [
          item.key,
          {
            key: item.key,
            meta: item,
            total: relatedQuestions.length,
            answered: relatedQuestions.filter((question) => getAnswer(question.id, answers)).length,
            score: getWeightedAverage(relatedQuestions, answers),
          },
        ];
      })
    );
  }

  function getCapabilityMetrics(answers) {
    return Object.fromEntries(
      content.capabilities.map((item) => {
        const relatedQuestions = questions.filter((question) => question.capabilities.includes(item.key));
        return [
          item.key,
          {
            key: item.key,
            meta: item,
            total: relatedQuestions.length,
            answered: relatedQuestions.filter((question) => getAnswer(question.id, answers)).length,
            score: getWeightedAverage(relatedQuestions, answers),
          },
        ];
      })
    );
  }

  function getMaturityBand(score) {
    return (
      content.maturityBands.find((item) => score >= item.min && score <= item.max) ||
      content.maturityBands[content.maturityBands.length - 1]
    );
  }

  function getHeatmapRows(answers) {
    return content.functions.map((fn) => ({
      meta: fn,
      cells: content.capabilities.map((capability) => {
        const relatedQuestions = questions.filter(
          (question) =>
            question.functionKeys.includes(fn.key) && question.capabilities.includes(capability.key)
        );
        return {
          functionKey: fn.key,
          capabilityKey: capability.key,
          score: getWeightedAverage(relatedQuestions, answers),
          total: relatedQuestions.length,
        };
      }),
    }));
  }

  function getPriorityGaps(limit, answers) {
    return questions
      .map((question) => {
        const answer = getAnswer(question.id, answers);
        if (!answer) {
          return null;
        }
        return {
          id: question.id,
          title: question.title,
          shortTitle: question.title.replace(/^Q\d+\s·\s/, ''),
          prompt: question.prompt,
          functionKeys: question.functionKeys,
          functionNames: question.functionKeys.map((key) => functionsByKey[key].label),
          capabilities: question.capabilities,
          capabilityNames: question.capabilityLabels,
          serviceKeys: question.serviceKeys,
          selectedOption: answer.selectedOption,
          score: Number(answer.score),
          weight: question.weight,
          evidence: answer.evidence || '',
          gapScore: question.weight * (4 - Number(answer.score)),
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.gapScore - left.gapScore || left.score - right.score)
      .slice(0, limit);
  }

  function getCapabilityBadges(answers) {
    const capabilityMetrics = getCapabilityMetrics(answers);
    return content.capabilities.map((capability) => {
      const score = capabilityMetrics[capability.key].score;
      let label = 'Prioridade alta';
      let tone = 'critical';
      if (score >= 3.7) {
        label = 'Domínio adaptativo';
        tone = 'elite';
      } else if (score >= 3) {
        label = 'Badge liberado';
        tone = 'strong';
      } else if (score >= 2) {
        label = 'Em evolução';
        tone = 'mid';
      }
      return { ...capability, score, tone, statusLabel: label, unlocked: score >= 3 };
    });
  }

  function getRecommendedServices(limit, answers) {
    const functionMetrics = getFunctionMetrics(answers);
    const capabilityMetrics = getCapabilityMetrics(answers);
    const gaps = getPriorityGaps(8, answers);
    const rankings = new Map();

    function bump(serviceKey, amount, gap, reason) {
      if (!servicesByKey[serviceKey] || !amount) {
        return;
      }
      const current = rankings.get(serviceKey) || {
        key: serviceKey,
        score: 0,
        functions: new Set(),
        capabilities: new Set(),
        gaps: new Set(),
        reasons: new Set(),
      };
      current.score += amount;
      if (gap) {
        gap.functionKeys.forEach((item) => current.functions.add(item));
        gap.capabilities.forEach((item) => current.capabilities.add(item));
        current.gaps.add(gap.id);
      }
      if (reason) {
        current.reasons.add(reason);
      }
      rankings.set(serviceKey, current);
    }

    gaps.forEach((gap, index) => {
      const multiplier = index < 3 ? 1.4 : 1;
      gap.serviceKeys.forEach((serviceKey) => bump(serviceKey, gap.gapScore * multiplier, gap, 'gaps'));
    });

    Object.values(functionMetrics).forEach((metric) => {
      if (!Number.isFinite(metric.score) || metric.score >= 2.8) {
        return;
      }
      (content.functionServiceMap[metric.key] || []).forEach((serviceKey) => {
        bump(serviceKey, (3 - metric.score) * 2.4, null, `função ${metric.meta.label}`);
      });
    });

    Object.values(capabilityMetrics).forEach((metric) => {
      if (!Number.isFinite(metric.score) || metric.score >= 3) {
        return;
      }
      metric.meta.serviceKeys.forEach((serviceKey) => {
        bump(serviceKey, (3.2 - metric.score) * 2.1, { id: metric.key, functionKeys: [], capabilities: [metric.key] }, `capacidade ${metric.meta.shortLabel}`);
      });
    });

    return Array.from(rankings.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((item) => ({
        ...servicesByKey[item.key],
        fitScore: item.score,
        relatedGaps: gaps.filter((gap) => item.gaps.has(gap.id)).slice(0, 3),
        relatedFunctions: Array.from(item.functions).map((key) => functionsByKey[key]?.label).filter(Boolean),
        relatedCapabilities: Array.from(item.capabilities)
          .map((key) => capabilitiesByKey[key]?.shortLabel)
          .filter(Boolean),
        reasons: Array.from(item.reasons),
      }));
  }

  function getRoadmap(answers) {
    const gaps = getPriorityGaps(6, answers);
    const services = getRecommendedServices(3, answers);
    const lowCapabilities = getCapabilityBadges(answers)
      .filter((item) => Number.isFinite(item.score))
      .sort((left, right) => left.score - right.score)
      .slice(0, 2);

    return [
      {
        phase: '30 dias',
        title: 'Fechar exposições mais sensíveis',
        items: gaps.slice(0, 2).map(
          (gap) =>
            `Atacar ${gap.shortTitle.toLowerCase()} com dono definido, prazo e evidência simples de execução.`
        ),
      },
      {
        phase: '60 dias',
        title: 'Dar padrão e escala ao que hoje depende de esforço manual',
        items: lowCapabilities.length
          ? lowCapabilities.map(
              (item) =>
                `Padronizar ${item.label.toLowerCase()} com processo, revisão periódica e apoio de ${item.serviceKeys
                  .map((key) => servicesByKey[key].name)
                  .slice(0, 2)
                  .join(' + ')}.`
            )
          : ['Consolidar processo, indicador e rotina de revisão para as capacidades mais críticas.'],
      },
      {
        phase: '90 dias',
        title: 'Testar, medir e transformar maturidade em vantagem operacional',
        items: [
          services.length
            ? `Transformar o diagnóstico em plano priorizado com apoio consultivo de ${services
                .map((service) => service.name)
                .slice(0, 2)
                .join(' e ')}.`
            : 'Transformar o diagnóstico em um plano priorizado de evolução trimestral.',
          'Executar teste de resposta e recuperação para validar se a operação volta rápida e com segurança mínima garantida.',
        ],
      },
    ];
  }

  function getNarrative(answers) {
    const overall = getOverallScore(answers);
    const band = getMaturityBand(overall);
    const functionMetrics = Object.values(getFunctionMetrics(answers)).filter((item) => Number.isFinite(item.score));
    const capabilityMetrics = Object.values(getCapabilityMetrics(answers)).filter((item) => Number.isFinite(item.score));
    const weakestFunction = functionMetrics.slice().sort((left, right) => left.score - right.score)[0];
    const strongestFunction = functionMetrics.slice().sort((left, right) => right.score - left.score)[0];
    const weakestCapability = capabilityMetrics.slice().sort((left, right) => left.score - right.score)[0];
    return [
      band.description,
      weakestFunction ? `Hoje o maior atrito aparece em ${weakestFunction.meta.label.toLowerCase()}` : '',
      weakestCapability ? `e na capacidade de ${weakestCapability.meta.label.toLowerCase()}.` : '.',
      strongestFunction
        ? `A base mais consistente está em ${strongestFunction.meta.label.toLowerCase()}, o que acelera a próxima etapa.`
        : '',
    ]
      .filter(Boolean)
      .join(' ')
      .replace(' .', '.');
  }

  function buildPayload(status) {
    const overall = getOverallScore();
    const band = getMaturityBand(overall);
    const functionMetrics = getFunctionMetrics();
    const capabilityMetrics = getCapabilityMetrics();
    return {
      status,
      lead: {
        nome: state.profile.name,
        cargo: state.profile.role,
        email: state.profile.email,
        empresa: state.profile.company,
        porte: state.profile.size,
        segmento: state.profile.segment,
        telefone: getPhonePayloadValue(),
      },
      session: {
        sessionId: state.sessionId,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        mode: 'complete',
        appVersion: config.appVersion || content.appMeta.dataVersion,
        source: config.rdSource,
        tag: config.rdTag,
      },
      answers: questions
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
        .filter(Boolean),
      scores: {
        overall,
        tier: band.tier,
        functionScores: Object.fromEntries(Object.values(functionMetrics).map((item) => [item.key, item.score])),
        capabilityScores: Object.fromEntries(Object.values(capabilityMetrics).map((item) => [item.key, item.score])),
      },
      priorityGaps: getPriorityGaps(6),
    };
  }

  async function postPayload(payload) {
    const url = String(config.rdAdapterUrl || '').trim();
    if (!url || typeof window.fetch !== 'function') {
      return false;
    }
    const response = await window.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  }

  function setNotice(tone, text) {
    state.notice = { tone, text };
  }

  async function flushPendingSubmissions(options) {
    const settings = options || {};
    if (flushPendingSubmissions.running || !state.submissionQueue.length) {
      return;
    }
    if (!String(config.rdAdapterUrl || '').trim() || typeof window.fetch !== 'function') {
      return;
    }
    flushPendingSubmissions.running = true;
    try {
      let mutated = false;
      const queue = state.submissionQueue.slice();
      for (const item of queue) {
        let success = false;
        try {
          success = await postPayload(item.payload);
        } catch (error) {
          success = false;
        }
        if (!success) {
          const pending = state.submissionQueue.find((entry) => entry.status === item.status);
          if (pending) {
            pending.attempts = (pending.attempts || 0) + 1;
            pending.lastAttemptAt = Date.now();
            mutated = true;
          }
          if (!settings.silent) {
            setNotice(
              'warning',
              'Não conseguimos enviar ao adapter agora. Seu progresso continua salvo localmente e pode ser reenviado nesta sessão.'
            );
          }
          break;
        }
        state.submissionQueue = state.submissionQueue.filter((entry) => entry.status !== item.status);
        state.sentStatuses[item.status] = true;
        mutated = true;
      }
      if (!state.submissionQueue.length && !settings.silent && mutated) {
        setNotice('success', 'Dados sincronizados com o adapter configurado.');
      }
      if (mutated) {
        persistAndRender();
      }
    } finally {
      flushPendingSubmissions.running = false;
    }
  }

  function queueSubmission(status) {
    state.submissionQueue = state.submissionQueue.filter((item) => item.status !== status);
    state.submissionQueue.push({
      status,
      payload: buildPayload(status),
      attempts: 0,
      createdAt: Date.now(),
    });
    if (!String(config.rdAdapterUrl || '').trim()) {
      setNotice(
        'muted',
        'Integração preparada para RD Station via adapter. Como o endpoint ainda não foi configurado, o progresso segue salvo localmente.'
      );
    }
    persistAndRender();
    flushPendingSubmissions({ silent: !String(config.rdAdapterUrl || '').trim() });
  }

  function getFeedbackForQuestion(question, answer) {
    if (!answer) {
      return null;
    }
    if ((answer.selectedOption === 'A' || answer.selectedOption === 'B') && question.weight === 3) {
      return { tone: 'critical', text: content.feedbackMessages.highRisk };
    }
    if (answer.selectedOption === 'A' || answer.selectedOption === 'B') {
      return { tone: 'warning', text: content.feedbackMessages.warning };
    }
    if (answer.selectedOption === 'C') {
      return { tone: 'mid', text: content.feedbackMessages.mid };
    }
    return { tone: 'strong', text: content.feedbackMessages.strong };
  }

  function openReview(origin) {
    state.reviewOrigin = origin || state.screen || 'assessment';
    state.screen = 'review';
    persistAndRender();
  }

  function navigateToQuestion(questionId) {
    if (!questionsById[questionId]) {
      return;
    }
    state.currentQuestionIndex = getQuestionIndex(questionId);
    state.screen = 'assessment';
    persistAndRender();
  }

  function navigateToCheckpoint(checkpointId) {
    const checkpointQuestions = getCheckpointQuestions(checkpointId);
    if (!checkpointQuestions.length) {
      return;
    }
    state.currentQuestionIndex = getQuestionIndex(checkpointQuestions[0].id);
    state.screen = 'assessment';
    persistAndRender();
  }

  function afterAnswerMutation(incompleteNotice) {
    if (state.completedAt || state.sentStatuses.completed) {
      if (!isAssessmentComplete()) {
        state.completedAt = null;
        state.reportDirty = true;
        state.sentStatuses.completed = false;
        state.submissionQueue = state.submissionQueue.filter((entry) => entry.status !== 'completed');
        setNotice(
          'warning',
          incompleteNotice || 'O relatório ficou em pausa até você concluir novamente as respostas pendentes.'
        );
        persistAndRender();
        return;
      }
      state.completedAt = Date.now();
      state.reportDirty = false;
      setNotice('success', 'Relatório atualizado com a resposta mais recente.');
      queueSubmission('completed');
      return;
    }
    persistAndRender();
  }

  function updateAnswer(questionId, selectedOption) {
    const question = getQuestion(questionId);
    if (!question) {
      return;
    }
    state.currentQuestionIndex = getQuestionIndex(questionId);
    state.answers[questionId] = {
      ...(state.answers[questionId] || {}),
      selectedOption,
      score: question.scoreMap[selectedOption],
      evidence: state.answers[questionId]?.evidence || '',
    };
    afterAnswerMutation(
      'Você alterou uma resposta. O relatório volta a ficar completo assim que todas as respostas estiverem preenchidas novamente.'
    );
  }

  function clearAnswer(questionId) {
    if (!state.answers[questionId]) {
      return;
    }
    delete state.answers[questionId];
    afterAnswerMutation('Você limpou uma resposta. Complete este ponto novamente para reabrir o relatório final.');
  }

  function resetMissionAnswers(functionKey) {
    getMissionQuestions(functionKey).forEach((question) => {
      delete state.answers[question.id];
    });
    state.modal = null;
    state.currentQuestionIndex = getQuestionIndex(getMissionQuestions(functionKey)[0]?.id || questions[0]?.id);
    afterAnswerMutation('A missão foi resetada. O relatório final será reaberto assim que a missão voltar a ficar completa.');
  }

  function restartAssessment(keepLead) {
    const preservedProfile = keepLead ? { ...state.profile } : defaultProfile();
    state = defaultState();
    state.profile = preservedProfile;
    state.screen = keepLead ? 'assessment' : 'lead';
    if (keepLead) {
      state.startedAt = Date.now();
      queueSubmission('started');
      return;
    }
    setNotice('warning', 'O assessment foi reiniciado do zero.');
    persistAndRender();
  }

  function finishAssessment() {
    state.completedAt = Date.now();
    state.reportDirty = false;
    state.screen = 'results';
    queueSubmission('completed');
  }

  function getSyncChip() {
    if (state.submissionQueue.length) {
      return { label: `Envio pendente (${state.submissionQueue.length})`, tone: 'warning' };
    }
    if (state.sentStatuses.completed) {
      return { label: 'Adapter sincronizado', tone: 'success' };
    }
    if (state.sentStatuses.started) {
      return { label: 'Lead salvo', tone: 'info' };
    }
    return { label: 'Jornada local ativa', tone: 'neutral' };
  }

  function getCheckpointRewardCopy(checkpointQuestions) {
    return checkpointQuestions[checkpointQuestions.length - 1]?.microRewardCopy || 'Seu relatório ganha mais precisão a cada checkpoint concluído.';
  }

  function getCheckpointLossCopy(checkpointQuestions) {
    return checkpointQuestions[checkpointQuestions.length - 1]?.lossIfSkippedCopy || 'Se você parar aqui, perde a leitura que já estava quase pronta para esta missão.';
  }

  function getLevelMeta() {
    const overall = getOverallScore();
    if (overall < 1) {
      return { level: 1, label: 'Base inicial', progress: 20 };
    }
    if (overall < 2) {
      return { level: 2, label: 'Blindagem emergente', progress: 45 };
    }
    if (overall < 3) {
      return { level: 3, label: 'Blindagem avançando', progress: 68 };
    }
    if (overall < 3.7) {
      return { level: 4, label: 'Operação consistente', progress: 84 };
    }
    return { level: 5, label: 'Postura adaptativa', progress: 100 };
  }

  function getReturnScreen() {
    if (state.reviewOrigin === 'results' && isAssessmentComplete()) {
      return 'results';
    }
    return 'assessment';
  }

  function renderAppModal() {
    if (state.serviceDetailKey) {
      return renderServiceModal();
    }
    if (!state.modal) {
      return '';
    }
    if (state.modal.type === 'reset-mission') {
      const functionMeta = functionsByKey[state.modal.functionKey];
      return `
        <div class="modal-overlay" data-action="close-modal">
          <div class="service-modal surface-card modal-dialog" role="dialog" aria-modal="true">
            <button class="modal-close" type="button" data-action="close-modal">×</button>
            <span class="eyebrow eyebrow-soft">Resetar missão</span>
            <h2>${escapeHtml(functionMeta?.label || 'Missão atual')}</h2>
            <p>Essa ação limpa apenas as respostas desta missão. Seu lead, sua sessão e as demais missões permanecem intactos.</p>
            <div class="modal-cta">
              <button class="btn btn-danger" type="button" data-action="confirm-reset-mission" data-function-key="${escapeHtml(state.modal.functionKey || '')}">Resetar missão atual</button>
              <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
            </div>
          </div>
        </div>
      `;
    }
    if (state.modal.type === 'reset-all') {
      return `
        <div class="modal-overlay" data-action="close-modal">
          <div class="service-modal surface-card modal-dialog" role="dialog" aria-modal="true">
            <button class="modal-close" type="button" data-action="close-modal">×</button>
            <span class="eyebrow eyebrow-soft">Reiniciar assessment</span>
            <h2>Escolha como reiniciar a jornada</h2>
            <p>Você pode começar uma nova sessão mantendo seus dados de lead ou apagar tudo e voltar ao início absoluto.</p>
            <div class="reset-choice-grid">
              <button class="reset-choice-card" type="button" data-action="reset-all-keep-lead">
                <strong>Manter lead</strong>
                <span>Gera uma nova sessão, preserva seu nome, cargo e empresa e já reabre o assessment desde a primeira missão.</span>
              </button>
              <button class="reset-choice-card danger" type="button" data-action="reset-all-clear-lead">
                <strong>Apagar lead também</strong>
                <span>Gera uma nova sessão, limpa respostas e contexto e volta para o formulário inicial.</span>
              </button>
            </div>
            <div class="modal-cta">
              <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
            </div>
          </div>
        </div>
      `;
    }
    return '';
  }

  function renderLogo(variant, className, altText) {
    const assets = content.appMeta.brandAssets || {};
    const source = variant === 'negative' ? assets.logoNegative : assets.logoColor;
    if (!source) {
      return '';
    }
    return `<img class="${className}" src="${source}" alt="${escapeHtml(altText || 'Active Solutions')}" />`;
  }

  function renderTopbar() {
    const syncChip = getSyncChip();
    return `
      <header class="topbar">
        <div class="brand-block">
          <div class="brand-mark brand-mark-logo">
            ${renderLogo('color', 'brand-logo brand-logo-color', 'Logo Active Solutions')}
          </div>
          <div>
            <div class="brand-kicker">${escapeHtml(content.appMeta.company)}</div>
            <div class="brand-title">${escapeHtml(getBrandName())}</div>
            <div class="brand-subtitle">${escapeHtml(getBrandSubtitle())}</div>
          </div>
        </div>
        <div class="chip-row">
          <span class="chip">${questions.length} perguntas</span>
          <span class="chip">${checkpoints.length} checkpoints</span>
          <span class="chip">${getAnsweredCount()}/${questions.length} respondidas</span>
          <span class="chip chip-${syncChip.tone}">${escapeHtml(syncChip.label)}</span>
        </div>
      </header>
    `;
  }

  function renderNotice() {
    if (!state.notice) {
      return '';
    }
    return `
      <div class="notice notice-${escapeHtml(state.notice.tone)}">
        <span>${escapeHtml(state.notice.text)}</span>
        <div class="notice-actions">
          ${state.submissionQueue.length ? '<button class="btn btn-ghost" data-action="retry-submissions">Tentar reenviar</button>' : ''}
          <button class="btn btn-ghost" data-action="close-notice">Fechar</button>
        </div>
      </div>
    `;
  }

  function renderSpecialistFab(extraContext) {
    return `
      <a class="specialist-fab" href="${buildWhatsAppUrl(extraContext)}" target="_blank" rel="noreferrer">
        <span class="specialist-fab-label">ajuda humana disponível</span>
        <strong>Falar com um especialista</strong>
      </a>
    `;
  }

  function renderLanding() {
    const progress = getCompletionPercent();
    const firstName = getFirstName();
    return `
      <div class="page-shell">
        ${renderTopbar()}
        <main class="page-content">
          ${renderNotice()}
          <section class="hero hero-landing">
            <div class="hero-copy surface-card surface-card-dark">
              <span class="eyebrow">N.A.V.E · By Active Solutions</span>
              <h1>${escapeHtml(firstName ? `${firstName}, esta avaliação foi desenhada para dar clareza sem pesar.` : 'Uma avaliação mais clara, respirada e útil para transformar maturidade em decisão.')}</h1>
              <p>${escapeHtml(content.appMeta.tagline)}</p>
              <div class="button-row">
                <button class="btn btn-primary" data-action="start-flow">${isLeadReady() ? 'Retomar jornada' : 'Começar assessment completo'}</button>
                <a class="btn btn-secondary" href="${buildWhatsAppUrl('Quero ajuda para iniciar o assessment N.A.V.E.')}" target="_blank" rel="noreferrer">Falar com especialista</a>
              </div>
              <div class="hero-highlights">
                <span>checkpoints leves</span>
                <span>revisão fácil</span>
                <span>relatório consultivo</span>
              </div>
              <div class="stats-row stats-row-compact">
                <article class="stat-card">
                  <strong>${checkpoints.length}</strong>
                  <span>checkpoints distribuídos nas 6 funções do CSF 2.0</span>
                </article>
                <article class="stat-card">
                  <strong>${formatPercent(progress)}</strong>
                  <span>da jornada pode ser retomada sem perda</span>
                </article>
              </div>
            </div>
            <aside class="hero-side surface-card">
              <div class="hero-brand-lockup">
                ${renderLogo('color', 'hero-brand-logo', 'Logo Active Solutions colorido')}
              </div>
              <span class="eyebrow eyebrow-soft">Como funciona</span>
              <h2>Você responde em blocos leves, revisa quando quiser e vê o relatório ganhar forma enquanto avança.</h2>
              <div class="landing-steps">
                <article>
                  <strong>1. Entramos no seu contexto</strong>
                  <span>Nome, cargo e porte ajudam a traduzir melhor o conteúdo para quem decide.</span>
                </article>
                <article>
                  <strong>2. Guiamos sem tecnicês desnecessário</strong>
                  <span>Cada checkpoint mostra o que importa, quem costuma saber responder e qual evidência ajuda.</span>
                </article>
                <article>
                  <strong>3. Transformamos em ação</strong>
                  <span>O relatório final mostra maturidade, prioridades e onde a Active pode acelerar a próxima etapa.</span>
                </article>
              </div>
              <div class="mission-preview mission-preview-compact">
                ${content.functions
                  .map(
                    (item) => `
                      <button class="mission-chip" type="button" data-jump-function="${item.key}">
                        <span>${escapeHtml(item.code)}</span>
                        <strong>${escapeHtml(item.label)}</strong>
                      </button>
                    `
                  )
                  .join('')}
              </div>
            </aside>
          </section>
          <section class="section-grid">
            ${content.functions
              .map(
                (item) => `
                  <article class="mission-card surface-card" style="--mission-accent:${item.accent}; --mission-soft:${item.accentSoft}; --mission-glow:${item.glow};">
                    <div class="mission-card-top">
                      <span class="eyebrow eyebrow-soft">${escapeHtml(item.code)}</span>
                      <span class="mission-code">${escapeHtml(item.heroBadge || item.code)}</span>
                    </div>
                    <h3>${escapeHtml(item.executiveTitle || item.label)}</h3>
                    <p>${escapeHtml(item.executiveSubtitle || item.heroText)}</p>
                    <span class="mission-note">${escapeHtml(item.rewardText || item.guidance)}</span>
                  </article>
                `
              )
              .join('')}
          </section>
        </main>
        ${renderSpecialistFab()}
      </div>
    `;
  }

  function renderLead() {
    const personalization = getLeadPersonalization();
    return `
      <div class="page-shell">
        ${renderTopbar()}
        <main class="page-content">
          ${renderNotice()}
          <section class="lead-layout">
            <article class="surface-card surface-card-dark lead-copy">
              <span class="eyebrow">Entrada leve</span>
              <h1>${escapeHtml(personalization.title)}</h1>
              <p>${escapeHtml(personalization.body)}</p>
              <div class="bonus-card">
                <strong>Bônus de início</strong>
                <span>Assim que você concluir esta etapa, o assessment já abre com checkpoint salvo e revisão disponível a qualquer momento.</span>
              </div>
              <div class="mini-points">
                <span>menos de 30 segundos</span>
                <span>telefone / WhatsApp opcional</span>
                <span>tom consultivo e executivo</span>
              </div>
            </article>
            <form class="surface-card lead-form" data-form="lead">
              <div class="form-intro">
                <strong>Vamos personalizar sua leitura</strong>
                <span>Quanto melhor entendermos o seu contexto, mais humana e útil fica a explicação ao longo da jornada.</span>
              </div>
              <div class="personal-note" data-personalized-preview>
                <strong>${escapeHtml(personalization.title)}</strong>
                <span>${escapeHtml(personalization.body)}</span>
              </div>
              <div class="field-grid">
                <label class="field">
                  <span>Nome</span>
                  <input data-profile-input="name" name="name" value="${escapeHtml(state.profile.name)}" placeholder="Seu nome completo" required />
                </label>
                <label class="field">
                  <span>Cargo</span>
                  <input data-profile-input="role" name="role" value="${escapeHtml(state.profile.role)}" placeholder="Ex.: CEO, CIO, Gerente de TI" required />
                </label>
                <label class="field field-wide">
                  <span>E-mail profissional</span>
                  <input data-profile-input="email" type="email" name="email" value="${escapeHtml(state.profile.email)}" placeholder="voce@empresa.com.br" required />
                </label>
                <label class="field field-wide">
                  <span>Empresa</span>
                  <input data-profile-input="company" name="company" value="${escapeHtml(state.profile.company)}" placeholder="Nome da organização" required />
                </label>
                <label class="field">
                  <span>Porte</span>
                  <select data-profile-input="size" name="size" required>
                    <option value="">Selecione</option>
                    ${[
                      'Até 50 colaboradores',
                      '51 a 200 colaboradores',
                      '201 a 500 colaboradores',
                      '501 a 1.000 colaboradores',
                      'Acima de 1.000 colaboradores',
                    ]
                      .map((value) => `<option value="${escapeHtml(value)}" ${state.profile.size === value ? 'selected' : ''}>${escapeHtml(value)}</option>`)
                      .join('')}
                  </select>
                </label>
                <label class="field">
                  <span>Segmento</span>
                  <select data-profile-input="segment" name="segment" required>
                    <option value="">Selecione</option>
                    ${[
                      'Tecnologia',
                      'Indústria',
                      'Saúde',
                      'Serviços',
                      'Varejo',
                      'Financeiro',
                      'Agro',
                      'Setor público',
                      'Outro',
                    ]
                      .map((value) => `<option value="${escapeHtml(value)}" ${state.profile.segment === value ? 'selected' : ''}>${escapeHtml(value)}</option>`)
                      .join('')}
                  </select>
                </label>
                <label class="field field-wide">
                  <span>Telefone / WhatsApp (opcional)</span>
                  <input data-profile-input="phone" name="phone" value="${escapeHtml(state.profile.phone)}" placeholder="(11) 99155-9361" inputmode="tel" />
                  <small>Se você quiser apoio durante o preenchimento ou no relatório, esse contato acelera a conversa.</small>
                </label>
              </div>
              <div class="button-row">
                <button type="button" class="btn btn-secondary" data-action="go-landing">Voltar</button>
                <button type="submit" class="btn btn-primary">${isLeadReady() ? 'Salvar contexto e continuar' : 'Começar missão 1'}</button>
              </div>
            </form>
          </section>
        </main>
        ${renderSpecialistFab()}
      </div>
    `;
  }

  function updateLeadPreviewDom() {
    const note = app.querySelector('[data-personalized-preview]');
    if (note) {
      const personalization = getLeadPersonalization();
      note.innerHTML = `
        <strong>${escapeHtml(personalization.title)}</strong>
        <span>${escapeHtml(personalization.body)}</span>
      `;
    }
    const submitButton = app.querySelector('[data-form="lead"] button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = isLeadReady() ? 'Salvar contexto e continuar' : 'Começar missão 1';
    }
  }

  function renderFunctionNav(currentMissionKey) {
    return `
      <div class="surface-card mission-nav">
        <div class="section-mini-head">
          <span class="eyebrow eyebrow-soft">Missões</span>
          <button class="btn btn-ghost btn-compact" type="button" data-action="open-review">Central de revisão</button>
        </div>
        ${content.functions
          .map((item) => {
            const stats = getMissionStats(item.key);
            const checkpointId = firstIncompleteCheckpointId(item.key) || getMissionCheckpoints(item.key)[0]?.id;
            return `
              <button class="mission-nav-item ${item.key === currentMissionKey ? 'is-current' : ''}" type="button" data-jump-checkpoint="${escapeHtml(checkpointId || '')}">
                <div>
                  <span>${escapeHtml(item.code)}</span>
                  <strong>${escapeHtml(item.label)}</strong>
                </div>
                <small>${stats.answered}/${stats.total}</small>
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function renderCheckpointRail(currentMission, currentCheckpoint) {
    return `
      <div class="surface-card checkpoint-rail">
        <div class="section-mini-head">
          <span class="eyebrow eyebrow-soft">Jornada</span>
          <span class="rail-caption">${escapeHtml(currentMission.shortLabel)}</span>
        </div>
        <div class="checkpoint-rail-list">
          ${getMissionCheckpoints(currentMission.key)
            .map((checkpoint) => {
              const stats = getCheckpointStats(checkpoint.id);
              const tone = stats.complete ? 'is-complete' : checkpoint.id === currentCheckpoint.id ? 'is-current' : '';
              return `
                <button class="checkpoint-rail-item ${tone}" type="button" data-jump-checkpoint="${checkpoint.id}">
                  <span class="checkpoint-rail-badge">${stats.complete ? '✓' : String(checkpoint.order).padStart(2, '0')}</span>
                  <div>
                    <strong>${escapeHtml(checkpoint.label)}</strong>
                    <span>${stats.answered}/${stats.total} respondidas</span>
                  </div>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  function renderQuestionCard(question, currentMission, isActiveMobile) {
    const answer = getAnswer(question.id);
    const feedback = getFeedbackForQuestion(question, answer);
    const drawer = getHelpDrawerState(question.id);
    return `
      <article class="surface-card checkpoint-question ${isActiveMobile ? 'is-mobile-active' : ''}" style="--mission-accent:${currentMission.accent};">
        <div class="checkpoint-question-head">
          <div>
            <span class="question-step">Pergunta ${question.orderInMission} de ${getMissionQuestions(currentMission.key).length}</span>
            <h2>${escapeHtml(question.uiPromptShort || question.businessPlainLanguage || question.prompt)}</h2>
            <p class="question-prompt">${escapeHtml(question.coachHint)}</p>
          </div>
          <div class="question-utility">
            <span class="question-code">${escapeHtml(question.id)}</span>
            <button class="mini-action" type="button" data-action="clear-question" data-question-id="${question.id}" ${answer ? '' : 'disabled'}>Limpar</button>
          </div>
        </div>
        <div class="question-personal-note">${escapeHtml(getQuestionPersonalization(question))}</div>
        <div class="question-tool-row">
          <button class="drawer-chip ${drawer === 'explain' ? 'is-active' : ''}" type="button" data-action="toggle-help" data-question-id="${question.id}" data-help-kind="explain">Me explica melhor</button>
          <button class="drawer-chip ${drawer === 'examples' ? 'is-active' : ''}" type="button" data-action="toggle-help" data-question-id="${question.id}" data-help-kind="examples">Pode me dar exemplos</button>
        </div>
        ${
          drawer
            ? `
              <div class="inline-drawer">
                ${
                  drawer === 'explain'
                    ? `
                      <div class="inline-drawer-grid">
                        <div class="help-card">
                          <span>O que estamos tentando entender aqui?</span>
                          <p>${escapeHtml(question.learnWhy)}</p>
                        </div>
                        <div class="help-card">
                          <span>Leitura executiva</span>
                          <p>${escapeHtml(question.businessPlainLanguage)}</p>
                        </div>
                      </div>
                    `
                    : `
                      <div class="inline-drawer-grid">
                        <div class="help-card">
                          <span>Quem costuma saber responder</span>
                          <p>${escapeHtml(question.whoCanAnswer)}</p>
                        </div>
                        <div class="help-card">
                          <span>Dica prática</span>
                          <p>${escapeHtml(question.learnTip)}</p>
                        </div>
                      </div>
                      ${
                        question.evidenceExamples.length
                          ? `<div class="pill-cloud">${question.evidenceExamples.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div>`
                          : ''
                      }
                    `
                }
              </div>
            `
            : ''
        }
        <div class="question-reassurance">${escapeHtml(question.coachReassurance)}</div>
        <div class="choice-grid checkpoint-choice-grid">
          ${question.optionKeys
            .map((optionKey) => {
              const optionMeta = content.answerScale[optionKey];
              return `
                <button type="button" class="choice-card ${answer && answer.selectedOption === optionKey ? 'is-selected' : ''}" data-option="${optionKey}" data-question-id="${question.id}">
                  <div class="choice-topline">
                    <span class="choice-letter">${escapeHtml(optionKey)}</span>
                    <span class="choice-status">${escapeHtml(optionMeta.label)}</span>
                  </div>
                  <strong>${escapeHtml(optionMeta.label)}</strong>
                  <p>${escapeHtml(question.options[optionKey])}</p>
                </button>
              `;
            })
            .join('')}
        </div>
        ${feedback ? `<div class="feedback-card feedback-${escapeHtml(feedback.tone)}">${escapeHtml(feedback.text)}</div>` : ''}
        ${
          answer && (answer.selectedOption === 'D' || answer.selectedOption === 'E')
            ? `
              <label class="evidence-box">
                <span>Se quiser, cite a evidência mais simples que comprova essa resposta.</span>
                <textarea data-evidence-input="${question.id}" placeholder="${escapeHtml(question.evidenceExpected)}">${escapeHtml(answer.evidence || '')}</textarea>
              </label>
            `
            : ''
        }
        <div class="question-footer-line">
          <span>Responda pela realidade de hoje, sem tentar “embelezar” o cenário.</span>
          <span>${escapeHtml(question.capabilityLabels.slice(0, 2).join(' · '))}</span>
        </div>
      </article>
    `;
  }

  function renderAssessmentLegacy() {
    const question = getCurrentQuestion();
    const currentMission = functionsByKey[question.primaryFunctionKey];
    const missionQuestions = getMissionQuestions(currentMission.key);
    const missionIndex = missionQuestions.findIndex((item) => item.id === question.id);
    const missionStats = getMissionStats(currentMission.key);
    const answer = getAnswer(question.id);
    const pending = questions.length - getAnsweredCount();
    const isLast = state.currentQuestionIndex === questions.length - 1;
    const nextAction = isLast ? (pending ? 'next-unanswered' : 'finish-assessment') : 'next-question';
    const nextLabel = isLast ? (pending ? `Faltam ${pending} respostas` : 'Revelar relatório') : 'Próxima pergunta';
    const feedback =
      !answer
        ? null
        : (answer.selectedOption === 'A' || answer.selectedOption === 'B') && question.weight === 3
        ? { tone: 'critical', text: content.feedbackMessages.highRisk }
        : answer.selectedOption === 'A' || answer.selectedOption === 'B'
        ? { tone: 'warning', text: content.feedbackMessages.warning }
        : answer.selectedOption === 'C'
        ? { tone: 'mid', text: content.feedbackMessages.mid }
        : { tone: 'strong', text: content.feedbackMessages.strong };
    const checkpointLabel =
      missionIndex === 0
        ? 'Abertura da missão'
        : missionIndex + 1 === missionQuestions.length
        ? 'Fechamento da missão'
        : missionIndex + 1 === Math.ceil(missionQuestions.length / 2)
        ? 'Checkpoint'
        : `Etapa ${missionIndex + 1}`;

    return `
      <div class="page-shell">
        ${renderTopbar()}
        <main class="page-content">
          ${renderNotice()}
          <section class="assessment-shell">
            <aside class="assessment-sidebar">
              <div class="surface-card sidebar-summary">
                <span class="eyebrow eyebrow-soft">Sua jornada</span>
                <strong>${getAnsweredCount()} de ${questions.length}</strong>
                <div class="progress-track"><div class="progress-bar" style="width:${getCompletionPercent()}%"></div></div>
                <span>${formatPercent(getCompletionPercent())} concluído</span>
                ${getAnsweredCount() < 3 ? '<div class="bonus-inline">Você já começou a desenhar o mapa de maturidade da empresa.</div>' : ''}
              </div>
              <div class="surface-card mission-nav">
                ${content.functions
                  .map((item) => {
                    const stats = getMissionStats(item.key);
                    return `
                      <button class="mission-nav-item ${item.key === currentMission.key ? 'is-current' : ''}" type="button" data-jump-function="${item.key}">
                        <div>
                          <span>${escapeHtml(item.code)}</span>
                          <strong>${escapeHtml(item.label)}</strong>
                        </div>
                        <small>${stats.answered}/${stats.total}</small>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </aside>
            <section class="assessment-stage">
              <article class="mission-hero surface-card" style="--mission-accent:${currentMission.accent}; --mission-soft:${currentMission.accentSoft}; --mission-glow:${currentMission.glow};">
                <div class="mission-hero-copy">
                  <span class="eyebrow">${escapeHtml(currentMission.missionLabel)} · ${escapeHtml(currentMission.label)}</span>
                  <h1>${escapeHtml(currentMission.label)}</h1>
                  <p>${escapeHtml(currentMission.heroText)}</p>
                </div>
                <div class="mission-hero-meta">
                  <div class="checkpoint-pill">${escapeHtml(checkpointLabel)}</div>
                  <div class="mission-progress-block">
                    <span>Missão ${missionIndex + 1}/${missionQuestions.length}</span>
                    <div class="progress-track"><div class="progress-bar" style="width:${missionStats.percent}%"></div></div>
                  </div>
                  <div class="mission-guidance">${escapeHtml(currentMission.guidance)}</div>
                </div>
              </article>
              <article class="surface-card question-card">
                <div class="question-top">
                  <div>
                    <span class="eyebrow eyebrow-soft">Pergunta ${question.order} de ${questions.length}</span>
                    <h2>${escapeHtml(question.uiPromptShort || question.prompt)}</h2>
                  </div>
                  <div class="question-badges">
                    <span class="question-badge">${escapeHtml(question.type)}</span>
                    <span class="question-badge">Peso ${question.weight}</span>
                  </div>
                </div>
                <p class="question-prompt">${escapeHtml(question.coachHint)}</p>
                <div class="question-meta-row">
                  <div class="pill-cloud">${question.capabilityLabels.slice(0, 2).map((label) => `<span class="pill">${escapeHtml(label)}</span>`).join('')}</div>
                  <span class="question-meta-inline">responda pela realidade de hoje</span>
                </div>
                <details class="learn-panel">
                  <summary>Ver ajuda para responder com mais segurança</summary>
                  <div class="learn-panel-body">
                    <p>${escapeHtml(question.learnWhy)}</p>
                    <p>${escapeHtml(question.learnTip)}</p>
                    <p><strong>Evidência simples:</strong> ${escapeHtml(question.evidenceExpected)}</p>
                    <p><strong>Pergunta completa:</strong> ${escapeHtml(question.prompt)}</p>
                  </div>
                </details>
                <div class="choice-grid">
                  ${question.optionKeys
                    .map((optionKey) => `
                      <button type="button" class="choice-card ${answer && answer.selectedOption === optionKey ? 'is-selected' : ''}" data-option="${optionKey}">
                        <div class="choice-topline">
                          <span class="choice-letter">${escapeHtml(optionKey)}</span>
                          <span class="choice-status">${escapeHtml(content.answerScale[optionKey].label)}</span>
                        </div>
                        <p>${escapeHtml(question.options[optionKey])}</p>
                      </button>
                    `)
                    .join('')}
                </div>
                ${feedback ? `<div class="feedback-card feedback-${escapeHtml(feedback.tone)}">${escapeHtml(feedback.text)}</div>` : ''}
                ${
                  answer && (answer.selectedOption === 'D' || answer.selectedOption === 'E')
                    ? `
                      <label class="evidence-box">
                        <span>Se quiser, cite a evidência mais simples que comprova essa resposta.</span>
                        <textarea data-evidence-input="${question.id}" placeholder="${escapeHtml(question.evidenceExpected)}">${escapeHtml(answer.evidence || '')}</textarea>
                      </label>
                    `
                    : ''
                }
                <div class="support-strip support-strip-light">
                  <div>
                    <span class="context-label">Quando este tema aparece como prioridade, costuma se conectar com</span>
                    <div class="pill-cloud">${question.serviceKeys.slice(0, 4).map((key) => `<span class="pill">${escapeHtml(servicesByKey[key].name)}</span>`).join('')}</div>
                  </div>
                </div>
              </article>
              <div class="button-row button-row-end">
                <button class="btn btn-secondary" type="button" data-action="prev-question" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>Anterior</button>
                <button class="btn btn-primary" type="button" data-action="${nextAction}" ${answer ? '' : 'disabled'}>${escapeHtml(nextLabel)}</button>
              </div>
            </section>
          </section>
        </main>
        ${renderSpecialistFab('Preciso de apoio para responder esta etapa do assessment.')}
      </div>
    `;
  }

  function renderResultsLegacy() {
    const overall = getOverallScore();
    const band = getMaturityBand(overall);
    const functionMetrics = Object.values(getFunctionMetrics());
    const capabilityBadges = getCapabilityBadges();
    const heatmap = getHeatmapRows();
    const gaps = getPriorityGaps(6);
    const roadmap = getRoadmap();
    const services = getRecommendedServices(4);
    const companyName = state.profile.company || 'sua empresa';

    return `
      <div class="page-shell">
        ${renderTopbar()}
        <main class="page-content">
          ${renderNotice()}
          <section class="results-hero report-section">
            <article class="surface-card surface-card-dark results-copy">
              <div class="results-brand-line">
                ${renderLogo('negative', 'results-logo', 'Logo Active Solutions negativo')}
                <span class="eyebrow">Relatório NAVE</span>
              </div>
              <h1>${escapeHtml(companyName)} está em ${escapeHtml(band.label)}.</h1>
              <p>${escapeHtml(getNarrative())}</p>
              <div class="button-row">
                <button class="btn btn-primary" data-action="export-report">Salvar em PDF</button>
                <button class="btn btn-secondary" data-action="review-answers">Revisar respostas</button>
                <a class="btn btn-secondary" href="${buildWhatsAppUrl('Quero discutir o relatório final do assessment NAVE.')}">Falar sobre o relatório</a>
              </div>
            </article>
            <aside class="surface-card score-card">
              <span class="eyebrow eyebrow-soft">Maturidade geral</span>
              <div class="score-ring" style="--score:${scoreToPercent(overall)}">
                <strong>${formatScore(overall)}</strong>
                <span>de 4,0</span>
              </div>
              <h2>${escapeHtml(band.tierLabel)}</h2>
              <p>${escapeHtml(band.description)}</p>
            </aside>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Panorama por missão</span>
              <h2>Onde a jornada já está sólida e onde vale concentrar energia primeiro.</h2>
            </div>
            <div class="function-score-grid">
              ${functionMetrics
                .map((item) => `
                  <article class="surface-card metric-panel">
                    <div class="metric-panel-top">
                      <span class="pill">${escapeHtml(item.meta.code)}</span>
                      <strong>${escapeHtml(item.meta.label)}</strong>
                    </div>
                    <div class="metric-bar"><div class="metric-bar-fill" style="width:${scoreToPercent(item.score || 0)}%"></div></div>
                    <div class="metric-caption">
                      <span>${formatScore(item.score)}</span>
                      <span>${item.answered}/${item.total} evidências respondidas</span>
                    </div>
                  </article>
                `)
                .join('')}
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Capacidades em destaque</span>
              <h2>Os pontos em que a empresa já opera com consistência e onde ainda existe mais espaço para evoluir.</h2>
            </div>
            <div class="capability-grid">
              ${capabilityBadges
                .map((item) => `
                  <article class="surface-card capability-card capability-${escapeHtml(item.tone)}">
                    <span class="capability-badge">${escapeHtml(item.badge)}</span>
                    <h3>${escapeHtml(item.label)}</h3>
                    <p>${escapeHtml(item.description)}</p>
                    <div class="capability-footer">
                      <strong>${formatScore(item.score)}</strong>
                      <span>${escapeHtml(item.statusLabel)}</span>
                    </div>
                  </article>
                `)
                .join('')}
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Heatmap função × capacidade</span>
              <h2>Uma leitura cruzada, mais leve, do que pesa mais na maturidade operacional.</h2>
            </div>
            <div class="surface-card heatmap-shell">
              <div class="heatmap-grid" style="grid-template-columns: 220px repeat(${content.capabilities.length}, minmax(100px, 1fr));">
                <div class="heatmap-corner">Função</div>
                ${content.capabilities.map((item) => `<div class="heatmap-head">${escapeHtml(item.shortLabel)}</div>`).join('')}
                ${heatmap
                  .map(
                    (row) => `
                      <div class="heatmap-row-head">${escapeHtml(row.meta.label)}</div>
                      ${row.cells
                        .map((cell) => {
                          const tone =
                            !Number.isFinite(cell.score)
                              ? 'empty'
                              : cell.score < 2
                              ? 'critical'
                              : cell.score < 3
                              ? 'warning'
                              : cell.score < 3.7
                              ? 'mid'
                              : 'strong';
                          return `<div class="heatmap-cell heatmap-${tone}">${Number.isFinite(cell.score) ? formatScore(cell.score) : '—'}</div>`;
                        })
                        .join('')}
                    `
                  )
                  .join('')}
              </div>
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Prioridades do momento</span>
              <h2>Os temas que hoje merecem atenção primeiro para acelerar a evolução.</h2>
            </div>
            <div class="gap-grid">
              ${gaps
                .map((gap) => `
                  <article class="surface-card gap-card">
                    <div class="gap-card-top">
                      <span class="pill">${escapeHtml(gap.functionNames.join(' · '))}</span>
                      <span class="gap-score">Prioridade ${formatScore(gap.gapScore)}</span>
                    </div>
                    <h3>${escapeHtml(gap.shortTitle)}</h3>
                    <p>${escapeHtml(gap.prompt)}</p>
                    <div class="gap-meta">
                      <span>Resposta: ${escapeHtml(content.answerScale[gap.selectedOption].label)}</span>
                      <span>Peso ${gap.weight}</span>
                    </div>
                  </article>
                `)
                .join('')}
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Roadmap 30-60-90</span>
              <h2>Uma sequência prática para sair do diagnóstico e entrar em execução com clareza.</h2>
            </div>
            <div class="roadmap-grid">
              ${roadmap
                .map(
                  (phase) => `
                    <article class="surface-card roadmap-card">
                      <span class="pill">${escapeHtml(phase.phase)}</span>
                      <h3>${escapeHtml(phase.title)}</h3>
                      <ul>${phase.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                    </article>
                  `
                )
                .join('')}
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Onde a Active pode ajudar agora</span>
              <h2>Os serviços mais aderentes para transformar este relatório em movimento real.</h2>
            </div>
            <div class="service-grid">
              ${services
                .map(
                  (service) => `
                    <article class="surface-card service-card">
                      <div class="service-card-top">
                        <span class="pill">${escapeHtml(service.area)}</span>
                        <span class="service-fit">${formatPercent(Math.min(service.fitScore * 12, 100))} de aderência</span>
                      </div>
                      <h3>${escapeHtml(service.name)}</h3>
                      <p>${escapeHtml(service.summary)}</p>
                      <div class="service-value-note">${escapeHtml(service.contactPitch)}</div>
                      <div class="pill-cloud">
                        ${service.relatedCapabilities.slice(0, 3).map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}
                      </div>
                      <button class="btn btn-secondary" type="button" data-action="open-service" data-service-key="${escapeHtml(service.key)}">Saiba mais</button>
                    </article>
                  `
                )
                .join('')}
            </div>
          </section>
          <section class="surface-card cta-strip report-section">
            <div>
              <span class="eyebrow eyebrow-soft">Próximo passo comercial</span>
              <h2>Transforme o diagnóstico em plano de ação com a Active Solutions.</h2>
              <p>Se quiser, já podemos aprofundar o relatório, priorizar quick wins e desenhar a próxima onda de implementação com um especialista.</p>
            </div>
            <a class="btn btn-primary" href="${buildWhatsAppUrl('Quero transformar o assessment NAVE em um plano de ação com a Active Solutions.')}" target="_blank" rel="noreferrer">Entrar em contato agora mesmo</a>
          </section>
        </main>
        ${renderSpecialistFab('Quero falar com um especialista sobre as recomendações do relatório.')}
        ${renderServiceModal()}
      </div>
    `;
  }

  function renderServiceModal() {
    if (!state.serviceDetailKey) {
      return '';
    }
    const recommendations = getRecommendedServices(8);
    const service =
      recommendations.find((item) => item.key === state.serviceDetailKey) || servicesByKey[state.serviceDetailKey];
    if (!service) {
      return '';
    }
    const contactUrl = buildWhatsAppUrl(`Quero entender melhor o serviço ${service.name}.`);
    return `
      <div class="modal-overlay" data-action="close-service">
        <div class="service-modal surface-card" role="dialog" aria-modal="true">
          <button class="modal-close" type="button" data-action="close-service">×</button>
          <div class="service-modal-brand">${renderLogo('color', 'service-modal-logo', 'Logo Active Solutions colorido')}</div>
          <span class="eyebrow eyebrow-soft">${escapeHtml(service.area)}</span>
          <h2>${escapeHtml(service.name)}</h2>
          <p>${escapeHtml(service.description)}</p>
          <div class="modal-columns">
            <div>
              <h3>Como esse serviço ajuda</h3>
              <p>${escapeHtml(service.contactPitch)}</p>
              <h3>Dor que ele resolve</h3>
              <p>${escapeHtml(service.pain)}</p>
            </div>
            <div>
              <h3>O que a Active costuma entregar</h3>
              <ul>${service.deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
            </div>
          </div>
          ${
            service.relatedGaps && service.relatedGaps.length
              ? `
                <div class="modal-related">
                  <h3>Por que apareceu no seu relatório</h3>
                  <div class="pill-cloud">${service.relatedGaps.map((gap) => `<span class="pill">${escapeHtml(gap.shortTitle)}</span>`).join('')}</div>
                </div>
              `
              : ''
          }
          <div class="modal-cta">
            <a class="btn btn-primary" href="${contactUrl}" target="_blank" rel="noreferrer">Entrar em contato agora mesmo</a>
            <button class="btn btn-secondary" type="button" data-action="close-service">Voltar ao relatório</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderLegacy() {
    if (state.screen === 'lead') {
      app.innerHTML = renderLead();
      return;
    }
    if (state.screen === 'assessment') {
      app.innerHTML = renderAssessment();
      return;
    }
    if (state.screen === 'results') {
      app.innerHTML = renderResults();
      return;
    }
    app.innerHTML = renderLanding();
  }

  function renderAssessment() {
    const question = getCurrentQuestion();
    const currentCheckpoint = getCurrentCheckpoint();
    const currentMission = functionsByKey[currentCheckpoint?.functionKey || question.primaryFunctionKey];
    const checkpointQuestions = getCheckpointQuestions(currentCheckpoint.id);
    const checkpointStats = getCheckpointStats(currentCheckpoint.id);
    const missionStats = getMissionStats(currentMission.key);
    const overallPercent = getCompletionPercent();
    const levelMeta = getLevelMeta();
    const mobile = isMobileLayout();
    const visibleQuestions = mobile
      ? checkpointQuestions.filter((item) => item.id === question.id)
      : checkpointQuestions;
    const previousCheckpointId = getPreviousCheckpointId(currentCheckpoint.id);
    const nextCheckpointId = getNextCheckpointId(currentCheckpoint.id);
    const remainingAnswers = questions.length - getAnsweredCount();
    const checkpointReward = getCheckpointRewardCopy(checkpointQuestions);
    const checkpointLoss = getCheckpointLossCopy(checkpointQuestions);
    const completionBand = getMaturityBand(getOverallScore());

    return `
      <div class="page-shell">
        ${renderTopbar()}
        <main class="page-content">
          ${renderNotice()}
          <section class="assessment-shell assessment-editorial">
            <aside class="assessment-sidebar">
              <div class="surface-card sidebar-summary">
                <span class="eyebrow eyebrow-soft">Jornada ativa</span>
                <strong>${getAnsweredCount()} de ${questions.length}</strong>
                <div class="progress-track"><div class="progress-bar" style="width:${overallPercent}%"></div></div>
                <span>${formatPercent(overallPercent)} concluído · ${missionStats.completedCheckpoints}/${missionStats.totalCheckpoints} checkpoints desta missão</span>
                <div class="sidebar-personal-note">${escapeHtml(getExecutivePersonaLine())}</div>
              </div>
              ${renderFunctionNav(currentMission.key)}
              ${renderCheckpointRail(currentMission, currentCheckpoint)}
              <div class="surface-card support-card">
                <span class="eyebrow eyebrow-soft">Suporte rápido</span>
                <strong>${escapeHtml(currentMission.supportPrompt)}</strong>
                <p>Se travar em qualquer ponto, a Active pode ajudar a traduzir a pergunta e orientar a evidência mais simples para seguir com confiança.</p>
                <a class="btn btn-primary" href="${buildWhatsAppUrl(`Quero apoio para responder o checkpoint ${currentCheckpoint.label} da missão ${currentMission.label}.`)}" target="_blank" rel="noreferrer">Fale com um especialista</a>
              </div>
              <div class="surface-card utility-panel">
                <button class="btn btn-secondary" type="button" data-action="open-review">Central de revisão</button>
                <button class="btn btn-secondary" type="button" data-action="open-reset-mission" data-function-key="${escapeHtml(currentMission.key)}">Resetar missão atual</button>
                <button class="btn btn-ghost" type="button" data-action="open-reset-all">Reiniciar assessment</button>
              </div>
            </aside>
            <section class="assessment-stage">
              <article class="surface-card mission-console" style="--mission-accent:${currentMission.accent}; --mission-soft:${currentMission.accentSoft}; --mission-glow:${currentMission.glow};">
                <div class="mission-console-copy">
                  <span class="eyebrow">${escapeHtml(currentMission.missionLabel)} · ${escapeHtml(currentMission.label)}</span>
                  <div class="context-card">
                    <strong>Por que isso importa</strong>
                    <p>${escapeHtml(currentCheckpoint.intro || question.learnWhy)}</p>
                  </div>
                  <h1>${escapeHtml(question.businessPlainLanguage || question.uiPromptShort || question.prompt)}</h1>
                  <p>${escapeHtml(getMissionPersonalization(currentMission))}</p>
                </div>
                <div class="mission-visual">
                  <div class="mission-visual-shield">
                    <span>${escapeHtml(currentMission.heroBadge || 'Shield')}</span>
                    <strong>Level ${levelMeta.level}</strong>
                  </div>
                  <div class="mission-confidence">
                    <div class="progress-track"><div class="progress-bar" style="width:${levelMeta.progress}%"></div></div>
                    <span>${escapeHtml(levelMeta.label)}</span>
                  </div>
                  <div class="help-card mission-visual-tip">
                    <span>Pro tip</span>
                    <p>${escapeHtml(question.learnTip)}</p>
                  </div>
                </div>
              </article>
              <section class="surface-card checkpoint-stage">
                <div class="checkpoint-stage-head">
                  <div>
                    <span class="eyebrow eyebrow-soft">${escapeHtml(currentCheckpoint.label)}</span>
                    <h2>${escapeHtml(currentMission.executiveTitle || currentMission.label)}</h2>
                    <p>${escapeHtml(currentMission.rewardText)}</p>
                  </div>
                  <div class="checkpoint-stage-metrics">
                    <div class="checkpoint-stat">
                      <strong>${checkpointStats.answered}/${checkpointStats.total}</strong>
                      <span>respondidas neste checkpoint</span>
                    </div>
                    <div class="checkpoint-stat">
                      <strong>${formatPercent(missionStats.percent)}</strong>
                      <span>missão concluída</span>
                    </div>
                    <div class="checkpoint-stat">
                      <strong>${escapeHtml(completionBand.tierLabel)}</strong>
                      <span>leitura atual do relatório</span>
                    </div>
                  </div>
                </div>
                ${
                  mobile
                    ? `
                      <div class="checkpoint-mobile-tabs">
                        ${checkpointQuestions
                          .map(
                            (item) => `
                              <button class="checkpoint-mobile-tab ${item.id === question.id ? 'is-current' : ''}" type="button" data-action="show-question" data-question-id="${item.id}">
                                ${escapeHtml(item.id)}
                              </button>
                            `
                          )
                          .join('')}
                      </div>
                    `
                    : ''
                }
                <div class="checkpoint-grid ${mobile ? 'is-mobile' : ''}">
                  ${visibleQuestions.map((item) => renderQuestionCard(item, currentMission, mobile)).join('')}
                </div>
              </section>
              <div class="action-bar">
                <div>
                  <button class="btn btn-secondary" type="button" data-action="prev-checkpoint" ${previousCheckpointId ? '' : 'disabled'}>Checkpoint anterior</button>
                </div>
                <div class="action-bar-center">
                  <button class="btn btn-ghost" type="button" data-action="save-checkpoint">Salvar progresso</button>
                  <button class="btn btn-secondary" type="button" data-action="open-review">Revisar respostas</button>
                </div>
                <div>
                  <button class="btn btn-primary" type="button" data-action="${nextCheckpointId ? 'next-checkpoint' : isAssessmentComplete() ? 'finish-assessment' : 'go-first-missing'}">${escapeHtml(
                    nextCheckpointId ? 'Próximo checkpoint' : isAssessmentComplete() ? 'Revelar relatório' : `Faltam ${remainingAnswers} respostas`
                  )}</button>
                </div>
              </div>
              <div class="status-rail">
                <article class="status-rail-card">
                  <strong>Checkpoint salvo</strong>
                  <span>${escapeHtml(formatTime(state.lastSavedAt))}</span>
                </article>
                <article class="status-rail-card">
                  <strong>Recompensa liberada</strong>
                  <span>${escapeHtml(checkpointReward)}</span>
                </article>
                <article class="status-rail-card">
                  <strong>Se parar agora</strong>
                  <span>${escapeHtml(checkpointLoss)}</span>
                </article>
              </div>
            </section>
            <aside class="assessment-sidecar">
              <div class="surface-card sidecar-card">
                <span class="eyebrow eyebrow-soft">Seu avanço</span>
                <div class="sidecar-shield">
                  <div class="sidecar-shield-core"></div>
                </div>
                <strong>Level ${levelMeta.level}</strong>
                <div class="progress-track"><div class="progress-bar" style="width:${Math.max(levelMeta.progress, overallPercent)}%"></div></div>
                <span>${escapeHtml(levelMeta.label)}</span>
              </div>
              <div class="surface-card sidecar-card">
                <span class="eyebrow eyebrow-soft">Ganho do checkpoint</span>
                <strong>${escapeHtml(currentMission.rewardTitle || 'Relatório ficando mais preciso')}</strong>
                <p>${escapeHtml(checkpointReward)}</p>
              </div>
              <div class="surface-card sidecar-card">
                <span class="eyebrow eyebrow-soft">Dica prática</span>
                <p>${escapeHtml(question.learnWhy)}</p>
              </div>
            </aside>
          </section>
        </main>
        ${renderSpecialistFab('Preciso de apoio para responder esta etapa do assessment.')}
        ${renderAppModal()}
      </div>
    `;
  }

  function renderReview() {
    const answered = getAnsweredCount();
    const missing = questions.length - answered;
    const canReturnResults = getReturnScreen() === 'results';
    return `
      <div class="page-shell">
        ${renderTopbar()}
        <main class="page-content">
          ${renderNotice()}
          <section class="surface-card review-hero">
            <div>
              <span class="eyebrow eyebrow-soft">Central de revisão</span>
              <h1>Revise, ajuste e volte exatamente para o ponto que precisar.</h1>
              <p>${escapeHtml(
                missing
                  ? `Ainda faltam ${missing} respostas para liberar o relatório final com total precisão.`
                  : 'Tudo foi respondido. Se você editar algo agora, o relatório será atualizado sem reiniciar a jornada.'
              )}</p>
            </div>
            <div class="review-hero-card">
              <strong>${answered}/${questions.length}</strong>
              <span>respostas confirmadas</span>
              <div class="progress-track"><div class="progress-bar" style="width:${getCompletionPercent()}%"></div></div>
              <span>${formatPercent(getCompletionPercent())} do assessment consolidado</span>
            </div>
            <div class="review-hero-actions">
              <button class="btn btn-secondary" type="button" data-action="return-from-review">${canReturnResults ? 'Voltar ao relatório' : 'Voltar ao assessment'}</button>
              <button class="btn btn-primary" type="button" data-action="${isAssessmentComplete() ? 'go-results' : 'go-first-missing'}">${isAssessmentComplete() ? 'Atualizar relatório' : 'Ir para pendências'}</button>
            </div>
          </section>
          ${
            state.sentStatuses.completed
              ? `
                <section class="surface-card continuity-card">
                  <span class="eyebrow eyebrow-soft">Continuidade</span>
                  <strong>Seu relatório continua vivo.</strong>
                  <p>Ao editar respostas, recalculamos maturidade, prioridades, roadmap e serviços recomendados na mesma sessão.</p>
                </section>
              `
              : ''
          }
          <section class="review-layout">
            ${content.functions
              .map((mission) => {
                const missionStats = getMissionStats(mission.key);
                const missionCheckpoints = getMissionCheckpoints(mission.key);
                const criticalMissing = getMissionQuestions(mission.key).filter(
                  (item) => !getAnswer(item.id) && item.weight === 3
                ).length;
                return `
                  <article class="surface-card review-mission">
                    <div class="review-mission-head">
                      <div>
                        <span class="eyebrow eyebrow-soft">${escapeHtml(mission.code)}</span>
                        <h2>${escapeHtml(mission.label)}</h2>
                        <p>${escapeHtml(mission.executiveSubtitle || mission.heroText)}</p>
                      </div>
                      <div class="review-mission-stats">
                        <span>${missionStats.answered}/${missionStats.total} respondidas</span>
                        <span>${criticalMissing ? `${criticalMissing} críticas faltando` : 'sem pendência crítica'}</span>
                      </div>
                    </div>
                    <div class="review-checkpoint-list">
                      ${missionCheckpoints
                        .map((checkpoint) => {
                          const checkpointStats = getCheckpointStats(checkpoint.id);
                          return `
                            <section class="review-checkpoint">
                              <div class="review-checkpoint-head">
                                <div>
                                  <strong>${escapeHtml(checkpoint.label)}</strong>
                                  <div class="review-checkpoint-meta">
                                    <span>${checkpointStats.answered}/${checkpointStats.total} respondidas</span>
                                    <span>${checkpointStats.highRiskCount ? `${checkpointStats.highRiskCount} crítica(s)` : 'sem alerta crítico'}</span>
                                  </div>
                                </div>
                                <button class="btn btn-ghost btn-compact" type="button" data-jump-checkpoint="${checkpoint.id}">Editar checkpoint</button>
                              </div>
                              <div class="review-question-list">
                                ${getCheckpointQuestions(checkpoint.id)
                                  .map((item) => {
                                    const answer = getAnswer(item.id);
                                    const answerLabel = answer ? content.answerScale[answer.selectedOption].label : 'Faltando';
                                    const tone = !answer
                                      ? 'review-missing'
                                      : (answer.selectedOption === 'A' || answer.selectedOption === 'B') && item.weight === 3
                                      ? 'review-critical'
                                      : 'review-done';
                                    return `
                                      <div class="review-question-item ${tone}">
                                        <div>
                                          <strong>${escapeHtml(item.uiPromptShort || item.businessPlainLanguage || item.prompt)}</strong>
                                          <span>${escapeHtml(answerLabel)} · peso ${item.weight}</span>
                                        </div>
                                        <button class="btn btn-ghost btn-compact" type="button" data-action="edit-question" data-question-id="${item.id}">Editar</button>
                                      </div>
                                    `;
                                  })
                                  .join('')}
                              </div>
                            </section>
                          `;
                        })
                        .join('')}
                    </div>
                  </article>
                `;
              })
              .join('')}
          </section>
        </main>
        ${renderSpecialistFab('Preciso de ajuda para revisar e ajustar minhas respostas no assessment N.A.V.E.')}
        ${renderAppModal()}
      </div>
    `;
  }

  function renderResults() {
    const overall = getOverallScore();
    const band = getMaturityBand(overall);
    const functionMetrics = Object.values(getFunctionMetrics());
    const capabilityBadges = getCapabilityBadges();
    const heatmap = getHeatmapRows();
    const gaps = getPriorityGaps(6);
    const roadmap = getRoadmap();
    const services = getRecommendedServices(4);
    const companyName = state.profile.company || 'sua empresa';
    const firstName = getFirstName();

    return `
      <div class="page-shell">
        ${renderTopbar()}
        <main class="page-content">
          ${renderNotice()}
          <section class="results-hero report-section">
            <article class="surface-card surface-card-dark results-copy">
              <div class="results-brand-line">
                ${renderLogo('negative', 'results-logo', 'Logo Active Solutions negativo')}
                <span class="eyebrow">Relatório N.A.V.E</span>
              </div>
              <h1>${escapeHtml(companyName)} está em ${escapeHtml(band.label)}.</h1>
              <p>${escapeHtml(
                firstName
                  ? `${firstName}, ${getNarrative()}`
                  : getNarrative()
              )}</p>
              <div class="button-row">
                <button class="btn btn-primary" data-action="export-report">Salvar em PDF</button>
                <button class="btn btn-secondary" data-action="open-review-from-results">Revisar respostas</button>
                <button class="btn btn-secondary" data-action="edit-context">Editar contexto</button>
                <a class="btn btn-secondary" href="${buildWhatsAppUrl('Quero discutir o relatório final do assessment N.A.V.E.')}">Falar sobre o relatório</a>
              </div>
            </article>
            <aside class="surface-card score-card">
              <span class="eyebrow eyebrow-soft">Maturidade geral</span>
              <div class="score-ring" style="--score:${scoreToPercent(overall)}">
                <strong>${formatScore(overall)}</strong>
                <span>de 4,0</span>
              </div>
              <h2>${escapeHtml(band.tierLabel)}</h2>
              <p>${escapeHtml(band.description)}</p>
            </aside>
          </section>
          <section class="surface-card continuity-card report-section">
            <span class="eyebrow eyebrow-soft">Continuidade executiva</span>
            <strong>Este relatório pode evoluir sem perder o que já foi construído.</strong>
            <p>Se você revisar qualquer resposta, recalculamos maturidade, tier, roadmap, heatmap e serviços recomendados na mesma sessão.</p>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Panorama por missão</span>
              <h2>Onde a jornada já está sólida e onde vale concentrar energia primeiro.</h2>
            </div>
            <div class="function-score-grid">
              ${functionMetrics
                .map((item) => `
                  <article class="surface-card metric-panel">
                    <div class="metric-panel-top">
                      <span class="pill">${escapeHtml(item.meta.code)}</span>
                      <strong>${escapeHtml(item.meta.label)}</strong>
                    </div>
                    <div class="metric-bar"><div class="metric-bar-fill" style="width:${scoreToPercent(item.score || 0)}%"></div></div>
                    <div class="metric-caption">
                      <span>${formatScore(item.score)}</span>
                      <span>${item.answered}/${item.total} evidências respondidas</span>
                    </div>
                  </article>
                `)
                .join('')}
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Capacidades em destaque</span>
              <h2>Os pontos em que a empresa já opera com consistência e onde ainda existe mais espaço para evoluir.</h2>
            </div>
            <div class="capability-grid">
              ${capabilityBadges
                .map((item) => `
                  <article class="surface-card capability-card capability-${escapeHtml(item.tone)}">
                    <span class="capability-badge">${escapeHtml(item.badge)}</span>
                    <h3>${escapeHtml(item.label)}</h3>
                    <p>${escapeHtml(item.description)}</p>
                    <div class="capability-footer">
                      <strong>${formatScore(item.score)}</strong>
                      <span>${escapeHtml(item.statusLabel)}</span>
                    </div>
                  </article>
                `)
                .join('')}
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Heatmap função × capacidade</span>
              <h2>Uma leitura cruzada, mais leve, do que pesa mais na maturidade operacional.</h2>
            </div>
            <div class="surface-card heatmap-shell">
              <div class="heatmap-grid" style="grid-template-columns: 220px repeat(${content.capabilities.length}, minmax(100px, 1fr));">
                <div class="heatmap-corner">Função</div>
                ${content.capabilities.map((item) => `<div class="heatmap-head">${escapeHtml(item.shortLabel)}</div>`).join('')}
                ${heatmap
                  .map(
                    (row) => `
                      <div class="heatmap-row-head">${escapeHtml(row.meta.label)}</div>
                      ${row.cells
                        .map((cell) => {
                          const tone =
                            !Number.isFinite(cell.score)
                              ? 'empty'
                              : cell.score < 2
                              ? 'critical'
                              : cell.score < 3
                              ? 'warning'
                              : cell.score < 3.7
                              ? 'mid'
                              : 'strong';
                          return `<div class="heatmap-cell heatmap-${tone}">${Number.isFinite(cell.score) ? formatScore(cell.score) : '—'}</div>`;
                        })
                        .join('')}
                    `
                  )
                  .join('')}
              </div>
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Prioridades do momento</span>
              <h2>Os temas que hoje merecem atenção primeiro para acelerar a evolução.</h2>
            </div>
            <div class="gap-grid">
              ${gaps
                .map((gap) => `
                  <article class="surface-card gap-card">
                    <div class="gap-card-top">
                      <span class="pill">${escapeHtml(gap.functionNames.join(' · '))}</span>
                      <span class="gap-score">Prioridade ${formatScore(gap.gapScore)}</span>
                    </div>
                    <h3>${escapeHtml(gap.shortTitle)}</h3>
                    <p>${escapeHtml(gap.prompt)}</p>
                    <div class="gap-meta">
                      <span>Resposta: ${escapeHtml(content.answerScale[gap.selectedOption].label)}</span>
                      <span>Peso ${gap.weight}</span>
                    </div>
                  </article>
                `)
                .join('')}
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Roadmap 30-60-90</span>
              <h2>Uma sequência prática para sair do diagnóstico e entrar em execução com clareza.</h2>
            </div>
            <div class="roadmap-grid">
              ${roadmap
                .map(
                  (phase) => `
                    <article class="surface-card roadmap-card">
                      <span class="pill">${escapeHtml(phase.phase)}</span>
                      <h3>${escapeHtml(phase.title)}</h3>
                      <ul>${phase.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                    </article>
                  `
                )
                .join('')}
            </div>
          </section>
          <section class="report-section">
            <div class="section-head">
              <span class="eyebrow eyebrow-soft">Onde a Active pode ajudar agora</span>
              <h2>Os serviços mais aderentes para transformar este relatório em movimento real.</h2>
            </div>
            <div class="service-grid">
              ${services
                .map(
                  (service) => `
                    <article class="surface-card service-card">
                      <div class="service-card-top">
                        <span class="pill">${escapeHtml(service.area)}</span>
                        <span class="service-fit">${formatPercent(Math.min(service.fitScore * 12, 100))} de aderência</span>
                      </div>
                      <h3>${escapeHtml(service.name)}</h3>
                      <p>${escapeHtml(service.summary)}</p>
                      <div class="service-value-note">${escapeHtml(service.contactPitch)}</div>
                      <div class="pill-cloud">
                        ${service.relatedCapabilities.slice(0, 3).map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}
                      </div>
                      <button class="btn btn-secondary" type="button" data-action="open-service" data-service-key="${escapeHtml(service.key)}">Saiba mais</button>
                    </article>
                  `
                )
                .join('')}
            </div>
          </section>
          <section class="surface-card cta-strip report-section">
            <div>
              <span class="eyebrow eyebrow-soft">Próximo passo comercial</span>
              <h2>Transforme o diagnóstico em plano de ação com a Active Solutions.</h2>
              <p>Se quiser, já podemos aprofundar o relatório, priorizar quick wins e desenhar a próxima onda de implementação com um especialista.</p>
            </div>
            <a class="btn btn-primary" href="${buildWhatsAppUrl('Quero transformar o assessment N.A.V.E em um plano de ação com a Active Solutions.')}" target="_blank" rel="noreferrer">Entrar em contato agora mesmo</a>
          </section>
        </main>
        ${renderSpecialistFab('Quero falar com um especialista sobre as recomendações do relatório.')}
        ${renderAppModal()}
      </div>
    `;
  }

  function render() {
    if (state.screen === 'lead') {
      app.innerHTML = renderLead();
      return;
    }
    if (state.screen === 'assessment') {
      app.innerHTML = renderAssessment();
      return;
    }
    if (state.screen === 'review') {
      app.innerHTML = renderReview();
      return;
    }
    if (state.screen === 'results') {
      app.innerHTML = renderResults();
      return;
    }
    app.innerHTML = renderLanding();
  }

  app.addEventListener(
    'click',
    function (event) {
      const optionButton = event.target.closest('[data-option][data-question-id]');
      if (optionButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        updateAnswer(optionButton.getAttribute('data-question-id'), optionButton.getAttribute('data-option'));
        return;
      }

      const checkpointJump = event.target.closest('[data-jump-checkpoint]');
      if (checkpointJump) {
        event.preventDefault();
        event.stopImmediatePropagation();
        navigateToCheckpoint(checkpointJump.getAttribute('data-jump-checkpoint'));
        return;
      }

      const functionJump = event.target.closest('[data-jump-function]');
      if (functionJump) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const functionKey = functionJump.getAttribute('data-jump-function');
        if (!isLeadReady()) {
          state.screen = 'lead';
          persistAndRender();
          return;
        }
        navigateToCheckpoint(firstIncompleteCheckpointId(functionKey));
        return;
      }

      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) {
        return;
      }
      const action = actionButton.getAttribute('data-action');
      const questionId = actionButton.getAttribute('data-question-id') || '';
      const functionKey = actionButton.getAttribute('data-function-key') || '';
      const currentCheckpoint = getCurrentCheckpoint();

      const handledActions = new Set([
        'start-flow',
        'go-landing',
        'open-review',
        'open-review-from-results',
        'return-from-review',
        'show-question',
        'edit-question',
        'prev-checkpoint',
        'next-checkpoint',
        'go-first-missing',
        'go-results',
        'finish-assessment',
        'save-checkpoint',
        'clear-question',
        'open-reset-mission',
        'confirm-reset-mission',
        'open-reset-all',
        'reset-all-keep-lead',
        'reset-all-clear-lead',
        'close-modal',
        'close-service',
        'review-answers',
        'edit-context',
        'toggle-help',
      ]);

      if (!handledActions.has(action)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (action === 'start-flow') {
        state.screen = isLeadReady() ? 'assessment' : 'lead';
        if (!state.startedAt && isLeadReady()) {
          state.startedAt = Date.now();
          persistAndRender();
          queueSubmission('started');
          return;
        }
        persistAndRender();
        return;
      }

      if (action === 'go-landing') {
        state.screen = 'landing';
        persistAndRender();
        return;
      }

      if (action === 'open-review' || action === 'open-review-from-results' || action === 'review-answers') {
        openReview(action === 'open-review-from-results' || action === 'review-answers' ? 'results' : 'assessment');
        return;
      }

      if (action === 'return-from-review') {
        state.screen = getReturnScreen();
        persistAndRender();
        return;
      }

      if (action === 'show-question' || action === 'edit-question') {
        navigateToQuestion(questionId);
        return;
      }

      if (action === 'prev-checkpoint') {
        const previousCheckpointId = getPreviousCheckpointId(currentCheckpoint.id);
        if (previousCheckpointId) {
          navigateToCheckpoint(previousCheckpointId);
        }
        return;
      }

      if (action === 'next-checkpoint') {
        const nextCheckpointId = getNextCheckpointId(currentCheckpoint.id);
        if (!getCheckpointStats(currentCheckpoint.id).complete) {
          setNotice('warning', 'Este checkpoint ainda tem pendências, mas você pode seguir e revisar depois na Central de revisão.');
        }
        if (nextCheckpointId) {
          navigateToCheckpoint(nextCheckpointId);
        }
        return;
      }

      if (action === 'go-first-missing') {
        const nextMissing = firstIncompleteCheckpointId();
        if (nextMissing) {
          setNotice('warning', `Ainda faltam ${questions.length - getAnsweredCount()} respostas para liberar o relatório completo.`);
          navigateToCheckpoint(nextMissing);
        }
        return;
      }

      if (action === 'go-results') {
        if (!isAssessmentComplete()) {
          const nextMissing = firstIncompleteCheckpointId();
          setNotice('warning', `Ainda faltam ${questions.length - getAnsweredCount()} respostas para liberar o relatório completo.`);
          if (nextMissing) {
            navigateToCheckpoint(nextMissing);
          }
          return;
        }
        if (!state.completedAt || !state.sentStatuses.completed) {
          finishAssessment();
          return;
        }
        state.screen = 'results';
        state.reportDirty = false;
        persistAndRender();
        return;
      }

      if (action === 'finish-assessment') {
        if (!isAssessmentComplete()) {
          const nextMissing = firstIncompleteCheckpointId();
          setNotice('warning', `Ainda faltam ${questions.length - getAnsweredCount()} respostas para liberar o relatório completo.`);
          if (nextMissing) {
            navigateToCheckpoint(nextMissing);
          }
          return;
        }
        finishAssessment();
        return;
      }

      if (action === 'save-checkpoint') {
        setNotice('success', `Checkpoint salvo às ${formatTime(Date.now())}.`);
        persistAndRender();
        return;
      }

      if (action === 'clear-question') {
        clearAnswer(questionId);
        return;
      }

      if (action === 'open-reset-mission') {
        state.modal = { type: 'reset-mission', functionKey: functionKey || getCurrentQuestion().primaryFunctionKey };
        persistAndRender();
        return;
      }

      if (action === 'confirm-reset-mission') {
        resetMissionAnswers(functionKey || state.modal?.functionKey);
        return;
      }

      if (action === 'open-reset-all') {
        state.modal = { type: 'reset-all' };
        persistAndRender();
        return;
      }

      if (action === 'reset-all-keep-lead') {
        restartAssessment(true);
        return;
      }

      if (action === 'reset-all-clear-lead') {
        restartAssessment(false);
        return;
      }

      if (action === 'toggle-help') {
        toggleHelpDrawer(questionId, actionButton.getAttribute('data-help-kind'));
        return;
      }

      if (action === 'edit-context') {
        state.screen = 'lead';
        persistAndRender();
        return;
      }

      if (action === 'close-service') {
        if (actionButton.classList.contains('modal-overlay') && event.target !== actionButton) {
          return;
        }
        state.serviceDetailKey = '';
        persistAndRender();
        return;
      }

      if (action === 'close-modal') {
        if (actionButton.classList.contains('modal-overlay') && event.target !== actionButton) {
          return;
        }
        state.modal = null;
        persistAndRender();
      }
    },
    true
  );

  app.addEventListener(
    'submit',
    function (event) {
      const form = event.target.closest('[data-form="lead"]');
      if (!form) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const formData = new window.FormData(form);
      const phone = formatPhoneDisplay(String(formData.get('phone') || '').trim());
      const phoneDigits = normalizePhoneDigits(phone);
      if (phone && phoneDigits.length < 12) {
        setNotice('warning', 'Confira o telefone / WhatsApp informado antes de continuar.');
        persistAndRender();
        return;
      }
      state.profile = {
        name: String(formData.get('name') || '').trim(),
        role: String(formData.get('role') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        company: String(formData.get('company') || '').trim(),
        size: String(formData.get('size') || '').trim(),
        segment: String(formData.get('segment') || '').trim(),
        phone,
      };
      state.helpDrawers = {};
      state.startedAt = state.startedAt || Date.now();
      state.screen = 'assessment';
      state.notice = null;
      persistAndRender();
      queueSubmission('started');
    },
    true
  );

  app.addEventListener(
    'input',
    function (event) {
      if (event.target.matches('[data-profile-input]')) {
        const field = event.target.getAttribute('data-profile-input');
        let value = event.target.value;
        if (field === 'phone') {
          value = formatPhoneDisplay(value);
          event.target.value = value;
        }
        state.profile[field] = value;
        saveState();
        updateLeadPreviewDom();
        event.stopImmediatePropagation();
        return;
      }
      if (event.target.matches('[data-evidence-input]')) {
        const questionId = event.target.getAttribute('data-evidence-input');
        if (state.answers[questionId]) {
          state.answers[questionId].evidence = event.target.value;
          saveState();
        }
        event.stopImmediatePropagation();
      }
    },
    true
  );

  app.addEventListener('click', function (event) {
    const optionButton = event.target.closest('[data-option]');
    if (optionButton) {
      const question = getCurrentQuestion();
      const selectedOption = optionButton.getAttribute('data-option');
      state.answers[question.id] = {
        ...(state.answers[question.id] || {}),
        selectedOption,
        score: question.scoreMap[selectedOption],
        evidence: state.answers[question.id]?.evidence || '',
      };
      persistAndRender();
      return;
    }

    const functionJump = event.target.closest('[data-jump-function]');
    if (functionJump) {
      const functionKey = functionJump.getAttribute('data-jump-function');
      const targetIndex = questions.findIndex((question) => question.primaryFunctionKey === functionKey);
      if (targetIndex !== -1) {
        state.screen = isLeadReady() ? 'assessment' : 'lead';
        state.currentQuestionIndex = targetIndex;
        persistAndRender();
      }
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) {
      return;
    }
    const action = actionButton.getAttribute('data-action');

    if (action === 'start-flow') {
      state.screen = isLeadReady() ? 'assessment' : 'lead';
      if (!state.startedAt && isLeadReady()) {
        state.startedAt = Date.now();
      }
      persistAndRender();
      return;
    }

    if (action === 'go-landing') {
      state.screen = 'landing';
      persistAndRender();
      return;
    }

    if (action === 'prev-question') {
      state.currentQuestionIndex = clampIndex(state.currentQuestionIndex - 1);
      persistAndRender();
      return;
    }

    if (action === 'next-question') {
      state.currentQuestionIndex = clampIndex(state.currentQuestionIndex + 1);
      persistAndRender();
      return;
    }

    if (action === 'next-unanswered') {
      state.currentQuestionIndex = firstUnansweredIndex();
      setNotice('warning', `Ainda faltam ${questions.length - getAnsweredCount()} respostas para revelar o relatório completo.`);
      persistAndRender();
      return;
    }

    if (action === 'finish-assessment') {
      state.completedAt = Date.now();
      state.screen = 'results';
      queueSubmission('completed');
      persistAndRender();
      return;
    }

    if (action === 'review-answers') {
      state.screen = 'assessment';
      state.currentQuestionIndex = 0;
      persistAndRender();
      return;
    }

    if (action === 'export-report') {
      window.print();
      return;
    }

    if (action === 'open-service') {
      state.serviceDetailKey = actionButton.getAttribute('data-service-key') || '';
      persistAndRender();
      return;
    }

    if (action === 'close-service') {
      state.serviceDetailKey = '';
      persistAndRender();
      return;
    }

    if (action === 'retry-submissions') {
      flushPendingSubmissions();
      return;
    }

    if (action === 'close-notice') {
      state.notice = null;
      persistAndRender();
    }
  });

  app.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-form="lead"]');
    if (!form) {
      return;
    }
    event.preventDefault();
    const formData = new window.FormData(form);
    const phone = formatPhoneDisplay(String(formData.get('phone') || '').trim());
    const phoneDigits = normalizePhoneDigits(phone);
    if (phone && phoneDigits.length < 12) {
      setNotice('warning', 'Confira o telefone / WhatsApp informado antes de continuar.');
      persistAndRender();
      return;
    }
    state.profile = {
      name: String(formData.get('name') || '').trim(),
      role: String(formData.get('role') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      company: String(formData.get('company') || '').trim(),
      size: String(formData.get('size') || '').trim(),
      segment: String(formData.get('segment') || '').trim(),
      phone,
    };
    state.startedAt = state.startedAt || Date.now();
    state.screen = 'assessment';
    state.notice = null;
    persistAndRender();
    queueSubmission('started');
  });

  app.addEventListener('input', function (event) {
    if (event.target.matches('input[name="phone"]')) {
      event.target.value = formatPhoneDisplay(event.target.value);
      return;
    }
    if (event.target.matches('[data-evidence-input]')) {
      const questionId = event.target.getAttribute('data-evidence-input');
      if (state.answers[questionId]) {
        state.answers[questionId].evidence = event.target.value;
        saveState();
      }
    }
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && state.serviceDetailKey) {
      state.serviceDetailKey = '';
      persistAndRender();
    }
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && state.modal) {
      state.modal = null;
      persistAndRender();
    }
  });

  window.addEventListener('online', function () {
    flushPendingSubmissions({ silent: true });
  });

  render();
  flushPendingSubmissions({ silent: true });
})();
