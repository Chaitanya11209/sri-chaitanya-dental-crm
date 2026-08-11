/**
 * Utility functions for Patient DOB, Age, and Phone calculations
 */

export function normalizeIndianPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const raw = String(phone).trim();
  // Check if original contains letters
  const digitsOnly = raw.replace(/\D/g, '');
  
  // If digitsOnly starts with 91 and total digit count is 12, strip leading 91
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
}

export function validateIndianPhone(phone: string | null | undefined): { isValid: boolean; normalizedPhone: string; error?: string } {
  if (!phone || !String(phone).trim()) {
    return { isValid: false, normalizedPhone: '', error: 'Mobile number is required.' };
  }
  const raw = String(phone).trim();
  // Check if raw input contains non-allowed characters like letters
  if (/[a-zA-Z]/.test(raw)) {
    return { isValid: false, normalizedPhone: '', error: 'Please enter a valid 10-digit mobile number.' };
  }

  const normalized = normalizeIndianPhone(phone);

  if (normalized.length !== 10) {
    return { isValid: false, normalizedPhone: normalized, error: 'Mobile number must contain exactly 10 digits.' };
  }

  if (!/^\d{10}$/.test(normalized)) {
    return { isValid: false, normalizedPhone: normalized, error: 'Please enter a valid 10-digit mobile number.' };
  }

  return { isValid: true, normalizedPhone: normalized };
}

export function formatWhatsAppPhone(phone: string | null | undefined): string {
  const normalized = normalizeIndianPhone(phone);
  if (normalized.length === 10) {
    return `91${normalized}`;
  }
  return normalized;
}

export function calculateAgeFromDOB(dobString: string | null | undefined): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function validateDOB(dobString: string | null | undefined): { isValid: boolean; error?: string } {
  if (!dobString) return { isValid: true };
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return { isValid: false, error: 'Invalid date format' };

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (birthDate > today) {
    return { isValid: false, error: 'Date of Birth cannot be in the future' };
  }

  const minDate = new Date('1890-01-01');
  if (birthDate < minDate) {
    return { isValid: false, error: 'Please enter a valid Date of Birth' };
  }

  return { isValid: true };
}

export function validatePatientName(name: string | null | undefined): { isValid: boolean; error?: string; normalizedName: string } {
  if (!name || !String(name).trim()) {
    return { isValid: false, error: 'Patient name is required.', normalizedName: '' };
  }
  const trimmed = String(name).trim();
  if (/^[^\w\s]+$/.test(trimmed) || (trimmed.length < 2 && !/^[a-zA-Z]$/.test(trimmed))) {
    return { isValid: false, error: 'Please enter a valid patient name.', normalizedName: trimmed };
  }
  return { isValid: true, normalizedName: trimmed };
}

export function normalizeLocation(loc: string | null | undefined): string {
  if (!loc) return '';
  return String(loc).trim().replace(/\s+/g, ' ');
}

export function validateLocation(loc: string | null | undefined): { isValid: boolean; error?: string; normalizedLocation: string } {
  const normalized = normalizeLocation(loc);
  if (!normalized) {
    return { isValid: false, error: 'Location is required.', normalizedLocation: '' };
  }
  return { isValid: true, normalizedLocation: normalized };
}

export function validatePatientGender(gender: string | null | undefined): { isValid: boolean; error?: string } {
  if (!gender || !String(gender).trim() || String(gender).trim().toLowerCase() === 'select gender') {
    return { isValid: false, error: 'Please select gender.' };
  }
  return { isValid: true };
}

export function validatePatientAgeOrDOB(age: string | number | null | undefined, dob: string | null | undefined): { isValid: boolean; error?: string; ageNum: number | null; dobStr: string | null } {
  const dobStr = dob && String(dob).trim() ? String(dob).trim() : null;
  if (dobStr) {
    const dobCheck = validateDOB(dobStr);
    if (!dobCheck.isValid) {
      return { isValid: false, error: dobCheck.error || 'Invalid Date of Birth', ageNum: null, dobStr };
    }
    const computedAge = calculateAgeFromDOB(dobStr);
    return { isValid: true, ageNum: computedAge, dobStr };
  }

  if (age !== undefined && age !== null && String(age).trim() !== '') {
    const ageStr = String(age).trim();
    if (/[a-zA-Z]/.test(ageStr)) {
      return { isValid: false, error: 'Age must be a valid number.', ageNum: null, dobStr: null };
    }
    const num = parseInt(ageStr, 10);
    if (isNaN(num) || num < 0 || num > 120) {
      return { isValid: false, error: 'Please enter a valid age between 0 and 120.', ageNum: null, dobStr: null };
    }
    return { isValid: true, ageNum: num, dobStr: null };
  }

  return { isValid: false, error: 'Age or Date of Birth is required.', ageNum: null, dobStr: null };
}

