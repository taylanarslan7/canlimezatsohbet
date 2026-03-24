// Facebook Live — Content Script

(function () {
  let observer = null;
  let active = false;
  let seenComments = new Set();

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'FB_START') {
      startObserving();
      sendResponse({ ok: true });
    } else if (msg.type === 'FB_STOP') {
      stopObserving();
      sendResponse({ ok: true });
    } else if (msg.type === 'FB_PING') {
      sendResponse({ active });
    }
  });

  function startObserving() {
    if (active) return;
    active = true;
    seenComments.clear();

    observer = new MutationObserver(() => {
      collectComments();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    collectComments();

    safeSend({ type: 'PLATFORM_STATUS', platform: 'facebook', status: 'connected' });
    console.log('[CanlıMezat] Facebook Live izleme başladı.');
  }

  function stopObserving() {
    if (observer) { observer.disconnect(); observer = null; }
    active = false;
    seenComments.clear();
    safeSend({ type: 'PLATFORM_STATUS', platform: 'facebook', status: 'disconnected' });
  }

  function collectComments() {
    // Her yorum bir div[role="article"] içinde
    const articles = document.querySelectorAll('div[role="article"]');

    for (const article of articles) {
      processArticle(article);
    }
  }

  function processArticle(article) {
    try {
      // Kullanıcı adı: aria-hidden="false" olan ilk link içindeki span[dir="auto"]
      const nameLink = article.querySelector('a[role="link"][aria-hidden="false"]');
      if (!nameLink) return;

      const nameSpan = nameLink.querySelector('span[dir="auto"]');
      const username = nameSpan ? nameSpan.textContent.trim() : nameLink.textContent.trim();
      if (!username) return;

      // Yorum metni: lang attribute'u olan span (dil belirtilmiş span yorum içeriğidir)
      const textSpan = article.querySelector('span[dir="auto"][lang]');
      const text = textSpan ? textSpan.textContent.trim() : '';
      if (!text) return;

      const key = `${username}:${text}`;
      if (seenComments.has(key)) return;
      seenComments.add(key);

      if (seenComments.size > 1000) {
        seenComments.delete(seenComments.values().next().value);
      }

      safeSend({
        type: 'NEW_COMMENT',
        platform: 'facebook',
        username,
        text,
        timestamp: new Date().toISOString()
      });

    } catch (e) { /* parse hatası, atla */ }
  }

  function safeSend(msg) {
    try {
      chrome.runtime.sendMessage(msg);
    } catch (e) {
      // Uzantı yenilendi, context geçersiz — sessizce yoksay
    }
  }

})();
