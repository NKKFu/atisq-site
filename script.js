/* =========================================================
   EMBEDDED UNITY WEBGL GAME LAUNCHER
   ========================================================= */
const playNowBtn = document.getElementById("play-now-btn");
const sidePlayLink = document.getElementById("side-play-link");
const gameEmbed = document.getElementById("game-embed");
const gameIframe = document.getElementById("game-iframe");
const closeGameBtn = document.getElementById("close-game-btn");

function openWebGLGame(e) {
  if (e) e.preventDefault();
  if (!gameEmbed || !gameIframe) return;
  gameIframe.src = "play/index.html";
  gameEmbed.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => gameIframe.focus(), 120);
}

function closeWebGLGame() {
  if (!gameEmbed || !gameIframe) return;
  gameEmbed.hidden = true;
  gameIframe.src = "about:blank";
}

if (playNowBtn) playNowBtn.addEventListener("click", openWebGLGame);
if (sidePlayLink) sidePlayLink.addEventListener("click", openWebGLGame);
if (closeGameBtn) closeGameBtn.addEventListener("click", closeWebGLGame);

/* =========================================================
   DYNAMIC PROCEDURAL CLOUDS (WORLD SKY + STAGE SKY)
   ========================================================= */
const CLOUD_SPRITES = [
  "assets/cloud-1.png",
  "assets/cloud-2.png",
  "assets/cloud-3.png",
  "assets/nuvem.png"
];

function createCloudSystem(containerId, config) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const clouds = [];

  function spawnCloud(initial, slotIndex) {
    const rect = container.getBoundingClientRect();
    const areaW = rect.width || config.fallbackWidth;
    const depth = Math.random(); // 0 = far/small/slow/blurry, 1 = closer/larger/faster
    const jitter = 0.78 + Math.random() * 0.44;
    const width = Math.max(config.minW, Math.min(config.maxW, (config.minW + depth * (config.maxW - config.minW)) * jitter));
    const y = config.minY + Math.random() * (config.maxY - config.minY);
    const speed = (config.minSpeed + depth * (config.maxSpeed - config.minSpeed)) * (0.7 + Math.random() * 0.6);
    const blur = config.maxBlur - depth * (config.maxBlur - config.minBlur) + Math.random() * 0.5;
    const opacity = config.minOpacity + depth * (config.maxOpacity - config.minOpacity) * (0.85 + Math.random() * 0.15);
    const flip = Math.random() < 0.5 ? -1 : 1;
    let x;
    if (initial) {
      const slotW = areaW / config.initialCount;
      x = slotIndex * slotW + slotW * (0.1 + Math.random() * 0.7) - width * 0.5;
    } else {
      x = -width - 50 - Math.random() * 140;
    }

    const img = document.createElement("img");
    img.src = CLOUD_SPRITES[Math.floor(Math.random() * CLOUD_SPRITES.length)];
    img.alt = "";
    img.className = "dyn-cloud";
    img.style.width = `${Math.round(width)}px`;
    img.style.opacity = Math.min(0.92, opacity).toFixed(2);
    img.style.filter = `blur(${blur.toFixed(1)}px) brightness(${(0.92 + Math.random() * 0.1).toFixed(2)})`;
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scaleX(${flip})`;
    container.appendChild(img);

    clouds.push({ el: img, x, y, width, speed, flip });
  }

  for (let i = 0; i < config.initialCount; i++) {
    spawnCloud(true, i);
  }

  let spawnTimer = config.spawnInterval * (0.4 + Math.random() * 0.8);

  return {
    update(dt) {
      const areaW = container.clientWidth || config.fallbackWidth;
      spawnTimer -= dt;
      if (spawnTimer <= 0 && clouds.length < config.maxCount) {
        spawnCloud(false, 0);
        spawnTimer = config.spawnInterval * (0.55 + Math.random() * 1.15);
      }

      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        c.x += c.speed * dt;
        c.el.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0) scaleX(${c.flip})`;
        if (c.x > areaW + 60) {
          c.el.remove();
          clouds.splice(i, 1);
        }
      }
    }
  };
}

