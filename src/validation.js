// Pure validation functions: easy to unit test, shared by the server and the browser.

export const STATUSES = ['scheduled', 'checked_in', 'completed', 'no_show', 'cancelled'];
export const VISIT_TYPES = ['New patient', 'Follow-up', 'Annual physical', 'Sick visit', 'Procedure', 'Telehealth'];
export const DURATIONS = [15, 30, 45, 60];
export const DOCUMENT_CATEGORIES = ['Lab result', 'Imaging', 'Referral', 'Insurance card', 'Visit note', 'Consent form', 'Other'];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^[\d\s().+-]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns a list of error messages (empty list = valid). */
export function validateAppointment(input) {
  const errors = [];
  if (!Number.isInteger(input.patientId)) errors.push('Choose a patient');
  if (!Number.isInteger(input.providerId)) errors.push('Choose a provider');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input.startsAt ?? '')) {
    errors.push('Start time must look like YYYY-MM-DD HH:MM');
  } else if (Number(input.startsAt.slice(14)) % 15 !== 0) {
    errors.push('Appointments start on the quarter hour (:00, :15, :30, :45)');
  }
  if (input.duration !== undefined && !DURATIONS.includes(input.duration)) errors.push('Length must be 15, 30, 45 or 60 minutes');
  if (input.visitType !== undefined && !VISIT_TYPES.includes(input.visitType)) errors.push('Unknown visit type');
  if (!input.reason || input.reason.trim().length < 3) errors.push('Reason for visit is required');
  return errors;
}

export function validatePatient(input, { today = '9999-12-31', partial = false } = {}) {
  const errors = [];
  const required = (field, label) => {
    if (!partial || field in input) if (!String(input[field] ?? '').trim()) errors.push(`${label} is required`);
  };
  required('first_name', 'First name');
  required('last_name', 'Last name');
  required('birth_date', 'Date of birth');
  if (input.birth_date) {
    if (!DATE.test(input.birth_date)) errors.push('Date of birth must look like YYYY-MM-DD');
    else if (input.birth_date > today) errors.push('Date of birth cannot be in the future');
  }
  if ((!partial || 'sex' in input) && !['F', 'M', 'X'].includes(input.sex)) errors.push('Sex must be F, M or X');
  if (input.phone && !PHONE.test(input.phone)) errors.push('Phone number looks incomplete');
  if (input.emergency_phone && !PHONE.test(input.emergency_phone)) errors.push('Emergency contact phone looks incomplete');
  if (input.email && !EMAIL.test(input.email)) errors.push('Email address is not valid');
  if (input.zip && !/^\d{5}(-\d{4})?$/.test(input.zip)) errors.push('ZIP code must be 5 digits');
  for (const plan of input.insurance ?? []) {
    if (!['primary', 'secondary'].includes(plan.coverage)) errors.push('Insurance coverage must be primary or secondary');
    if (plan.payer && !String(plan.member_id ?? '').trim()) errors.push(`${plan.coverage === 'secondary' ? 'Secondary' : 'Primary'} insurance needs a member ID`);
    if (plan.copay !== undefined && plan.copay !== null && plan.copay !== '' && !(Number(plan.copay) >= 0)) errors.push('Copay must be a positive number');
  }
  return errors;
}

export function isValidStatus(status) {
  return STATUSES.includes(status);
}

/** Groups appointments by status, e.g. { scheduled: 3, completed: 2 } */
export function countByStatus(appointments) {
  return appointments.reduce((counts, { status }) => {
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}
