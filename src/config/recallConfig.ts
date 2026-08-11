export interface RecallRule {
  category: string;
  intervalMonths: number;
  reason: string;
  keywords: string[];
}

export const RECALL_RULES: RecallRule[] = [
  {
    category: 'scaling',
    intervalMonths: 6,
    reason: 'Preventive Scale & Polish',
    keywords: ['scaling', 'polish', 'cleaning', 'prophylaxis']
  },
  {
    category: 'rct',
    intervalMonths: 1,
    reason: 'Post-RCT Evaluation Review',
    keywords: ['rct', 'root canal']
  },
  {
    category: 'crown',
    intervalMonths: 12,
    reason: 'Crown & Bridge Integrity Check',
    keywords: ['crown', 'bridge', 'cap', 'prosthetic']
  },
  {
    category: 'implant',
    intervalMonths: 6,
    reason: 'Implant Osseointegration Monitor',
    keywords: ['implant']
  },
  {
    category: 'filling',
    intervalMonths: 12,
    reason: 'Restorative Filling Checkup',
    keywords: ['filling', 'composite', 'restorative']
  }
];

export const DEFAULT_RECALL_RULE: RecallRule = {
  category: 'other',
  intervalMonths: 6,
  reason: 'Routine Preventive Dental Care',
  keywords: []
};

export function getRecallRule(treatmentText: string): RecallRule {
  const txt = (treatmentText || '').toLowerCase();
  for (const rule of RECALL_RULES) {
    if (rule.keywords.some(kw => txt.includes(kw))) {
      return rule;
    }
  }
  return DEFAULT_RECALL_RULE;
}
