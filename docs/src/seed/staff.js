// Demo staff accounts for the hidden sign-in (password for both: gotham-demo, see the README).
// Only the salt and PBKDF2 hash are stored, made with hashPassword() in src/auth.js.
export const STAFF = [
  { username: 'alfred', name: 'Alfred Pennyworth', role: 'Clinic manager', iterations: 10000,
    salt: '61e7371241c90472f33193ed36b51c2c', hash: 'ce3a63578f7a4acf297ecae7aa1720748cc2879c939d739b2a230a2da7e7bda3' },
  { username: 'lucius', name: 'Lucius Fox', role: 'Front desk', iterations: 10000,
    salt: 'bd4e3d2a232b4f9945770fad3d421f56', hash: '919530c65c6e176d94e8d37260d0021b0ba01a7ab8208763c6524d187a98772f' },
];
