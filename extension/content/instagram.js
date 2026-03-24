// Instagram Live — Content Script

(function () {
  let observer = null;
  let active = false;
  let seenComments = new Set();

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'IG_START') {
      startObserving();
      sendResponse({ ok: true });
    } else if (msg.type === 'IG_STOP') {
      stopObserving();
      sendResponse({ ok: true });
    } else if (msg.type === 'IG_PING') {
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

    safeSend({ type: 'PLATFORM_STATUS', platform: 'instagram', status: 'connected' });
    console.log('[CanlıMezat] Instagram Live izleme başladı.');
  }

  function stopObserving() {
    if (observer) { observer.disconnect(); observer = null; }
    active = false;
    seenComments.clear();
    safeSend({ type: 'PLATFORM_STATUS', platform: 'instagram', status: 'disconnected' });
  }

  function collectComments() {
    // Strateji 1: Bilinen CSS sınıfları (Meta her deploy'da değiştirebilir)
    const byClass = document.querySelectorAll('span._ap3a._aaco._aacw._aacx._aad7[dir="auto"]');
    if (byClass.length > 0) {
      for (const usernameEl of byClass) {
        const username = usernameEl.textContent.trim();
        if (!username) continue;
        const parent = usernameEl.closest('div.html-div') || usernameEl.parentElement;
        const textEl = parent ? parent.querySelector('span._ap3a._aaco._aacu._aacx._aad7._aadf[dir="auto"]') : null;
        const text = textEl ? textEl.textContent.trim() : '';
        if (text) processComment(username, text);
      }
      return;
    }

    // Strateji 2: Yapısal seçici — aynı parent içinde çift dir="auto" span
    // CSS sınıfları değişince bu devreye girer
    const allDirAuto = document.querySelectorAll('span[dir="auto"]');
    const parentMap = new Map();
    for (const span of allDirAuto) {
      const p = span.parentElement;
      if (!p) continue;
      if (!parentMap.has(p)) parentMap.set(p, []);
      parentMap.get(p).push(span);
    }
    for (const [, spans] of parentMap) {
      if (spans.length < 2) continue;
      const username = spans[0].textContent.trim();
      const text = spans[1].textContent.trim();
      if (username && text && username !== text && username.length < 60) {
        processComment(username, text);
      }
    }
  }

  function processComment(username, text) {
    const key = `${username}:${text}`;
    if (seenComments.has(key)) return;
    seenComments.add(key);

    if (seenComments.size > 1000) {
      seenComments.delete(seenComments.values().next().value);
    }

    safeSend({
      type: 'NEW_COMMENT',
      platform: 'instagram',
      username,
      text,
      timestamp: new Date().toISOString()
    });
  }

  function safeSend(msg) {
    try {
      chrome.runtime.sendMessage(msg);
    } catch (e) {
      // Uzantı yenilendi, context geçersiz — sessizce yoksay
    }
  }

})();
