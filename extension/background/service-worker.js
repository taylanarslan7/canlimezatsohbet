// Socket.io'yu uzantıdan yükle (en üstte olmalı)
importScripts('./socket.io.min.js');

const BACKEND_URL = 'https://canlimezatsohbet-production.up.railway.app';

const activeTabs = { facebook: null, instagram: null };
const platformStatus = { facebook: 'disconnected', instagram: 'disconnected' };

let socket = null;
let token = null;

function initSocket(tok) {
  token = tok;

  if (socket && socket.connected) return;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10
  });

  socket.on('connect', () => {
    console.log('[CanlıMezat] Backend bağlantısı kuruldu.');
    // Chat paneline mevcut platform durumlarını bildir
    for (const platform of ['facebook', 'instagram']) {
      socket.emit('status', { platform, connected: platformStatus[platform] === 'connected' });
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[CanlıMezat] Bağlantı hatası:', err.message);
  });

  // Chat paneli durum sorgulayınca yanıt ver
  socket.on('request_status', () => {
    for (const platform of ['facebook', 'instagram']) {
      socket.emit('status', { platform, connected: platformStatus[platform] === 'connected' });
    }
  });

  // Chat panelinden gelen başlat/durdur komutları
  socket.on('command', (cmd) => {
    if (cmd.type === 'START_PLATFORM') {
      handleStart(cmd.platform, cmd.url);
    } else if (cmd.type === 'STOP_PLATFORM') {
      handleStop(cmd.platform);
    }
  });
}

// Popup ve content script mesajları
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'START_PLATFORM') {
    chrome.storage.local.get(['token'], (data) => {
      if (data.token) initSocket(data.token);
      handleStart(msg.platform, msg.url).then(sendResponse);
    });
    return true;
  }

  if (msg.type === 'STOP_PLATFORM') {
    handleStop(msg.platform);
    sendResponse({ ok: true });
  }

  if (msg.type === 'STOP_ALL') {
    handleStop('facebook');
    handleStop('instagram');
    sendResponse({ ok: true });
  }

  if (msg.type === 'GET_STATUS') {
    sendResponse({ ...platformStatus });
  }

  if (msg.type === 'NEW_COMMENT') {
    if (!socket || !socket.connected) {
      chrome.storage.local.get(['token'], (data) => {
        if (data.token) {
          initSocket(data.token);
          // Kısa bekle bağlansın
          setTimeout(() => sendComment(msg), 1000);
        }
      });
    } else {
      sendComment(msg);
    }
  }

  if (msg.type === 'PLATFORM_STATUS') {
    platformStatus[msg.platform] = msg.status;
    // Popup'a bildir
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      platform: msg.platform,
      status: msg.status
    }).catch(() => {});
    // Backend'e (chat ekranına) bildir
    if (socket && socket.connected) {
      socket.emit('status', {
        platform: msg.platform,
        connected: msg.status === 'connected'
      });
    }
  }
});

async function handleStart(platform, url) {
  // Mevcut sekmeyi kapat
  if (activeTabs[platform]) {
    try { await chrome.tabs.remove(activeTabs[platform]); } catch (e) {}
    activeTabs[platform] = null;
  }

  const tab = await chrome.tabs.create({ url, active: false });
  activeTabs[platform] = tab.id;

  // Sekme yüklenince content script'e başlat komutu gönder
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId !== tab.id || info.status !== 'complete') return;
    chrome.tabs.onUpdated.removeListener(listener);

    // Biraz bekle, sayfa tam yerleşsin
    setTimeout(() => {
      const msgType = platform === 'facebook' ? 'FB_START' : 'IG_START';
      chrome.tabs.sendMessage(tab.id, { type: msgType }, (res) => {
        if (chrome.runtime.lastError) {
          console.error('[CanlıMezat] Content script hatası:', chrome.runtime.lastError.message);
          platformStatus[platform] = 'error';
          chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', platform, status: 'error' }).catch(() => {});
        }
      });
    }, 2000);
  });

  return { ok: true };
}

function handleStop(platform) {
  if (activeTabs[platform]) {
    const msgType = platform === 'facebook' ? 'FB_STOP' : 'IG_STOP';
    chrome.tabs.sendMessage(activeTabs[platform], { type: msgType }).catch(() => {});
    chrome.tabs.remove(activeTabs[platform]).catch(() => {});
    activeTabs[platform] = null;
  }
  platformStatus[platform] = 'disconnected';
}

function sendComment(msg) {
  socket.emit('comment', {
    platform: msg.platform,
    username: msg.username,
    text: msg.text,
    timestamp: msg.timestamp
  });
}

// Uzantı başladığında token varsa soketi otomatik bağla
chrome.storage.local.get(['token'], (data) => {
  if (data.token) initSocket(data.token);
});

// Service worker'ı canlı tut — Chrome her dakika uyandırır, soket kopmuşsa yeniden bağlar
chrome.alarms.create('keepalive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'keepalive') return;
  chrome.storage.local.get(['token'], (data) => {
    if (data.token) initSocket(data.token);
  });
});

// İkon tıklanınca web paneli aç
chrome.action.onClicked.addListener(() => {
  const PANEL = 'https://canlimezatsohbet-production.up.railway.app';
  chrome.storage.local.get(['token'], (data) => {
    const url = data.token ? `${PANEL}/chat` : PANEL;
    chrome.tabs.create({ url });
  });
});

// Sekme kapanırsa durumu güncelle
chrome.tabs.onRemoved.addListener((tabId) => {
  for (const platform of ['facebook', 'instagram']) {
    if (activeTabs[platform] === tabId) {
      activeTabs[platform] = null;
      platformStatus[platform] = 'disconnected';
      chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', platform, status: 'disconnected' }).catch(() => {});
      if (socket && socket.connected) {
        socket.emit('status', { platform, connected: false });
      }
    }
  }
});
