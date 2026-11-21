/* =========================================================
   CHARACTER INSPECTOR
   ========================================================= */
const CHARACTERS = {
  iris: {
    name: "Íris",
    role: "Portais Dimensionais",
    img: "assets/iris.png",
    desc: "Pressione R ou toque no ícone para abrir um portal à frente da Íris. Use o mesmo botão para abrir a saída e surpreender os adversários.",
    atk: 28,
    spd: 9,
    hp: 100
  },
  fole: {
    name: "Fole",
    role: "Fornalha & Fogo",
    img: "assets/fole.png",
    desc: "Recarregue para aquecer a fornalha. Pressione R ou toque em Sopro de Fogo para lançar uma rajada ardente de curto alcance pela boca.",
    atk: 28,
    spd: 8,
    hp: 110
  },
  rubi: {
    name: "Rubi",
    role: "Regeneração em Área",
    img: "assets/rubi.png",
    desc: "Enquanto Rubi recarrega energia, a área ao redor pulsa com ondas rubi, fortalecendo sua presença nas lutas prolongadas.",
    atk: 28,
    spd: 9,
    hp: 100
  },
  kude: {
    name: "Kude",
    role: "Teletransporte",
    img: "assets/kude.png",
    desc: "Ninguém sabe ao certo como ela consegue, mas Kude se teletransporta instantaneamente pelas plataformas para escapar ou atacar de surpresa.",
    atk: 24,
    spd: 10,
    hp: 105
  },
  raijin: {
    name: "Raijin",
    role: "Tanque & Relâmpago",
    img: "assets/raijin.png",
    desc: "Forte, resistente e habilidoso com descargas elétricas. Aguenta mais dano na linha de frente enquanto controla o ritmo da arena.",
    atk: 20,
    spd: 8,
    hp: 150
  },
  evil_gian: {
    name: "Evil Gian",
    role: "Erupção em Área",
    img: "assets/evil-gian.png",
    desc: "Evil Gian dispara uma erupção à frente ao avançar, causando alto dano em área e pressionando adversários nas bordas da arena.",
    atk: 34,
    spd: 10,
    hp: 120
  }
};

const buttons = document.querySelectorAll(".char-card");
const imgEl = document.getElementById("inspector-img");
const nameEl = document.getElementById("inspector-name");
const roleEl = document.getElementById("inspector-role");
const descEl = document.getElementById("inspector-desc");
const atkBar = document.getElementById("stat-atk");
const spdBar = document.getElementById("stat-spd");
const hpBar = document.getElementById("stat-hp");
const atkVal = document.getElementById("val-atk");
const spdVal = document.getElementById("val-spd");
const hpVal = document.getElementById("val-hp");

function selectCharacter(key) {
  const data = CHARACTERS[key];
  if (!data) return;

  imgEl.src = data.img;
  imgEl.alt = data.name;
  nameEl.textContent = data.name;
  roleEl.textContent = data.role;
  descEl.textContent = data.desc;

  atkBar.style.width = `${Math.min(100, Math.round((data.atk / 36) * 100))}%`;
  spdBar.style.width = `${Math.min(100, Math.round((data.spd / 11) * 100))}%`;
  hpBar.style.width = `${Math.min(100, Math.round((data.hp / 150) * 100))}%`;

  atkVal.textContent = data.atk;
  spdVal.textContent = data.spd;
  hpVal.textContent = data.hp;

  buttons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.char === key);
  });
}

buttons.forEach((btn) => {
  btn.addEventListener("click", () => selectCharacter(btn.dataset.char));
});

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

  function spawnCloud(initial) {
    const rect = container.getBoundingClientRect();
    const areaW = rect.width || config.fallbackWidth;
    const width = config.minW + Math.random() * (config.maxW - config.minW);
    const y = config.minY + Math.random() * (config.maxY - config.minY);
    const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
    const blur = config.minBlur + Math.random() * (config.maxBlur - config.minBlur);
    const opacity = config.minOpacity + Math.random() * (config.maxOpacity - config.minOpacity);
    const x = initial ? Math.random() * (areaW + width) - width : -width - 20 - Math.random() * 60;

    const img = document.createElement("img");
    img.src = CLOUD_SPRITES[Math.floor(Math.random() * CLOUD_SPRITES.length)];
    img.alt = "";
    img.className = "dyn-cloud";
    img.style.width = `${Math.round(width)}px`;
    img.style.opacity = opacity.toFixed(2);
    img.style.filter = `blur(${blur.toFixed(1)}px) brightness(0.95)`;
    img.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    container.appendChild(img);

    clouds.push({ el: img, x, y, width, speed });
  }

  for (let i = 0; i < config.initialCount; i++) {
    spawnCloud(true);
  }

  let spawnTimer = config.spawnInterval * 0.5;

  return {
    update(dt) {
      const areaW = container.clientWidth || config.fallbackWidth;
      spawnTimer -= dt;
      if (spawnTimer <= 0 && clouds.length < config.maxCount) {
        spawnCloud(false);
        spawnTimer = config.spawnInterval * (0.65 + Math.random() * 0.8);
      }

      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        c.x += c.speed * dt;
        c.el.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`;
        if (c.x > areaW + 40) {
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
    initialCount: 14,
    maxCount: 20,
    spawnInterval: 2.6,
    minW: 96,
    maxW: 215,
    minY: 6,
    maxY: 225,
    minSpeed: 10,
    maxSpeed: 26,
    minBlur: 0.8,
    maxBlur: 2.2,
    minOpacity: 0.68,
    maxOpacity: 0.94
  }),
  createCloudSystem("stage-clouds", {
    fallbackWidth: 800,
    initialCount: 8,
    maxCount: 12,
    spawnInterval: 2.8,
    minW: 76,
    maxW: 150,
    minY: 8,
    maxY: 165,
    minSpeed: 12,
    maxSpeed: 26,
    minBlur: 0.7,
    maxBlur: 1.8,
    minOpacity: 0.72,
    maxOpacity: 0.95
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
    const duration = 5.5 + Math.random() * 3.8;
    const baseX = Math.random() * areaW;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const maxRise = 360 + Math.random() * 240;
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

    const duration = 3.2 + Math.random() * 3.4;
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
        const x = s.baseX + s.dir * (38 * p * p) + Math.sin(s.age * 4.5 + s.phase) * 18;
        const y = 18 + p * s.maxRise;
        const frame = Math.floor(s.age * 7) % 4;
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
        const x = m.baseX + Math.sin(p * 5 + m.phase) * m.sway;
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
