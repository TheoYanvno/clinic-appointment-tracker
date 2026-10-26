// Staff sign-in. Everyone signs in as "Gotham Staff"; the password decides which part of the portal opens:
//   customerservice -> scheduling (book, check in, reports)
//   medicalstaff    -> patient information (profiles, insurance, clinical notes, documents)
// Only the salt and PBKDF2 hash are stored, made with hashPassword() in src/auth.js.
export const USERNAME = 'Gotham Staff';

export const STAFF = [
  { role: 'customer_service', name: 'Customer Service', iterations: 10000,
    salt: '9427783cb5ecd6ddc6d447718b07f0e3', hash: '1d4586a41211587525ea8724cc7c85c2d4f3ad336a85739d93946c767b498cbb' },
  { role: 'medical_staff', name: 'Medical Staff', iterations: 10000,
    salt: '4fbbda3d2ca59a6d14a71c467a706e69', hash: '2d4c2853179f99ab9216a9dfe4efa6476cd1503c81e8d007024e6fd38e8e7e13' },
];

/** What each role may do. The API checks these on every request. */
export const PERMISSIONS = {
  customer_service: ['schedule:read', 'schedule:write', 'patients:search', 'reports'],
  medical_staff: ['schedule:read', 'patients:search', 'patients', 'documents:delete'],
};
