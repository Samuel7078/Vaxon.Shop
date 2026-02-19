const crypto = require('crypto');

const passwordToSet = '1234'; // TU CONTRASEÑA
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(passwordToSet, salt, 1000, 64, 'sha512').toString('hex');

console.log("Copia y pega este valor en tu columna 'password' de MySQL:");
console.log(`${salt}:${hash}`);