const cloudSystems = [
  createCloudSystem("world-clouds", {
    fallbackWidth: 1440,
    initialCount: 5,
    maxCount: 7,
    spawnInterval: 8.0,
    minW: 46,
    maxW: 132,
    minY: 12,
    maxY: 195,
    minSpeed: 5,
    maxSpeed: 24,
    minBlur: 0.6,
    maxBlur: 2.4,
    minOpacity: 0.52,
    maxOpacity: 0.9
  }),
  createCloudSystem("stage-clouds", {
    fallbackWidth: 800,
    initialCount: 3,
    maxCount: 4,
    spawnInterval: 9.0,
    minW: 40,
    maxW: 102,
    minY: 10,
    maxY: 145,
    minSpeed: 6,
    maxSpeed: 23,
    minBlur: 0.5,
    maxBlur: 2.0,
    minOpacity: 0.55,
    maxOpacity: 0.9
  })
].filter(Boolean);

/* =========================================================
   FLUTTERING LOBBY BUTTERFLIES (Butterfliessheet.png 6x1)
   ========================================================= */
const BUTTERFLY_FRAME_W = 24;
const BUTTERFLY_HUES = [0, 48, 125, 195, 290]; // magenta, gold, emerald, cyan, violet

function createButterflySystem(containerId, opts) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const list = [];

  for (let i = 0; i < opts.count; i++) {
    const el = document.createElement("div");
    el.className = "butterfly-actor";
    const hue = BUTTERFLY_HUES[i % BUTTERFLY_HUES.length];
    const scale = 0.78 + Math.random() * 0.42;
    if (hue !== 0) {
      el.style.filter = `hue-rotate(${hue}deg) saturate(1.15) drop-shadow(0 1px 0 rgba(0,0,0,0.25))`;
    }
    container.appendChild(el);

    const areaW = container.clientWidth || opts.fallbackWidth;
    const x = Math.random() * areaW;
    const y = opts.minY + Math.random() * (opts.maxY - opts.minY);
    const dir = Math.random() < 0.5 ? 1 : -1;

    list.push({
      el,
      x,
      y,
      vx: dir * (18 + Math.random() * 24),
      vy: (Math.random() - 0.5) * 14,
      targetTimer: 1.0 + Math.random() * 2.5,
      animTimer: Math.random() * 0.1,
      frame: Math.floor(Math.random() * 6),
      phase: Math.random() * 6.28,
      scale
    });
  }

  return {
    update(dt) {
      const areaW = container.clientWidth || opts.fallbackWidth;

      for (const b of list) {
        b.targetTimer -= dt;
        if (b.targetTimer <= 0) {
          b.targetTimer = 1.4 + Math.random() * 2.8;
          const speed = 16 + Math.random() * 26;
          const dir = Math.random() < 0.35 ? -Math.sign(b.vx || 1) : Math.sign(b.vx || 1);
          b.vx = dir * speed;
          b.vy = (Math.random() - 0.5) * 20;
        }

        b.phase += dt * 5.2;
        b.x += b.vx * dt;
        b.y += (b.vy + Math.sin(b.phase) * 18) * dt;

        // Soft bounds
        if (b.x < -30) { b.x = areaW + 20; }
        if (b.x > areaW + 30) { b.x = -20; }
        if (b.y < opts.minY) { b.y = opts.minY; b.vy = Math.abs(b.vy) + 6; }
        if (b.y > opts.maxY) { b.y = opts.maxY; b.vy = -Math.abs(b.vy) - 6; }

        b.animTimer += dt;
        if (b.animTimer >= 0.095) {
          b.animTimer = 0;
          b.frame = (b.frame + 1) % 6;
        }

        // Native sprite faces RIGHT
        const flip = b.vx < 0 ? -1 : 1;
        b.el.style.backgroundPosition = `${-b.frame * BUTTERFLY_FRAME_W}px 0px`;
        b.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) scale(${(b.scale * flip).toFixed(2)}, ${b.scale.toFixed(2)})`;
      }
    }
  };
}

const butterflySystems = [
  createButterflySystem("world-butterflies", {
    fallbackWidth: 1440,
    count: 10,
    minY: 70,
    maxY: 395
  }),
  createButterflySystem("stage-butterflies", {
    fallbackWidth: 800,
    count: 6,
    minY: 50,
    maxY: 420
  })
].filter(Boolean);

/* =========================================================
   ANIMATED LOBBY CHICKENS (WALK, PECK/CISCAR, SIT, IDLE)
   4x4 spritesheet (36x36 per frame):
     row 0: walk cycle (frames 0..3)
     row 1: peck / ciscar (frames 0..3, frame 2 dips head)
     row 2: sit / rest (frames 2..3)
     row 3: idle / alert (frames 0..3)
   ========================================================= */
const FRAME_SIZE = 36;

function createChickenActor(elId, opts) {
  const el = document.getElementById(elId);
  if (!el) return null;

  const state = {
    el,
    x: opts.startX,
    minX: opts.minX,
    maxX: opts.maxX,
    targetX: opts.startX,
    facingRight: Math.random() > 0.5, // native sprite faces LEFT
    mode: "idle",
    modeTimer: 0.6 + Math.random() * 1.6,
    animTimer: 0,
    frame: 0,
    speed: opts.speed || 38,
    hopY: 0
  };

  function pickNextBehavior() {
    const r = Math.random();
    if (r < 0.48) {
      // Walk to a new spot on the grass
      state.mode = "walk";
      const span = state.maxX - state.minX;
      let next = state.minX + Math.random() * span;
      if (Math.abs(next - state.x) < 26) {
        next = state.x + (state.x > (state.minX + state.maxX) / 2 ? -42 : 42);
      }
      state.targetX = Math.max(state.minX, Math.min(state.maxX, next));
      state.facingRight = state.targetX > state.x;
      state.frame = 0;
      state.animTimer = 0;
    } else if (r < 0.78) {
      // Peck / ciscar the grass
      state.mode = "peck";
      state.modeTimer = 1.4 + Math.random() * 1.8;
      state.frame = 0;
      state.animTimer = 0;
    } else if (r < 0.9) {
      // Sit & rest on the grass
      state.mode = "sit";
      state.modeTimer = 1.8 + Math.random() * 2.2;
      state.frame = 2;
      state.animTimer = 0;
    } else {
      // Idle & look around
      state.mode = "idle";
      state.modeTimer = 1.0 + Math.random() * 1.6;
      if (Math.random() < 0.5) state.facingRight = !state.facingRight;
      state.frame = 0;
      state.animTimer = 0;
    }
  }

  function render() {
    let row = 3;
    let col = state.frame % 4;
    let yOffset = 0;

    if (state.mode === "walk") {
      row = 0;
      yOffset = col % 2 === 1 ? -2 : 0;
    } else if (state.mode === "peck") {
      row = 1;
      const peckSeq = [0, 1, 2, 2, 1, 3];
      col = peckSeq[state.frame % peckSeq.length];
      yOffset = col === 2 ? 1 : 0;
    } else if (state.mode === "sit") {
      row = 2;
      col = state.frame % 2 === 0 ? 2 : 3;
      yOffset = 2;
    } else {
      row = 3;
      col = state.frame % 4;
    }

    const scaleX = state.facingRight ? -1 : 1;
    state.el.style.backgroundPosition = `${-col * FRAME_SIZE}px ${-row * FRAME_SIZE}px`;
    state.el.style.transform = `translate3d(${state.x.toFixed(1)}px, ${yOffset}px, 0) scaleX(${scaleX})`;
  }

  render();

  return {
    update(dt) {
      if (state.mode === "walk") {
        const dx = state.targetX - state.x;
        const step = state.speed * dt;
        if (Math.abs(dx) <= step) {
          state.x = state.targetX;
          pickNextBehavior();
        } else {
          state.x += Math.sign(dx) * step;
          state.animTimer += dt;
          if (state.animTimer >= 0.11) {
            state.animTimer = 0;
            state.frame = (state.frame + 1) % 4;
          }
        }
      } else {
        state.modeTimer -= dt;
        state.animTimer += dt;
        const frameRate = state.mode === "peck" ? 0.16 : state.mode === "sit" ? 0.55 : 0.32;
        if (state.animTimer >= frameRate) {
          state.animTimer = 0;
          state.frame++;
        }
        if (state.modeTimer <= 0) {
          pickNextBehavior();
        }
      }
      render();
    }
  };
}

const chickens = [
  createChickenActor("chicken-stage-1", { startX: 280, minX: 165, maxX: 430, speed: 36 }),
  createChickenActor("chicken-stage-2", { startX: 470, minX: 340, maxX: 590, speed: 32 }),
  createChickenActor("chicken-left", { startX: 145, minX: 40, maxX: 210, speed: 30 }),
  createChickenActor("chicken-right", { startX: 55, minX: 18, maxX: 185, speed: 30 })
].filter(Boolean);

/* =========================================================
   HELL REALM: RISING ANIMATED SOULS & EMBER/SPIRIT MOTES
   Inspired by HellSoulEffects.cs (PortalSouls.png 4 frames)
   ========================================================= */
function createHellEffects(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const SOUL_FRAME_W = 56;
  const souls = [];
  const motes = [];

  function spawnSoul(initial) {
    const areaW = container.clientWidth || 1440;
    const el = document.createElement("div");
    el.className = "hell-soul" + (Math.random() < 0.62 ? " is-ember" : "");
    container.appendChild(el);

    const scale = 0.75 + Math.random() * 0.55;
    const duration = 12.5 + Math.random() * 7.5;
    const baseX = Math.random() * areaW;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const maxRise = 340 + Math.random() * 220;
    const age = initial ? Math.random() * duration : 0;

    souls.push({ el, baseX, dir, scale, duration, maxRise, age, phase: Math.random() * 6.28 });
  }

  function spawnMote(initial) {
    const areaW = container.clientWidth || 1440;
    const el = document.createElement("div");
    el.className = "hell-mote";
    const size = Math.random() < 0.2 ? 6 : (Math.random() < 0.55 ? 4 : 3);
    const palette = ["#ffab3b", "#f54221", "#ff7726", "#c97bff"];
    const color = palette[Math.floor(Math.random() * palette.length)];
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background = color;
    el.style.color = color;
    container.appendChild(el);

    const duration = 6.2 + Math.random() * 5.2;
    const baseX = Math.random() * areaW;
    const maxRise = 260 + Math.random() * 320;
    const age = initial ? Math.random() * duration : 0;

    motes.push({ el, baseX, duration, maxRise, age, phase: Math.random() * 6.28, sway: 16 + Math.random() * 28 });
  }

  for (let i = 0; i < 10; i++) spawnSoul(true);
  for (let i = 0; i < 42; i++) spawnMote(true);

  function smoothFade(p) {
    const fadeIn = Math.min(1, p * 4.2);
    const fadeOut = Math.min(1, (1 - p) * 2.6);
    return fadeIn * fadeOut;
  }

  return {
    update(dt) {
      const areaW = container.clientWidth || 1440;

      for (const s of souls) {
        s.age += dt;
        if (s.age >= s.duration) {
          s.age = 0;
          s.baseX = Math.random() * areaW;
        }
        const p = s.age / s.duration;
        const x = s.baseX + s.dir * (30 * p * p) + Math.sin(s.age * 2.1 + s.phase) * 16;
        const y = 18 + p * s.maxRise;
        const frame = Math.floor(s.age * 5) % 4;
        const alpha = smoothFade(p) * 0.88;

        s.el.style.backgroundPosition = `${-frame * SOUL_FRAME_W}px 0px`;
        s.el.style.opacity = alpha.toFixed(3);
        s.el.style.transform = `translate3d(${x.toFixed(1)}px, ${(-y).toFixed(1)}px, 0) scale(${(s.scale * s.dir).toFixed(2)}, ${s.scale.toFixed(2)})`;
      }

      for (const m of motes) {
        m.age += dt;
        if (m.age >= m.duration) {
          m.age = 0;
          m.baseX = Math.random() * areaW;
        }
        const p = m.age / m.duration;
        const x = m.baseX + Math.sin(p * 3.5 + m.phase) * m.sway;
        const y = 12 + p * m.maxRise;
        const alpha = smoothFade(p) * 0.85;

        m.el.style.opacity = alpha.toFixed(3);
        m.el.style.transform = `translate3d(${x.toFixed(1)}px, ${(-y).toFixed(1)}px, 0)`;
      }
    }
  };
}

const hellFx = createHellEffects("hell-fx");

/* =========================================================
   MAIN ANIMATION LOOP
   ========================================================= */
let lastTime = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  for (const sys of cloudSystems) sys.update(dt);
  for (const bsys of butterflySystems) bsys.update(dt);
  for (const c of chickens) c.update(dt);
  if (hellFx) hellFx.update(dt);

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
