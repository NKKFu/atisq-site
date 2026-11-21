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
  const status = document.getElementById("unity-loading-status");
  const loading = document.getElementById("loading-progress");
  const play = document.getElementById("play");
  const retry = document.getElementById("retry");
  const error = document.getElementById("error-message");
  const controls = document.getElementById("controls");
  const fullscreen = document.getElementById("unity-fullscreen-btn");
  const warning = document.getElementById("unity-warning");
  const touch = matchMedia("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);

  let engineReady = false;
  let lobbyReady = false;
  let failed = false;
  let startupTimer;
  let warningTimer;

  container.toggleAttribute("data-touch", touch);
  document.getElementById("rotate").hidden = !touch;
  retry.onclick = () => location.reload();
  play.onclick = () => {
    overlay.hidden = true;
    controls.hidden = false;
    document.getElementById("keyboard-controls").hidden = touch;
    document.getElementById("touch-controls").hidden = !touch;
    fullscreen.hidden = !document.fullscreenEnabled;
    canvas.inert = false;
    canvas.focus({ preventScroll: true });
  };

  function revealPlay() {
    if (failed || !engineReady || !lobbyReady) return;
    clearTimeout(startupTimer);
    loading.hidden = true;
    play.hidden = false;
    play.focus({ preventScroll: true });
  }

  function fail(message) {
    if (failed) return;
    failed = true;
    clearTimeout(startupTimer);
    loading.hidden = true;
    play.hidden = true;
    error.hidden = false;
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
  canvas.addEventListener("pointerdown", () => { controls.open = false; });
  controls.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !controls.open) return;
    event.preventDefault();
    controls.open = false;
    canvas.focus({ preventScroll: true });
  });
  document.addEventListener("fullscreenchange", () => {
    fullscreen.textContent = document.fullscreenElement ? "Sair da tela cheia" : "Tela cheia";
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
    revealPlay();
  }, { once: true });

  // Keep Retina screens from multiplying the GPU workload by up to nine.
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
      } else if (overlay.hidden) {
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
        const percent = Math.min(100, Math.floor(value * 100));
        progress.value = percent;
        status.textContent = percent < 90 ? "Carregando o jogo… " + percent + "%" : "Preparando o lobby…";
      });
      engineReady = true;
      status.textContent = "Preparando o lobby…";
      revealPlay();
    } catch (message) {
      console.error(message);
      fail("Não foi possível iniciar o jogo. Tente de novo em um navegador com WebGL 2.");
    }
  };
  script.onerror = () => fail("O carregador do jogo não abriu. Verifique a conexão e tente de novo.");
  document.head.appendChild(script);
}
