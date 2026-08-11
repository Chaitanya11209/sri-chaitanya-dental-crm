export const DENTAL_PROBLEMS = [
  'General Dental Consultation',
  'Dental Check-up',
  'Tooth Pain',
  'Tooth Decay / Cavity',
  'Scaling / Teeth Cleaning',
  'Composite Filling',
  'Root Canal Treatment (RCT)',
  'RCT Follow-up',
  'RCT Post-Endodontic Restoration',
  'Crown Fixing',
  'Crown / Bridge Consultation',
  'Tooth Extraction',
  'Wisdom Tooth Problem',
  'Gum Problem / Bleeding Gums',
  'Tooth Sensitivity',
  'Missing Tooth / Implant Consultation',
  'Teeth Whitening / Cosmetic Consultation',
  'Other',
] as const;

export type DentalProblem = (typeof DENTAL_PROBLEMS)[number];
