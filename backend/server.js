const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'canlimezat-gizli-anahtar-2026';

// Basit kullanıcı veritabanı (gerçek uygulamada DB kullanılır)
// Kullanıcı eklemek için users.js dosyasını düzenleyin
const USERS = require('./users');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Her kullanıcının geçerli token ID'si — login olunca güncellenir
// Farklı bir token ID'siyle bağlanmaya çalışanlar reddedilir
const activeTokenIds = new Map(); // username -> tokenId

// --- AUTH ---

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const user = USERS.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
  }

  const tokenId = uuidv4();
  const token = jwt.sign({ username, id: tokenId }, JWT_SECRET, { expiresIn: '24h' });

  // Önceki oturumu geçersiz kıl
  activeTokenIds.set(username, tokenId);

  // Eski token ile bağlı tüm socketleri kopar
  io.to(`user:${username}`).emit('session_expired');

  res.json({ token, username });
});

app.post('/api/verify', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Token ID hâlâ geçerli mi?
    const currentId = activeTokenIds.get(decoded.username);
    if (currentId && currentId !== decoded.id) {
      return res.json({ valid: false });
    }
    res.json({ valid: true, username: decoded.username });
  } catch {
    res.json({ valid: false });
  }
});

// --- SOCKET.IO ---

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);
  if (!user) {
    return next(new Error('Yetkisiz erişim'));
  }

  // Token ID kontrolü — başkası giriş yapmışsa reddet
  const currentId = activeTokenIds.get(user.username);
  if (currentId && currentId !== user.id) {
    return next(new Error('Başka bir cihazdan giriş yapıldı'));
  }

  // İlk bağlantıda token ID'yi kaydet (sunucu yeniden başlatılmışsa)
  if (!currentId) {
    activeTokenIds.set(user.username, user.id);
  }

  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  const { username } = socket.user;
  console.log(`[+] Bağlandı: ${username} (${socket.id})`);

  // Extension bağlandığında kullanıcıya ait odaya katıl
  socket.join(`user:${username}`);

  // Extension'dan yorum geldiğinde frontend'e ilet
  socket.on('comment', (data) => {
    const comment = {
      id: uuidv4(),
      platform: data.platform,       // 'facebook' | 'instagram'
      username: data.username,
      text: data.text,
      timestamp: data.timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString()
    };

    console.log(`[${comment.platform.toUpperCase()}] ${comment.username}: ${comment.text}`);

    // Aynı kullanıcının tüm bağlı istemcilerine gönder (frontend dahil)
    io.to(`user:${username}`).emit('comment', comment);
  });

  // Bağlantı durumu bildirimi
  socket.on('status', (data) => {
    io.to(`user:${username}`).emit('status', {
      platform: data.platform,
      connected: data.connected,
      timestamp: new Date().toISOString()
    });
  });

  // Chat panelinden başlat/durdur komutu → extension'a ilet
  socket.on('start_platform', (data) => {
    io.to(`user:${username}`).emit('command', { type: 'START_PLATFORM', platform: data.platform, url: data.url });
  });

  socket.on('stop_platform', (data) => {
    io.to(`user:${username}`).emit('command', { type: 'STOP_PLATFORM', platform: data.platform });
  });

  socket.on('disconnect', () => {
    console.log(`[-] Ayrıldı: ${username} (${socket.id})`);
  });
});

// /chat ve /:username/chat → chat sayfası
app.get('/chat', (req, res) => {
  res.sendFile('chat.html', { root: path.join(__dirname, 'public') });
});

app.get('/:username/chat', (req, res) => {
  res.sendFile('chat.html', { root: path.join(__dirname, 'public') });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Canlı Mezat Sohbet sunucusu çalışıyor: http://localhost:${PORT}`);
});
