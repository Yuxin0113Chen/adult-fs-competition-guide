function slotCount(rule){
  return rule.programElements || (rule.maxJumps + rule.maxSpins + 1);
}

function sequenceCode(rule){
  if(rule.sequence === 'StSq') return 'StSqB';
  if(rule.sequence === 'ChSq') return 'ChSq1';
  return 'SpSq';
}

function sequenceLabel(type){
  return {ChSq:'Choreographic sequence', StSq:'Step sequence', SpSq:'Spiral sequence'}[type] || 'Sequence';
}

function isSequenceAllowed(code, rule){
  if(rule.sequence === 'StSq') return /^StSq(B|[1-4])$/.test(code);
  if(rule.sequence === 'ChSq') return code === 'ChSq1';
  if(rule.sequence === 'SpSq') return code === 'SpSq';
  return false;
}

function jumpBaseValue(jump, rule, baseValues){
  if((rule.ignoredJumps || []).includes(jump)) return 0;
  return baseValues.jumps[jump] || 0;
}

function spinBaseValue(spinCode, level, rule, baseValues){
  const normalizedLevel = String(level || '1');
  const numericLevel = normalizedLevel === 'B' ? 0 : Number(normalizedLevel);
  const cappedLevel = rule.maxSpinLevel && numericLevel > rule.maxSpinLevel ? String(rule.maxSpinLevel) : normalizedLevel;
  return baseValues.spins[spinCode]?.[cappedLevel] || 0;
}

function sequenceBaseValue(code, baseValues){
  return baseValues.sequences[code] ?? 0;
}

function splitJumpElement(code){
  const raw = String(code || '').trim();
  if(!raw) return {type:'empty', value:''};
  const separator = raw.includes('+') ? '+' : raw.includes('+SEQ') ? '+SEQ' : '';
  if(raw.includes('+')){
    return {
      type:'jump',
      kind: raw.includes('+SEQ') ? 'sequence' : 'combo',
      value: raw,
      jumps: raw.replace(/\+SEQ/g, '+').split('+').filter(Boolean)
    };
  }
  return {type:'jump', kind:'solo', value:raw, jumps:[raw]};
}

function parseSpin(code){
  const match = String(code || '').match(/^(CCoSp|CoSp|FUSp|FSSp|FCSp|USp|SSp|CSp|LSp)(B|[1-4])$/);
  if(!match) return null;
  return {type:'spin', value:code, spinCode:match[1], spinLevel:match[2]};
}

function parseSequence(code, baseValues){
  if(Object.prototype.hasOwnProperty.call(baseValues.sequences, code)){
    return {type:'sequence', value:code};
  }
  return null;
}

function parseElement(input, baseValues){
  if(typeof input === 'object' && input) return input;
  const code = String(input || '').trim();
  if(!code) return {type:'empty', value:''};
  return parseSpin(code) || parseSequence(code, baseValues) || splitJumpElement(code);
}

function isAxelTypeJump(jump, region){
  if(!jump) return false;
  if(jump.includes('A')) return true;
  return region === 'canada' && jump === '1W';
}

function addWarning(warnings, type, text, row){
  warnings.push({type, text, row});
}

