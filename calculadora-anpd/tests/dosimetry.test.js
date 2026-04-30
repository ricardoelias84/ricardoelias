const test = require('node:test');
const assert = require('node:assert/strict');
const dosimetry = require('../src/lib/dosimetry.js');

function closeTo(actual, expected, delta = 0.01) {
  assert.ok(Math.abs(actual - expected) <= delta, `expected ${actual} to be close to ${expected}`);
}

test('calcula aliquota-base para cenarios leves com GD 0, 1, 2 e 3', () => {
  const expected = [0.0008, 0.0010333333333333334, 0.0012666666666666666, 0.0015];
  expected.forEach((value, damageDegree) => {
    closeTo(dosimetry.calculateBaseAliquot('leve', damageDegree), value, 0.0000001);
  });
});

test('calcula aliquota-base para cenarios medios com GD 0, 1, 2 e 3', () => {
  const expected = [0.0013, 0.002533333333333333, 0.0037666666666666664, 0.005];
  expected.forEach((value, damageDegree) => {
    closeTo(dosimetry.calculateBaseAliquot('media', damageDegree), value, 0.0000001);
  });
});

test('calcula aliquota-base para cenarios graves com GD 0, 1, 2 e 3', () => {
  const expected = [0.0045, 0.008, 0.0115, 0.015];
  expected.forEach((value, damageDegree) => {
    closeTo(dosimetry.calculateBaseAliquot('grave', damageDegree), value, 0.0000001);
  });
});

test('calcula valor-base com faturamento', () => {
  const baseAliquot = dosimetry.calculateBaseAliquot('grave', 3);
  assert.equal(dosimetry.calculateBaseValueWithRevenue(baseAliquot, 1000000, 100000), 13500);
});

test('calcula valor-base sem faturamento', () => {
  assert.equal(dosimetry.calculateBaseValueWithoutRevenue('leve', 3), 3500);
  assert.equal(dosimetry.calculateBaseValueWithoutRevenue('media', 3), 7000);
  assert.equal(dosimetry.calculateBaseValueWithoutRevenue('grave', 3), 15750);
});

test('aplica agravantes com limites por fator', () => {
  const total = dosimetry.calculateAggravatingPercentage({
    specificRecidivism: 12,
    genericRecidivism: 9,
    orientationOrPreventiveMeasure: 8,
    correctiveMeasure: 7,
  });
  closeTo(total, 2.3);
});

test('aplica atenuantes cumulativas', () => {
  const total = dosimetry.calculateMitigatingPercentage({
    cessationMoment: 'after_preparatory_before_sanctioning',
    governanceProgram: true,
    mitigationMeasuresMoment: 'after_preparatory_before_sanctioning',
    cooperationOrGoodFaith: true,
  });
  closeTo(total, 0.85);
});

test('aplica limite minimo quando valor antes dos limites fica abaixo do piso', () => {
  const result = dosimetry.calculateDosimetry({
    assessedEntityType: 'legal_with_revenue',
    revenue: 1000000,
    taxes: 0,
    scenarioClassification: 'leve',
    damageDegree: 0,
  });
  assert.equal(result.rawFine, 800);
  assert.equal(result.estimatedFine, 3000);
  assert.equal(result.appliedLimit, 'minimum');
});

test('aplica limite maximo quando valor antes dos limites supera o teto', () => {
  const result = dosimetry.calculateDosimetry({
    assessedEntityType: 'legal_with_revenue',
    revenue: 10000000,
    taxes: 0,
    scenarioClassification: 'grave',
    damageDegree: 3,
    aggravatingFactors: {
      specificRecidivism: 4,
      genericRecidivism: 4,
      orientationOrPreventiveMeasure: 4,
      correctiveMeasure: 3,
    },
  });
  assert.equal(result.rawFine, 495000);
  assert.equal(result.maxFine, 200000);
  assert.equal(result.estimatedFine, 200000);
  assert.equal(result.appliedLimit, 'maximum');
});

test('mantem valor quando nenhum limite precisa ser aplicado', () => {
  const result = dosimetry.calculateDosimetry({
    assessedEntityType: 'legal_with_revenue',
    revenue: 10000000,
    taxes: 0,
    scenarioClassification: 'media',
    damageDegree: 0,
  });
  assert.equal(result.rawFine, 13000);
  assert.equal(result.estimatedFine, 13000);
  assert.equal(result.appliedLimit, 'none');
});

test('usa dobro da vantagem economica estimavel como piso quando aplicavel', () => {
  const result = dosimetry.calculateDosimetry({
    assessedEntityType: 'legal_with_revenue',
    revenue: 10000000,
    taxes: 0,
    economicAdvantage: 100000,
    scenarioClassification: 'leve',
    damageDegree: 0,
  });
  assert.equal(result.minFine, 200000);
  assert.equal(result.estimatedFine, 200000);
});

test('zera valor antes dos limites quando atenuantes superam agravantes', () => {
  const result = dosimetry.calculateDosimetry({
    assessedEntityType: 'natural_person',
    scenarioClassification: 'leve',
    damageDegree: 0,
    mitigatingFactors: {
      cessationMoment: 'before_preparatory',
      governanceProgram: true,
      mitigationMeasuresMoment: 'before_preparatory_or_sanctioning',
      cooperationOrGoodFaith: true,
    },
  });
  assert.equal(result.rawFine, 0);
  assert.equal(result.estimatedFine, 1000);
  assert.equal(result.warnings.adjustmentBelowZero, true);
});

test('calcula caso de pessoa natural', () => {
  const result = dosimetry.calculateDosimetry({
    assessedEntityType: 'natural_person',
    scenarioClassification: 'grave',
    damageDegree: 3,
  });
  assert.equal(result.baseValue, 15750);
  assert.equal(result.estimatedFine, 15750);
  assert.equal(Number.isFinite(result.maxFine), false);
});

test('calcula caso de pessoa juridica sem faturamento', () => {
  const result = dosimetry.calculateDosimetry({
    assessedEntityType: 'legal_without_revenue',
    scenarioClassification: 'media',
    damageDegree: 3,
  });
  assert.equal(result.baseValue, 7000);
  assert.equal(result.estimatedFine, 7000);
  assert.equal(result.minFine, 2000);
});
