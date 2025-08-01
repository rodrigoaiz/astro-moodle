const crypt = require('unix-crypt-td-js');

// Hash almacenado en la DB
const storedHash = '$6$rounds=10000$fe538f90697a3930$VsOkRlHnkPxKww/oGy75ncJ/cogA62V9fLigwyQVCLlfgigLUApO/S4lwtVbBxn6NSAVtixhxcfS38FE.VZt..';

// Probar diferentes contraseñas
const passwords = ['admin123', 'admin', 'password', 'admin12'];

for (const password of passwords) {
    try {
        const result = crypt(password, storedHash);
        console.log(`Password: "${password}"`);
        console.log(`Result: ${result}`);
        console.log(`Match: ${result === storedHash}`);
        console.log('---');
    } catch (error) {
        console.log(`Password: "${password}" - Error: ${error.message}`);
        console.log('---');
    }
}
