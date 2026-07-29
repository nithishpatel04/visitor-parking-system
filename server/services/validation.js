const allowedIncidentTypes = [
  'Medical Emergency',
  'Fire Alarm',
  'Water Leak / Flood',
  'Property Damage',
  'Suspicious Activity',
  'Theft',
  'Resident Complaint',
  'Parking Incident',
  'Elevator Issue',
  'Access Control Issue',
  'Noise Complaint',
  'Police Attendance',
  'Parking Enforcement Attendance',
  'Other'
];

const allowedShiftTypes = ['Morning', 'Afternoon', 'Night'];
const allowedShiftStatuses = ['Draft', 'Submitted'];
const allowedIncidentStatuses = ['Draft', 'Submitted', 'Viewed by PM'];
const allowedAttachmentTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const allowedAttachmentExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

function trimText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isAllowedIncidentType(value) {
  return allowedIncidentTypes.includes(value);
}

function isAllowedShiftType(value) {
  return allowedShiftTypes.includes(value);
}

function isAllowedStatus(value, kind) {
  if (kind === 'shift') return allowedShiftStatuses.includes(value);
  if (kind === 'incident') return allowedIncidentStatuses.includes(value);
  return false;
}

function isAllowedAttachmentType(value) {
  return allowedAttachmentTypes.includes(String(value || '').toLowerCase());
}

function isAllowedAttachmentExtension(filename) {
  const lower = String(filename || '').toLowerCase();
  return allowedAttachmentExtensions.some((extension) => lower.endsWith(extension));
}

function sanitizeFileName(filename) {
  return String(filename || 'attachment')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'attachment';
}

module.exports = {
  trimText,
  isAllowedIncidentType,
  isAllowedShiftType,
  isAllowedStatus,
  isAllowedAttachmentType,
  isAllowedAttachmentExtension,
  sanitizeFileName,
  allowedIncidentTypes,
  allowedShiftTypes,
  allowedIncidentStatuses,
  allowedShiftStatuses
};
