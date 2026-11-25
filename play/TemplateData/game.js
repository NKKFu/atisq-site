"use strict";

(function installBackgroundRafShim() {
  if (typeof window === "undefined" || typeof Worker === "undefined" || typeof Blob === "undefined") return;
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const nativeCancelRaf = window.cancelAnimationFrame.bind(window);
  let nextId = 1;
  const pending = new Map();
  let worker = null;

  try {
    const workerCode = "var id=null;self.onmessage=function(e){if(e.data==='start'){if(!id)id=setInterval(function(){self.postMessage('tick');},50);}else if(e.data==='stop'){if(id){clearInterval(id);id=null;}}};";
    worker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: "application/javascript" })));
  } catch {
    return;
  }

  worker.onmessage = () => {
    if (!document.hidden || pending.size === 0) return;
    const entries = Array.from(pending.entries());
    pending.clear();
    const now = performance.now();
    for (const [, entry] of entries) {
      try { entry.cb(now); } catch (err) { console.error(err); }
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pending.forEach(entry => {
        if (entry.nativeId !== null) {
          nativeCancelRaf(entry.nativeId);
          entry.nativeId = null;
        }
      });
      worker.postMessage("start");
    } else {
      worker.postMessage("stop");
      pending.forEach((entry, id) => {
        if (entry.nativeId === null) {
          entry.nativeId = nativeRaf(ts => {
            pending.delete(id);
            entry.cb(ts);
          });
        }
      });
    }
  });

  window.requestAnimationFrame = cb => {
    const id = nextId++;
    if (document.hidden) {
      pending.set(id, { cb, nativeId: null });
      worker.postMessage("start");
    } else {
      const entry = { cb, nativeId: null };
      pending.set(id, entry);
      entry.nativeId = nativeRaf(ts => {
        pending.delete(id);
        cb(ts);
      });
    }
    return id;
  };

  window.cancelAnimationFrame = id => {
    const entry = pending.get(id);
    if (!entry) return;
    if (entry.nativeId !== null) nativeCancelRaf(entry.nativeId);
    pending.delete(id);
  };
})();

function startAtisq(loaderUrl, config) {
  const canvas = document.getElementById("unity-canvas");
  const container = document.getElementById("unity-container");
  const overlay = document.getElementById("unity-loading-overlay");
  const progress = document.getElementById("unity-progress");
  const progressFill = document.getElementById("progress-fill");
  const loading = document.getElementById("loading-progress");
  const loadingTitle = document.getElementById("loading-title");
  const errorBox = document.getElementById("error-box");
  const retry = document.getElementById("retry");
  const error = document.getElementById("error-message");
  const fullscreen = document.getElementById("unity-fullscreen-btn");
  const warning = document.getElementById("unity-warning");
  const touch = matchMedia("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);

  let engineReady = false;
  let lobbyReady = false;
  let enteredGame = false;
  let failed = false;
  let startupTimer;
  let warningTimer;
  container.toggleAttribute("data-touch", touch);
  retry.onclick = () => location.reload();

  function updateProgress(percent) {
    if (failed || percent <= progress.value) return;
    progress.value = percent;
    progressFill.style.width = percent + "%";
  }

  function enterGameAutomatically() {
    if (failed || enteredGame || !engineReady || !lobbyReady) return;
    enteredGame = true;
    clearTimeout(startupTimer);
    loading.classList.remove("is-waiting");
    updateProgress(100);

    fullscreen.hidden = !document.fullscreenEnabled;
    canvas.inert = false;
    canvas.focus({ preventScroll: true });

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      overlay.hidden = true;
      return;
    }

    overlay.classList.add("is-leaving");
    setTimeout(() => { overlay.hidden = true; }, 260);
  }

  function fail(message) {
    if (failed) return;
    failed = true;
    clearTimeout(startupTimer);
    loading.hidden = true;
    if (errorBox) errorBox.hidden = false;
    error.textContent = message;
    retry.hidden = false;
    retry.focus({ preventScroll: true });
  }

  function showWarning(message, duration = 5000) {
    clearTimeout(warningTimer);
    warning.textContent = message;
    warning.hidden = false;
    if (duration) warningTimer = setTimeout(() => { warning.hidden = true; }, duration);
  }

  if (location.protocol === "file:") {
    fail("Abra o jogo pelo endereço de um servidor HTTP. O arquivo HTML sozinho não carrega o jogo.");
    retry.hidden = true;
    return;
  }

  canvas.addEventListener("contextmenu", event => event.preventDefault());
  canvas.addEventListener("keydown", event => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
  });
  const enterFsIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const exitFsIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  document.addEventListener("fullscreenchange", () => {
    const isFs = Boolean(document.fullscreenElement);
    const label = isFs ? "Sair da tela cheia" : "Tela cheia";
    fullscreen.innerHTML = isFs ? exitFsIcon : enterFsIcon;
    fullscreen.title = label;
    fullscreen.setAttribute("aria-label", label);
    if (!overlay.hidden || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
    canvas.focus({ preventScroll: true });
  });
  container.addEventListener("atisq:fullscreen", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.requestFullscreen();
    } catch {
      showWarning("O navegador não permitiu abrir a tela cheia.");
    }
  });
  fullscreen.onclick = () => container.dispatchEvent(new Event("atisq:fullscreen"));
  document.addEventListener("atisq:lobby-ready", () => {
    lobbyReady = true;
    enterGameAutomatically();
  }, { once: true });

  const renderWidth = Math.max(screen.width, screen.height);
  const renderHeight = touch ? Math.min(screen.width, screen.height) : renderWidth * 9 / 16;
  config.devicePixelRatio = Math.min(
    window.devicePixelRatio || 1,
    touch ? 1.25 : 1.5,
    Math.sqrt((1920 * 1080) / Math.max(1, renderWidth * renderHeight))
  );
  config.autoSyncPersistentDataPath = true;
  config.showBanner = (message, type) => {
    if (type === "error") {
      console.error(message);
      if (!engineReady || !lobbyReady) {
        fail("Não foi possível carregar o jogo. Verifique a conexão e tente de novo.");
      } else if (enteredGame) {
        showWarning("O jogo encontrou um erro. Recarregue a página para voltar.", 0);
      } else {
        fail("O jogo encontrou um erro ao iniciar.");
      }
      return;
    }
    console.warn(message);
  };

  startupTimer = setTimeout(() => {
    fail("A abertura demorou demais. Verifique a conexão e tente de novo.");
  }, 120000);

  const script = document.createElement("script");
  script.src = loaderUrl;
  script.onload = async () => {
    try {
      await createUnityInstance(canvas, config, value => {
        updateProgress(Math.min(99, Math.round(value * 100)));
      });
      engineReady = true;
      if (!lobbyReady && !failed) loadingTitle.textContent = "Preparando a entrada…";
      loading.classList.toggle("is-waiting", !lobbyReady && !failed);
      updateProgress(99);
      enterGameAutomatically();
    } catch (message) {
      console.error(message);
      fail("Não foi possível iniciar o jogo. Tente de novo em um navegador com WebGL 2.");
    }
  };
  script.onerror = () => fail("O carregador do jogo não abriu. Verifique a conexão e tente de novo.");
  document.head.appendChild(script);
}
