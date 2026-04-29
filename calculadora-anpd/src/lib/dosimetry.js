(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AnpdDosimetry = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ASSESSED_ENTITY_TYPES = {
    LEGAL_WITH_REVENUE: 'legal_with_revenue',
    NATURAL_PERSON: 'natural_person',
    LEGAL_WITHOUT_REVENUE: 'legal_without_revenue',
  };

  const CLASSIFICATIONS = {
    LIGHT: 'leve',
    MEDIUM: 'media',
    SERIOUS: 'grave',
  };

  const ALIQUOT_RANGES = {
    leve: { a1: 0.0008, a2: 0.0015 },
    media: { a1: 0.0013, a2: 0.005 },
    grave: { a1: 0.0045, a2: 0.015 },
  };

  const ABSOLUTE_BASE_RANGES = {
    leve: { v1: 1500, v2: 3500 },
    media: { v1: 3000, v2: 7000 },
    grave: { v1: 6750, v2: 15750 },
  };

  const MIN_FINE_WITH_REVENUE = {
    leve: 3000,
    media: 6000,
    grave: 12000,
  };

  const MIN_FINE_WITHOUT_REVENUE = {
    leve: 1000,
    media: 2000,
    grave: 4000,
  };

  const MAX_FINE_CAP = 50000000;

  function normalizeClassification(classification) {
    const value = String(classification || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (value === 'leve') return CLASSIFICATIONS.LIGHT;
    if (value === 'media' || value === 'medio' || value === 'média') return CLASSIFICATIONS.MEDIUM;
    if (value === 'grave') return CLASSIFICATIONS.SERIOUS;

    throw new Error('Classificacao de cenario invalida.');
  }

  function normalizeAssessedEntityType(assessedEntityType) {
    const value = String(assessedEntityType || '').trim();
    if (Object.values(ASSESSED_ENTITY_TYPES).includes(value)) return value;
    throw new Error('Tipo de organizacao avaliada invalido.');
  }

  function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return 0;

    const sanitized = value.replace(/[^\d,.-]/g, '').trim();
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

  function toNonNegativeNumber(value) {
    return Math.max(0, toNumber(value));
  }

  function toCount(value) {
    return Math.max(0, Math.floor(toNonNegativeNumber(value)));
  }

  function roundCurrency(value) {
    if (!Number.isFinite(value)) return value;
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function clampDamageDegree(damageDegree) {
    const degree = Math.floor(toNumber(damageDegree));
    if (degree < 0 || degree > 3) {
      throw new Error('Grau do dano deve estar entre 0 e 3.');
    }
    return degree;
  }

  function getAliquotRange(classification) {
    return { ...ALIQUOT_RANGES[normalizeClassification(classification)] };
  }

  function calculateBaseAliquot(classification, damageDegree) {
    const degree = clampDamageDegree(damageDegree);
    const { a1, a2 } = getAliquotRange(classification);
    return ((a2 - a1) / 3) * degree + a1;
  }

  function calculateBaseValueWithRevenue(baseAliquot, revenue, taxes) {
    const netRevenue = Math.max(0, toNonNegativeNumber(revenue) - toNonNegativeNumber(taxes));
    return roundCurrency(toNonNegativeNumber(baseAliquot) * netRevenue);
  }

  function calculateBaseValueWithoutRevenue(classification, damageDegree) {
    const degree = clampDamageDegree(damageDegree);
    const range = ABSOLUTE_BASE_RANGES[normalizeClassification(classification)];
    return roundCurrency(((range.v2 - range.v1) / 3) * degree + range.v1);
  }

  function calculateAggravatingBreakdown(inputs = {}) {
    const specificRecidivism = Math.min(toCount(inputs.specificRecidivism), 4) * 0.1;
    const genericRecidivism = Math.min(toCount(inputs.genericRecidivism), 4) * 0.05;
    const orientationOrPreventiveMeasure = Math.min(toCount(inputs.orientationOrPreventiveMeasure), 4) * 0.2;
    const correctiveMeasure = Math.min(toCount(inputs.correctiveMeasure), 3) * 0.3;
    const total = specificRecidivism + genericRecidivism + orientationOrPreventiveMeasure + correctiveMeasure;

    return {
      total,
      factors: {
        specificRecidivism,
        genericRecidivism,
        orientationOrPreventiveMeasure,
        correctiveMeasure,
      },
    };
  }

  function calculateAggravatingPercentage(inputs = {}) {
    return calculateAggravatingBreakdown(inputs).total;
  }

  function calculateMitigatingBreakdown(inputs = {}) {
    const cessationMap = {
      none: 0,
      before_preparatory: 0.75,
      after_preparatory_before_sanctioning: 0.5,
      after_sanctioning_before_first_decision: 0.3,
    };
    const mitigationMap = {
      none: 0,
      before_preparatory_or_sanctioning: 0.2,
      after_preparatory_before_sanctioning: 0.1,
    };

    const cessation = cessationMap[inputs.cessationMoment] || 0;
    const governance = inputs.governanceProgram ? 0.2 : 0;
    const mitigationMeasures = mitigationMap[inputs.mitigationMeasuresMoment] || 0;
    const cooperation = inputs.cooperationOrGoodFaith ? 0.05 : 0;
    const total = cessation + governance + mitigationMeasures + cooperation;

    return {
      total,
      factors: {
        cessation,
        governance,
        mitigationMeasures,
        cooperation,
      },
    };
  }

  function calculateMitigatingPercentage(inputs = {}) {
    return calculateMitigatingBreakdown(inputs).total;
  }

  function calculateRawFine(baseValue, aggravating, mitigating) {
    const factor = Math.max(0, 1 + toNonNegativeNumber(aggravating) - toNonNegativeNumber(mitigating));
    return roundCurrency(toNonNegativeNumber(baseValue) * factor);
  }

  function calculateMinFine(classification, assessedEntityType, economicAdvantage) {
    const type = normalizeAssessedEntityType(assessedEntityType);
    const scenarioClassification = normalizeClassification(classification);
    const tableValue =
      type === ASSESSED_ENTITY_TYPES.LEGAL_WITH_REVENUE
        ? MIN_FINE_WITH_REVENUE[scenarioClassification]
        : MIN_FINE_WITHOUT_REVENUE[scenarioClassification];
    const advantageFloor = toNonNegativeNumber(economicAdvantage) > 0 ? toNonNegativeNumber(economicAdvantage) * 2 : 0;
    return roundCurrency(Math.max(tableValue, advantageFloor));
  }

  function calculateMaxFine(assessedEntityType, revenue, taxes) {
    const type = normalizeAssessedEntityType(assessedEntityType);
    if (type !== ASSESSED_ENTITY_TYPES.LEGAL_WITH_REVENUE) {
      return Number.POSITIVE_INFINITY;
    }

    const netRevenue = Math.max(0, toNonNegativeNumber(revenue) - toNonNegativeNumber(taxes));
    return roundCurrency(Math.min(netRevenue * 0.02, MAX_FINE_CAP));
  }

  function calculateFinalFine(rawFine, minFine, maxFine) {
    const raw = roundCurrency(toNonNegativeNumber(rawFine));
    const minimum = roundCurrency(toNonNegativeNumber(minFine));
    const maximum = Number.isFinite(maxFine) ? roundCurrency(toNonNegativeNumber(maxFine)) : Number.POSITIVE_INFINITY;

    if (raw < minimum) {
      return {
        value: minimum,
        appliedLimit: 'minimum',
        boundsInconsistent: Number.isFinite(maximum) && minimum > maximum,
      };
    }

    if (Number.isFinite(maximum) && raw > maximum) {
      return {
        value: maximum,
        appliedLimit: 'maximum',
        boundsInconsistent: minimum > maximum,
      };
    }

    return {
      value: raw,
      appliedLimit: 'none',
      boundsInconsistent: Number.isFinite(maximum) && minimum > maximum,
    };
  }

  function getRevenueBand(revenue) {
    const value = toNonNegativeNumber(revenue);
    if (!value) return 'Não informado / não aplicável';
    if (value <= 360000) return 'Até R$ 360 mil';
    if (value <= 4800000) return 'De R$ 360 mil a R$ 4,8 milhões';
    if (value <= 30000000) return 'De R$ 4,8 milhões a R$ 30 milhões';
    if (value <= 300000000) return 'De R$ 30 milhões a R$ 300 milhões';
    return 'Acima de R$ 300 milhões';
  }

  function calculateDosimetry(input = {}) {
    const assessedEntityType = normalizeAssessedEntityType(input.assessedEntityType);
    const scenarioClassification = normalizeClassification(input.scenarioClassification);
    const damageDegree = clampDamageDegree(input.damageDegree);
    const revenue = toNonNegativeNumber(input.revenue);
    const taxes = toNonNegativeNumber(input.taxes);
    const economicAdvantage = toNonNegativeNumber(input.economicAdvantage);
    const netRevenue = Math.max(0, revenue - taxes);
    const hasRevenue = assessedEntityType === ASSESSED_ENTITY_TYPES.LEGAL_WITH_REVENUE;

    const baseAliquot = hasRevenue ? calculateBaseAliquot(scenarioClassification, damageDegree) : null;
    const baseValue = hasRevenue
      ? calculateBaseValueWithRevenue(baseAliquot, revenue, taxes)
      : calculateBaseValueWithoutRevenue(scenarioClassification, damageDegree);

    const aggravating = calculateAggravatingBreakdown(input.aggravatingFactors || {});
    const mitigating = calculateMitigatingBreakdown(input.mitigatingFactors || {});
    const finalAdjustmentFactor = Math.max(0, 1 + aggravating.total - mitigating.total);
    const rawFine = calculateRawFine(baseValue, aggravating.total, mitigating.total);
    const minFine = calculateMinFine(scenarioClassification, assessedEntityType, economicAdvantage);
    const maxFine = calculateMaxFine(assessedEntityType, revenue, taxes);
    const finalFine = calculateFinalFine(rawFine, minFine, maxFine);

    return {
      assessedEntityType,
      scenarioClassification,
      damageDegree,
      revenue,
      taxes,
      netRevenue,
      economicAdvantage,
      revenueBand: hasRevenue ? getRevenueBand(revenue) : 'Não informado / não aplicável',
      baseAliquot,
      aliquotRange: hasRevenue ? getAliquotRange(scenarioClassification) : null,
      absoluteBaseRange: hasRevenue ? null : { ...ABSOLUTE_BASE_RANGES[scenarioClassification] },
      baseValue,
      aggravatingPercentage: aggravating.total,
      aggravatingFactors: aggravating.factors,
      mitigatingPercentage: mitigating.total,
      mitigatingFactors: mitigating.factors,
      finalAdjustmentFactor,
      rawFine,
      minFine,
      maxFine,
      estimatedFine: finalFine.value,
      appliedLimit: finalFine.appliedLimit,
      boundsInconsistent: finalFine.boundsInconsistent,
      warnings: {
        adjustmentBelowZero: 1 + aggravating.total - mitigating.total < 0,
        taxesExceedRevenue: hasRevenue && taxes > revenue,
        boundsInconsistent: finalFine.boundsInconsistent,
      },
    };
  }

  return {
    ASSESSED_ENTITY_TYPES,
    CLASSIFICATIONS,
    ALIQUOT_RANGES,
    ABSOLUTE_BASE_RANGES,
    MIN_FINE_WITH_REVENUE,
    MIN_FINE_WITHOUT_REVENUE,
    MAX_FINE_CAP,
    getAliquotRange,
    calculateBaseAliquot,
    calculateBaseValueWithRevenue,
    calculateBaseValueWithoutRevenue,
    calculateAggravatingPercentage,
    calculateMitigatingPercentage,
    calculateRawFine,
    calculateMinFine,
    calculateMaxFine,
    calculateFinalFine,
    calculateDosimetry,
    getRevenueBand,
    roundCurrency,
  };
});
