export const LIKERT_SCORE = {
  'Strongly Disagree': 1,
  'Disagree': 2,
  'Neutral / Unsure': 3,
  'Agree': 4,
  'Strongly Agree': 5
};

export const CONFIDENCE_SCORE = { 
  'Low Confidence': 1, 
  'Moderate Confidence': 3, 
  'High Confidence': 5 
};

export const EVIDENCE_SCORE = { 
  'No Formal Evidence': 1, 
  'Limited Evidence': 2, 
  'Some Evidence': 3, 
  'Significant Evidence': 4, 
  'Extensive Evidence': 5 
};

export const DOMAIN_CONFIG = [
  { partId: 's2_domain1', name: 'Strategic Readiness', qIds: ['D1_Q1','D1_Q2','D1_Q3','D1_Q4','D1_Q5','D1_Q6','D1_Q7','D1_Q8','D1_Q9','D1_Q10','D1_Q11'], confId: 'D1_conf', evidId: 'D1_evid' },
  { partId: 's2_domain2', name: 'Leadership Readiness', qIds: ['D2_Q12','D2_Q13','D2_Q14','D2_Q15','D2_Q16','D2_Q17','D2_Q18','D2_Q19','D2_Q20','D2_Q21','D2_Q22'], confId: 'D2_conf', evidId: 'D2_evid' },
  { partId: 's2_domain3', name: 'Signal Readiness', qIds: ['D3_Q23','D3_Q24','D3_Q25','D3_Q26','D3_Q27','D3_Q28','D3_Q29','D3_Q30','D3_Q31','D3_Q32','D3_Q33'], confId: 'D3_conf', evidId: 'D3_evid' },
  { partId: 's2_domain4', name: 'Decision Intelligence', qIds: ['D4_Q34','D4_Q35','D4_Q36','D4_Q37','D4_Q38','D4_Q39','D4_Q40','D4_Q41','D4_Q42','D4_Q43','D4_Q44'], confId: 'D4_conf', evidId: 'D4_evid' },
  { partId: 's2_domain5', name: 'Problem Framing', qIds: ['D5_Q45','D5_Q46','D5_Q47','D5_Q48','D5_Q49','D5_Q50','D5_Q51','D5_Q52','D5_Q53','D5_Q54','D5_Q55'], confId: 'D5_conf', evidId: 'D5_evid' },
  { partId: 's2_domain6', name: 'Governance Readiness', qIds: ['D6_Q56','D6_Q57','D6_Q58','D6_Q59','D6_Q60','D6_Q61','D6_Q62','D6_Q63','D6_Q64','D6_Q65','D6_Q66'], confId: 'D6_conf', evidId: 'D6_evid' },
  { partId: 's2_domain7', name: 'AI Governance', qIds: ['D7_Q67','D7_Q68','D7_Q69','D7_Q70','D7_Q71','D7_Q72','D7_Q73','D7_Q74','D7_Q75','D7_Q76','D7_Q77'], confId: 'D7_conf', evidId: 'D7_evid' },
  { partId: 's2_domain8', name: 'Workforce Readiness', qIds: ['D8_Q78','D8_Q79','D8_Q80','D8_Q81','D8_Q82','D8_Q83','D8_Q84','D8_Q85','D8_Q86','D8_Q87','D8_Q88'], confId: 'D8_conf', evidId: 'D8_evid' },
  { partId: 's2_domain9', name: 'Learning Velocity', qIds: ['D9_Q89','D9_Q90','D9_Q91','D9_Q92','D9_Q93','D9_Q94','D9_Q95','D9_Q96','D9_Q97','D9_Q98','D9_Q99'], confId: 'D9_conf', evidId: 'D9_evid' },
  { partId: 's2_domain10', name: 'Adaptive Capacity', qIds: ['D10_Q100','D10_Q101','D10_Q102','D10_Q103','D10_Q104','D10_Q105','D10_Q106','D10_Q107','D10_Q108','D10_Q109','D10_Q110'], confId: 'D10_conf', evidId: 'D10_evid' },
  { partId: 's2_domain11', name: 'Ecosystem Readiness', qIds: ['D11_Q111','D11_Q112','D11_Q113','D11_Q114','D11_Q115','D11_Q116','D11_Q117','D11_Q118','D11_Q119','D11_Q120','D11_Q121'], confId: 'D11_conf', evidId: 'D11_evid' },
  { partId: 's2_domain12', name: 'Strategic Integrity', qIds: ['D12_Q122','D12_Q123','D12_Q124','D12_Q125','D12_Q126','D12_Q127','D12_Q128','D12_Q129','D12_Q130','D12_Q131','D12_Q132'], confId: 'D12_conf', evidId: 'D12_evid' }
];

export function computeDomainScores(responses) {
  return DOMAIN_CONFIG.map(domain => {
    const partResponses = responses?.[domain.partId] || {};
    
    const friScores = domain.qIds
      .map(qId => LIKERT_SCORE[partResponses[qId]] || null)
      .filter(s => s !== null);

    const friAvg = friScores.length > 0
      ? parseFloat((friScores.reduce((a, b) => a + b, 0) / friScores.length).toFixed(2))
      : 0;

    const confRaw = partResponses[domain.confId];
    const evidRaw = partResponses[domain.evidId];
    
    const confVal = CONFIDENCE_SCORE[confRaw] || null;
    const evidVal = EVIDENCE_SCORE[evidRaw] || null;
    
    let criAvg = 0;
    if (confVal !== null && evidVal !== null) {
      criAvg = parseFloat(((confVal + evidVal) / 2).toFixed(2));
    } else if (confVal !== null) {
      criAvg = parseFloat(confVal.toFixed(2));
    } else if (evidVal !== null) {
      criAvg = parseFloat(evidVal.toFixed(2));
    }

    return { 
      name: domain.name, 
      avg: friAvg, 
      fri: friAvg,
      cri: criAvg,
      answered: friScores.length, 
      total: domain.qIds.length,
      confRaw,
      evidRaw
    };
  });
}

export function scoreToBand(score) {
  if (score >= 4.5) return { label: 'Highly Ready', color: '#00e676' };
  if (score >= 3.5) return { label: 'Ready', color: '#69f0ae' };
  if (score >= 2.5) return { label: 'Developing', color: '#ffc800' };
  if (score >= 1.5) return { label: 'At Risk', color: '#ff9800' };
  return { label: 'Critical Gap', color: '#ff1744' };
}
