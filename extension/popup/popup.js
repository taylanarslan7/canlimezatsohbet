const BACKEND_URL = 'http://localhost:3000';
const PANEL_URL = 'http://localhost:3000/chat.html';

// DOM elementleri
const screenLogin = document.getElementById('screen-login');
const screenMain = document.getElementById('screen-main');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const loggedUsername = document.getElementById('logged-username');
const logoutBtn = document.getElementById('logout-btn');

const fbUrl = document.getElementById('fb-url');
const fbStatusDot = document.getElementById('fb-status-dot');
const fbStatusText = document.getElementById('fb-status-text');
const fbStartBtn = document.getElementById('fb-start-btn');
const fbStopBtn = document.getElementById('fb-stop-btn');

const igUrl = document.getElementById('ig-url');
const igStatusDot = document.getElementById('ig-status-dot');
const igStatusText = document.getElementById('ig-status-text');
const igStartBtn = document.getElementById('ig-start-btn');
const igStopBtn = document.getElementById('ig-stop-btn');

const openPanelBtn = document.getElementById('open-panel-btn');

// Başlangıçta kaydedilmiş oturumu kontrol et
chrome.storage.local.get(['token', 'username', 'fbUrl', 'igUrl'], async (data) => {
  if (data.token) {
    const valid = await verifyToken(data.token);
    if (valid) {
      showMain(data.username);
      if (data.fbUrl) fbUrl.value = data.fbUrl;
      if (data.igUrl) igUrl.value = data.igUrl;
      syncStatus();
      return;
    }
  }
  showLogin();
});

// Giriş formu
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Giriş yapılıyor...';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || 'Giriş başarısız';
      loginError.classList.remove('hidden');
    } else {
      chrome.storage.local.set({ token: data.token, username: data.username });
      showMain(data.username);
    }
  } catch (err) {
    loginError.textContent = 'Sunucuya bağlanılamadı. Sunucunun çalıştığından emin olun.';
    loginError.classList.remove('hidden');
  }

  loginBtn.disabled = false;
  loginBtn.textContent = 'Giriş Yap';
});

// Çıkış
logoutBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['token', 'username', 'fbUrl', 'igUrl']);
  // Background'a durdur komutu gönder
  chrome.runtime.sendMessage({ type: 'STOP_ALL' });
  showLogin();
});

// Facebook Başlat
fbStartBtn.addEventListener('click', () => {
  const url = fbUrl.value.trim();
  if (!url || !url.includes('facebook.com')) {
    alert('Lütfen geçerli bir Facebook Live linki girin.');
    return;
  }
  chrome.storage.local.set({ fbUrl: url });
  chrome.runtime.sendMessage({ type: 'START_PLATFORM', platform: 'facebook', url });
  setStatus('facebook', 'connecting');
});

// Facebook Durdur
fbStopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_PLATFORM', platform: 'facebook' });
  setStatus('facebook', 'disconnected');
});

// Instagram Başlat
igStartBtn.addEventListener('click', () => {
  const url = igUrl.value.trim();
  if (!url || !url.includes('instagram.com')) {
    alert('Lütfen geçerli bir Instagram Live linki girin.');
    return;
  }
  chrome.storage.local.set({ igUrl: url });
  chrome.runtime.sendMessage({ type: 'START_PLATFORM', platform: 'instagram', url });
  setStatus('instagram', 'connecting');
});

// Instagram Durdur
igStopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_PLATFORM', platform: 'instagram' });
  setStatus('instagram', 'disconnected');
});

// Panel aç
openPanelBtn.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.storage.local.get(['token'], (data) => {
    const url = data.token ? `${PANEL_URL}?token=${encodeURIComponent(data.token)}` : PANEL_URL;
    chrome.tabs.create({ url });
  });
});

// Background'dan durum güncellemeleri al
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATUS_UPDATE') {
    setStatus(msg.platform, msg.status);
  }
});

// Yardımcı fonksiyonlar

function showLogin() {
  screenLogin.classList.remove('hidden');
  screenMain.classList.add('hidden');
}

function showMain(username) {
  screenLogin.classList.add('hidden');
  screenMain.classList.remove('hidden');
  loggedUsername.textContent = username;
  openPanelBtn.href = PANEL_URL;
}

function setStatus(platform, status) {
  const dot = platform === 'facebook' ? fbStatusDot : igStatusDot;
  const text = platform === 'facebook' ? fbStatusText : igStatusText;
  const startBtn = platform === 'facebook' ? fbStartBtn : igStartBtn;
  const stopBtn = platform === 'facebook' ? fbStopBtn : igStopBtn;

  dot.className = 'status-dot';

  if (status === 'connected') {
    dot.classList.add('connected');
    text.textContent = 'Bağlı';
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
  } else if (status === 'connecting') {
    text.textContent = 'Bağlanıyor...';
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
  } else if (status === 'error') {
    dot.classList.add('error');
    text.textContent = 'Hata — tekrar deneyin';
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
  } else {
    text.textContent = 'Bağlı değil';
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
  }
}

function syncStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (!response) return;
    setStatus('facebook', response.facebook || 'disconnected');
    setStatus('instagram', response.instagram || 'disconnected');
  });
}

async function verifyToken(token) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    return data.valid;
  } catch {
    return false;
  }
}
