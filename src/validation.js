// Pure functions: easy to unit test, shared rules for the API.

const STATUSES = ['scheduled', 'checked_in', 'completed', 'no_show', 'cancelled'];

/** Returns a list of error messages (empty list = valid). */
function validateAppointment(input) {
  const errors = [];
  if (!Number.isInteger(input.patientId)) errors.push('patientId must be a whole number');
  if (!Number.isInteger(input.providerId)) errors.push('providerId must be a whole number');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input.startsAt ?? '')) {
    errors.push('startsAt must look like YYYY-MM-DD HH:MM');
  }
  if (!input.reason || input.reason.trim().length < 3) errors.push('reason is required');
  return errors;
}

function isValidStatus(status) {
  return STATUSES.includes(status);
}

/** Groups appointments by status, e.g. { scheduled: 3, completed: 2 } */
function countByStatus(appointments) {
  return appointments.reduce((counts, { status }) => {
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

module.exports = { STATUSES, validateAppointment, isValidStatus, countByStatus };
