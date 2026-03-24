// Kullanım: node hash-password.js <şifre>
// Örnek:   node hash-password.js sifre123
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.log('Kullanım: node hash-password.js <şifre>');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('\nŞifre hash\'i:');
  console.log(hash);
  console.log('\nBu hash\'i users.js dosyasına ekleyin.');
});