export function validatePatientRegistration(data: {
  name?: string;
  phone?: string;
  dob?: string;
  age?: string | number;
  gender?: string;
  location?: string;
  email?: string;
}): { isValid: boolean; errors: Record<string, string>; normalizedData: any } {
  const errors: Record<string, string> = {};

  const nameVal = validatePatientName(data.name);
  if (!nameVal.isValid) errors.name = nameVal.error!;

  const phoneVal = validateIndianPhone(data.phone);
  if (!phoneVal.isValid) errors.phone = phoneVal.error!;

  const ageDobVal = validatePatientAgeOrDOB(data.age, data.dob);
  if (!ageDobVal.isValid) errors.ageDob = ageDobVal.error!;

  const genderVal = validatePatientGender(data.gender);
  if (!genderVal.isValid) errors.gender = genderVal.error!;

  const locVal = validateLocation(data.location);
  if (!locVal.isValid) errors.location = locVal.error!;

  if (data.email && String(data.email).trim() !== '') {
    const emailStr = String(data.email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    normalizedData: {
      name: nameVal.normalizedName,
      phone: phoneVal.normalizedPhone,
      date_of_birth: ageDobVal.dobStr,
      age: ageDobVal.ageNum,
      gender: data.gender ? String(data.gender).trim() : '',
      location: locVal.normalizedLocation,
      email: data.email ? String(data.email).trim() : '',
    }
  };
}

export function getPatientDOB(patient: any, parsedMetadata?: any): string | null {
  if (!patient) return null;

  // 1. Canonical DB column
  if (patient.date_of_birth) return String(patient.date_of_birth).trim();

  // 2. Metadata / parsed DOB
  if (parsedMetadata?.dob) return String(parsedMetadata.dob).trim();
  if (patient.dob) return String(patient.dob).trim();

  // 3. Fallback: parsed notes
  if (patient.notes && typeof patient.notes === 'string') {
    if (patient.notes.startsWith('{') && patient.notes.endsWith('}')) {
      try {
        const obj = JSON.parse(patient.notes);
        if (obj.dob) return String(obj.dob).trim();
      } catch (e) {}
    } else if (patient.notes.startsWith('DOB:')) {
      const splitIdx = patient.notes.indexOf('|');
      if (splitIdx !== -1) {
        return patient.notes.substring(4, splitIdx).trim();
      } else {
        return patient.notes.substring(4).trim();
      }
    }
  }

  return null;
}

export function getPatientAgeDisplay(patient: any, parsedMetadata?: any): string {
  if (!patient) return 'Age not provided';

  const dob = getPatientDOB(patient, parsedMetadata);
  if (dob) {
    const computedAge = calculateAgeFromDOB(dob);
    if (computedAge !== null) {
      return `${computedAge} Yrs`;
    }
  }

  // Legacy age fallback
  const legacyAge = patient.age ?? parsedMetadata?.age;
  if (legacyAge !== undefined && legacyAge !== null && String(legacyAge).trim() !== '' && String(legacyAge).trim() !== '-') {
    const trimmedAge = String(legacyAge).trim();
    if (trimmedAge.toLowerCase().includes('yr')) return trimmedAge;
    return `${trimmedAge} Yrs`;
  }

  return 'Age not provided';
}

export function getPatientAgeNumber(patient: any, parsedMetadata?: any): number | null {
  if (!patient) return null;

  const dob = getPatientDOB(patient, parsedMetadata);
  if (dob) {
    const computedAge = calculateAgeFromDOB(dob);
    if (computedAge !== null) {
      return computedAge;
    }
  }

  const legacyAge = patient.age ?? parsedMetadata?.age;
  if (legacyAge !== undefined && legacyAge !== null && String(legacyAge).trim() !== '') {
    const num = parseInt(String(legacyAge), 10);
    if (!isNaN(num)) return num;
  }

  return null;
}

export function formatDateDDMMYYYY(dateString: string | null | undefined): string {
  if (!dateString) return 'Not provided';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function generateUniquePatientCode(suffixIndex?: number): string {
  const ts = Date.now();
  const rand = Math.floor(1000 + Math.random() * 9000);
  if (suffixIndex !== undefined) {
    return `SDC-${ts}-${suffixIndex}-${rand}`;
  }
  return `SDC-${ts}-${rand}`;
}

export async function insertPatientsWithUniqueCode(supabaseClient: any, patientsList: any[]) {
  if (!patientsList || patientsList.length === 0) {
    return { data: [], error: null };
  }

  const listToInsert = patientsList.map((item, idx) => ({
    ...item,
    patient_code: item.patient_code || generateUniquePatientCode(idx + 1)
  }));

  let { data, error } = await supabaseClient.from('patients').insert(listToInsert).select();

  if (error && (error.message?.includes('patients_patient_code_key') || error.code === '23505')) {
    console.warn('[patientUtils] patient_code collision detected, retrying with high-entropy randomized codes...');
    const retryList = patientsList.map((item) => ({
      ...item,
      patient_code: `SDC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    }));
    return await supabaseClient.from('patients').insert(retryList).select();
  }

  return { data, error };
}
