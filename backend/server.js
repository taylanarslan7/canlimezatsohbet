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
app.use(express.static(path.join(__dirname, '../frontend')));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Aktif oturumlar: token -> { username, socketId, rooms }
const activeSessions = new Map();

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

  const token = jwt.sign({ username, id: uuidv4() }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username });
});

app.post('/api/verify', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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

  socket.on('disconnect', () => {
    console.log(`[-] Ayrıldı: ${username} (${socket.id})`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Canlı Mezat Sohbet sunucusu çalışıyor: http://localhost:${PORT}`);
});
