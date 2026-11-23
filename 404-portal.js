const vertexSource = `
  attribute vec2 position;
  varying vec2 uv;

  void main() {
    uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// WebGL port of IrisPortal.shader. The snow arena stands in for the linked camera.
const fragmentSource = `
  precision mediump float;

  uniform sampler2D portalSprite;
  uniform sampler2D destination;
  uniform float time;
  uniform float opening;
  uniform float turns;
  varying vec2 uv;

  void main() {
    vec4 tile = texture2D(portalSprite, uv);
    float interior = 1.0 - step(0.22, tile.g);
    vec2 grid = vec2(72.0, 112.0);
    vec2 pixel = (floor(uv * grid) + 0.5) / grid;
    vec2 fromCenter = (pixel - vec2(0.485, 0.5)) / vec2(0.395, 0.455);
    float radius = length(fromCenter);
    float angle = atan(fromCenter.x, fromCenter.y + 0.0001) / 6.2831853;
    float spin = (angle - turns) * 6.2831853;
    float wave = sin(radius * 20.0 + spin * 2.0 - time * 3.0);
    float ripple = cos(radius * 14.0 - spin * 3.0 + time * 2.0);
    float distortion = mix(0.3, 1.0, smoothstep(0.15, 0.9, radius));
    vec2 displaced = clamp(pixel + vec2(wave * 0.037, ripple * 0.026) * distortion, 0.0, 1.0);
    vec2 sceneUV = vec2(0.5) + (displaced - 0.5) * vec2(0.17, 0.90);
    vec3 scene = texture2D(destination, sceneUV).rgb;

    vec3 tint = vec3(0.07, 0.44, 1.0);
    float gleam = 0.5 + 0.5 * sin(spin * 3.0 + radius * 13.0);
    vec3 rim = mix(tint * (0.29 + tile.g * (0.76 + gleam * 0.56)), vec3(1.0, 1.0, 0.96),
      clamp((tile.g - 0.66) * 1.52 + gleam * 0.24, 0.0, 1.0));
    float innerShimmer = smoothstep(0.62, 0.98, radius) *
      smoothstep(0.25, 0.94, 0.5 + 0.5 * wave);
    vec3 glass = scene * (0.83 + wave * 0.05 * distortion) +
      tint * (0.073 + ripple * 0.04 * distortion + innerShimmer * 0.15);

    float openingAngle = fract(angle + 0.018);
    float sweep = clamp(opening * 1.18 + 0.025, 0.0, 1.0);
    float arc = mix(smoothstep(-0.035, 0.025, sweep - openingAngle), 1.0,
      smoothstep(0.86, 1.0, opening));
    float opened = smoothstep(0.23, 0.77, opening);
    float alpha = tile.a * mix(arc, arc * opened, interior);
    float trail = (1.0 - smoothstep(0.025, 0.21, fract(sweep - openingAngle))) *
      (1.0 - smoothstep(0.82, 1.0, opening));
    float head = (1.0 - smoothstep(0.02, 0.12, abs(sweep - openingAngle))) * trail;
    vec3 hot = mix(tint, vec3(1.0, 0.97, 0.78), 0.72);
    vec3 color = mix(mix(rim, hot, head), glass, interior);

    float behind = fract((turns - angle) * 4.0);
    float tail = 1.0 - smoothstep(0.0, 0.74, behind);
    float trailRadius = 1.02 + 0.10 * behind + 0.035 * sin(spin * 4.0 + time * 7.0);
    float distanceToTrail = abs(radius - trailRadius);
    float orbit = smoothstep(0.77, 1.0, opening) * tail;
    float halo = (1.0 - smoothstep(0.025, 0.095, distanceToTrail)) * orbit;
    float core = (1.0 - smoothstep(0.015, 0.050, distanceToTrail)) * orbit;
    vec3 sparks = vec3(1.0, 0.31, 0.05) * halo * 0.32 + vec3(1.0, 0.79, 0.36) * core * 0.82;
    gl_FragColor = vec4(color * alpha + sparks, max(alpha, halo * 0.32 + core * 0.48));
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

async function loadTexture(gl, unit, source) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

async function animatePortal(canvas) {
  const gl = canvas.getContext("webgl");
  if (!gl) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let frame;
  canvas.addEventListener("webglcontextlost", () => {
    canvas.hidden = true;
    cancelAnimationFrame(frame);
    reducedMotion.removeEventListener("change", restart);
  }, { once: true });

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  await Promise.all([
    loadTexture(gl, 0, "/assets/iris-portal.png"),
    loadTexture(gl, 1, "/assets/arena-snow.png")
  ]);
  if (gl.isContextLost()) return;

  gl.uniform1i(gl.getUniformLocation(program, "portalSprite"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "destination"), 1);
  const time = gl.getUniformLocation(program, "time");
  const opening = gl.getUniformLocation(program, "opening");
  const turns = gl.getUniformLocation(program, "turns");
  const openedAt = performance.now();

  function draw(now) {
    const elapsed = reducedMotion.matches ? 0 : (now - openedAt) / 1000;
    gl.uniform1f(time, elapsed % (Math.PI * 2));
    gl.uniform1f(opening, reducedMotion.matches ? 1 : Math.min(elapsed / 0.46, 1));
    gl.uniform1f(turns, (elapsed * 0.63) % 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
  }

  function restart() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }

  canvas.hidden = false;
  reducedMotion.addEventListener("change", restart);
  restart();
}

animatePortal(document.querySelector("#iris-portal")).catch(error => {
  console.warn("Could not animate the Iris portal.", error);
});
