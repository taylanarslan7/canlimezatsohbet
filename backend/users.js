// Kullanıcı listesi
// Yeni kullanıcı eklemek için:
// 1. node hash-password.js <şifre> komutunu çalıştırın
// 2. Çıkan hash'i aşağıya ekleyin


const USERS = [
  {
    username: 'admin',
    passwordHash: '$2a$10$eAjxGP6LPdy0fXh8pDJ0huzNp3wy1qRSbNFTRTTB0XN/7LrR.tiMS'
  },
  {
    username: 'musteri1',
    passwordHash: '$2a$10$VWFNn5ClgCEh.wyKBbXFDuq6bJnWcRSkQdP9BV9okPAiEeOq6QIZa'
  },
  // Yeni müşteri eklemek için: node hash-password.js <şifre>
  // Çıkan hash'i buraya yapıştır
  // {
  //   username: 'musteri2',
  //   passwordHash: '...'
  // }
];

module.exports = USERS;