function validateProgram({region, category, elements, rules, baseValues}){
  const rule = rules?.[region]?.[category];
  if(!rule) throw new Error(`Missing planner rule for ${region}:${category}`);

  const parsed = elements.map(element => parseElement(element, baseValues));
  const planned = parsed.filter(element => element.type && element.type !== 'empty');
  const selectedJumps = planned.filter(element => element.type === 'jump' && element.jumps?.length);
  const selectedSpins = planned.filter(element => element.type === 'spin');
  const selectedSequences = planned.filter(element => element.type === 'sequence');
  const warnings = [];
  const rows = [];
  const jumpCounts = {};
  const spinCodes = {};
  let total = 0;
  let comboCount = 0;
  let threeJumpCombos = 0;
  let hasAxel = false;
  let hasRequiredWaltz = false;
  let hasFlyingSpin = false;
  let hasChangeFootCombo = false;

  if(planned.length > slotCount(rule)){
    addWarning(warnings, 'error', `You added ${planned.length} elements. This category lists ${slotCount(rule)} planned element rows.`);
  }
  if(selectedJumps.length > rule.maxJumps){
    addWarning(warnings, 'error', `You planned ${selectedJumps.length} jump elements. This category allows maximum ${rule.maxJumps}.`);
  }
  if(selectedSpins.length > rule.maxSpins){
    addWarning(warnings, 'error', `You planned ${selectedSpins.length} spins. This category allows maximum ${rule.maxSpins}.`);
  }
  if(!selectedSequences.length){
    addWarning(warnings, 'caution', `${sequenceLabel(rule.sequence)} is not selected.`);
  }
  if(selectedSequences.length > 1){
    addWarning(warnings, 'error', `You planned ${selectedSequences.length} sequence elements.`);
  }

  parsed.forEach((element, index) => {
    if(!element.type || element.type === 'empty') return;
    let rowInfo = '';
    let rowWarningsBefore = warnings.length;
    const rowNumber = index + 1;

    if(element.type === 'jump'){
      const jumps = element.jumps || [];
      const code = element.value;
      let bv = jumps.reduce((sum, jump) => sum + jumpBaseValue(jump, rule, baseValues), 0);

      if(element.kind !== 'solo') comboCount += 1;
      if(jumps.length >= 3) threeJumpCombos += 1;
      if(element.kind !== 'solo' && jumps.length < 2){
        addWarning(warnings, 'caution', `${code} is marked as ${element.kind}, but only one jump is selected.`, rowNumber);
      }
      if(rule.maxComboJumps && jumps.length > rule.maxComboJumps){
        addWarning(warnings, 'error', `${code} has ${jumps.length} jumps; this category allows maximum ${rule.maxComboJumps} jumps in a combination or sequence.`, rowNumber);
      }
      if(rule.jumpSequences === false && element.kind === 'sequence'){
        addWarning(warnings, 'error', `${code} is a jump sequence. Jump sequences are not listed for ${category}.`, rowNumber);
      }

      jumps.forEach(jump => {
        jumpCounts[jump] = (jumpCounts[jump] || 0) + 1;
        if(isAxelTypeJump(jump, region)) hasAxel = true;
        if(jump === '1W') hasRequiredWaltz = true;
        if((rule.disallowedJumps || []).includes(jump)){
          addWarning(warnings, 'error', `${jump} is not permitted in ${category}.`, rowNumber);
        }
        if(rule.allowedJumps && !rule.allowedJumps.includes(jump) && !(rule.ignoredJumps || []).includes(jump)){
          addWarning(warnings, 'error', `${jump} is outside the listed jump allowance for ${category}.`, rowNumber);
        }
      });

      total += bv;
      if(warnings.length > rowWarningsBefore) rowInfo = '!';
      rows.push({number:rowNumber, code, bv, info:rowInfo});
    }

    if(element.type === 'spin'){
      const level = element.spinLevel || '1';
      const bv = spinBaseValue(element.spinCode, level, rule, baseValues);
      const numericLevel = level === 'B' ? 0 : Number(level);
      const capped = rule.maxSpinLevel && numericLevel > rule.maxSpinLevel;
      spinCodes[element.spinCode] = (spinCodes[element.spinCode] || 0) + 1;
      if(element.spinCode.startsWith('F')) hasFlyingSpin = true;
      if(element.spinCode === 'CCoSp') hasChangeFootCombo = true;
      if(capped){
        addWarning(warnings, 'caution', `${element.spinCode} Level ${level} is above the category cap. The estimate uses Level ${rule.maxSpinLevel}.`, rowNumber);
      }
      if(element.spinCode.startsWith('F') && rule.spinsFlying === false){
        addWarning(warnings, 'error', `${element.spinCode} is a flying spin, and flying spins are not permitted in this category.`, rowNumber);
      }
      total += bv;
      if(warnings.length > rowWarningsBefore) rowInfo = '!';
      rows.push({number:rowNumber, code:`${element.spinCode}${level}`, bv, info:rowInfo});
    }

    if(element.type === 'sequence'){
      const allowed = isSequenceAllowed(element.value, rule);
      const bv = sequenceBaseValue(element.value, baseValues);
      if(!allowed){
        addWarning(warnings, 'error', `${element.value} is not the listed sequence for ${category}. This level lists ${sequenceCode(rule)}.`, rowNumber);
      }
      total += bv;
      if(warnings.length > rowWarningsBefore) rowInfo = '!';
      rows.push({number:rowNumber, code:element.value, bv, info:rowInfo});
    }
  });

  if(comboCount > rule.maxCombos){
    addWarning(warnings, 'error', `You planned ${comboCount} combinations/sequences. This category allows maximum ${rule.maxCombos}.`);
  }
  if(rule.maxOneThreeJumpCombo && threeJumpCombos > 1){
    addWarning(warnings, 'error', 'Only one combination or sequence may contain three jumps.');
  }
  if(rule.requiredJumps?.includes('1W') && !hasRequiredWaltz){
    addWarning(warnings, 'error', 'This category requires a Waltz jump.');
  }
  if(rule.requiredJumpType === 'axel' && !hasAxel){
    addWarning(warnings, 'error', 'This category requires an Axel-type jump.');
  }
  Object.entries(jumpCounts).forEach(([jump, count]) => {
    if(count > 2){
      addWarning(warnings, 'error', `${jump} appears ${count} times. Adult free skate repeat rules normally allow a listed jump no more than twice.`);
    }
  });
  Object.entries(spinCodes).forEach(([code, count]) => {
    if(count > 1){
      addWarning(warnings, 'caution', `${code} appears more than once. Spins usually need different codes to both count cleanly.`);
    }
  });
  if(rule.spinRequired?.includes('CCoSp') && !hasChangeFootCombo){
    addWarning(warnings, 'caution', 'This category expects a combination spin with change of foot.');
  }
  if(rule.spinRequired?.includes('F') && !hasFlyingSpin){
    addWarning(warnings, 'caution', 'This category expects a flying spin or spin with flying entrance.');
  }

  return {rows, total:Number(total.toFixed(2)), warnings};
}

module.exports = {
  parseElement,
  sequenceCode,
  slotCount,
  validateProgram
};
