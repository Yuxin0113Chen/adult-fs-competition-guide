const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {validateProgram} = require('../src/planner-engine');

const root = path.resolve(__dirname, '..');
const rulesDir = path.join(root, 'data', 'rules');

function readJson(file){
  return JSON.parse(fs.readFileSync(path.join(rulesDir, file), 'utf8'));
}

const manifest = readJson('manifest.json');
const baseValues = readJson(manifest.baseValues).values;
const rules = {};

for(const [region, file] of Object.entries(manifest.regions)){
  rules[region] = readJson(file).plannerRules;
}

function messages(result){
  return result.warnings.map(warning => warning.text).join('\n');
}

function hasMessage(result, fragment){
  return messages(result).includes(fragment);
}

function approx(actual, expected){
  assert.ok(Math.abs(actual - expected) < 0.001, `Expected ${expected}, got ${actual}`);
}

function test(name, fn){
  try{
    fn();
    console.log(`ok - ${name}`);
  }catch(error){
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('versioned rule files expose Canada and ISU planner rules', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(rules.canada['Adult Bronze Free Skating']);
  assert.ok(rules.isu['Bronze Free Skating']);
  assert.ok(baseValues.jumps['1A'] > 0);
});

test('base value totals combine jumps, spins, and sequences', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Bronze Free Skating',
    elements:['1S+1T', 'SSpB', 'ChSq1'],
    rules,
    baseValues
  });
  approx(result.total, 4.90);
});

test('invalid jump is flagged for Canada Intro', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Intro Open Free Skating',
    elements:['1Lz', '1W', 'SpSq'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, '1Lz is outside the listed jump allowance'));
});

test('repeat rule catches jumps used more than twice', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Bronze Free Skating',
    elements:['1Lz', '1Lz', '1Lz', 'ChSq1'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, '1Lz appears 3 times'));
});

test('Canada repeat rule rejects two solo occurrences and removes the second estimate', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Bronze Free Skating',
    elements:['1Lz', '1Lz', 'ChSq1'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, 'if a jump is repeated it must be in combination'));
  approx(result.total, 3.60);
});

test('Canada repeat rule accepts a repeated jump when one occurrence is in a combination', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Bronze Free Skating',
    elements:['1Lz+1T', '1Lz', 'ChSq1'],
    rules,
    baseValues
  });
  assert.equal(hasMessage(result, 'if a jump is repeated it must be in combination'), false);
});

test('combo limits catch too many jumps in Intro', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Intro Open Free Skating',
    elements:['1W+1T+1S', 'SpSq'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, 'allows maximum 2 jumps'));
});

test('Canada Bronze permits maximum one jump combination in 2026-2027', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Bronze Free Skating',
    elements:['1Lz+1T', '1F+1Lo', 'ChSq1'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, 'allows maximum 1'));
});

test('Canada Masters requires single Axel specifically', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Masters Free Skating',
    elements:['2A', 'CCoSp1', 'FSSp1', 'USp1', 'StSq1'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, 'requires 1A'));
});

test('Canada Bronze requires two one-position spins with different codes', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Bronze Free Skating',
    elements:['1Lz', 'USp1', 'USp2', 'ChSq1'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, 'requires different spin codes'));
});

test('spin level cap estimates ISU Bronze spins at allowed cap', () => {
  const result = validateProgram({
    region:'isu',
    category:'Bronze Free Skating',
    elements:['SSp4', 'ChSq1'],
    rules,
    baseValues
  });
  approx(result.rows[0].bv, 1.30);
  assert.ok(hasMessage(result, 'above the category cap'));
});

test('ISU Silver uses four jump elements and seven planned elements', () => {
  assert.equal(rules.isu['Silver Free Skating'].maxJumps, 4);
  assert.equal(rules.isu['Silver Free Skating'].programElements, 7);
});

test('ISU Gold, Masters, and Masters Elite use five jump elements and nine planned elements', () => {
  for(const category of ['Gold Free Skating', 'Masters Free Skating', 'Masters Elite Free Skating']){
    assert.equal(rules.isu[category].maxJumps, 5);
    assert.equal(rules.isu[category].programElements, 9);
    assert.equal(rules.isu[category].maxCombos, 2);
  }
});

test('flying spin is flagged where not permitted', () => {
  const result = validateProgram({
    region:'isu',
    category:'Bronze Free Skating',
    elements:['FSSp1', 'ChSq1'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, 'flying spins are not permitted'));
});

test('sequence requirement flags the wrong sequence type', () => {
  const result = validateProgram({
    region:'canada',
    category:'Adult Intro Open Free Skating',
    elements:['1W', 'ChSq1'],
    rules,
    baseValues
  });
  assert.ok(hasMessage(result, 'ChSq1 is not the listed sequence'));
});
