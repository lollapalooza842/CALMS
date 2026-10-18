/* The way in (DRAFT): one small WebGL canvas behind the loading screen.
   - It paints the dark, and once the page is loaded, slow warm smoke drifts through it (leaning a little toward the cursor).
   - On "Enter", a ring of white smoke opens from the middle and grows past the corners, showing the scene inside it.
   window.GR8_GATE = { smoke(on), open(done) }. Without WebGL the gate simply fades (stage.js). */
(function () {
  var cv = document.getElementById("gFx"); if (!cv) return;
  var gl = null; try { gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }); } catch (e) {}
  if (!gl) return;
  var VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
  var FS = [
    "precision highp float;",
    "uniform vec2 res, mouse; uniform float t, smoke, r, ring;",
    "float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }",
    "float soft(vec2 p){ float v = 0.0, a = .55; for (int i = 0; i < 3; i++){ v += a*n(p); p = p*1.9 + vec2(3.1, 7.7); a *= .45; } return v / .9; }",
    "float fbm(vec2 p){ float v = 0.0, a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; } return v; }",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - .5*res) / res.y;",
    "  vec3 bg = vec3(.075, .067, .063);",
    /* the drifting smoke: big, soft, slow; domain-warped noise, kept to a few blurry clouds */
    "  vec2 q = p*.75 + mouse*.15 + vec2(t*.03, -t*.02);",
    "  float w = soft(q + 1.6*vec2(soft(q*1.1 + t*.05), soft(q*1.1 - t*.04 + 5.0)));",
    "  float s = smoothstep(.42, .72, w) * smoke * (.55 + .45*smoothstep(-.2, .6, p.y + .3));",
    "  vec3 sc = mix(vec3(.3, .23, .21), vec3(.62, .45, .35), smoothstep(.6, .9, w));",
    "  vec3 col = mix(bg, sc, s);",
    "  float a = 1.0;",
    /* the ring: a hole whose ragged edge is thick white smoke, with a milky haze just inside it */
    "  if (ring > 0.0) {",
    "    float d = length(p); vec2 dir = p / max(d, .0001);",
    "    float rag = fbm(dir*2.6 + vec2(t*.5, -t*.3)) - .5; float fine = fbm(dir*9.0 + d*6.0 - t*.8) - .5;",
    "    float e = d - r - rag*(.08 + r*.12) - fine*.03;",
    "    float width = .05 + r*.07;",
    "    float inside = smoothstep(.0, -width*.9, e);",
    "    float band = exp(-(e*e)/(width*width)) * (.75 + .5*fbm(p*7.0 - t*.6));",
    "    float haze = inside * smoothstep(-width*5.0, 0.0, e) * .45;",
    "    vec3 white = vec3(1.0, .97, .93);",
    "    col = mix(col, white, clamp(band*1.2, 0.0, 1.0));",
    "    a = max(1.0 - inside, clamp(band*1.15, 0.0, 1.0));",
    "    a = max(a, haze); col = mix(col, white, haze*inside*(1.0 - band));",
    "    float bright = exp(-(e*e)/(width*width*.08)) * .6;",   /* the glowing seam in the middle of the ring */
    "    col += bright; a = max(a, bright);",
    "    a *= ring;",
    "  }",
    "  gl_FragColor = vec4(col*a, a);",
    "}"].join("\n");
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ["res", "mouse", "t", "smoke", "r", "ring"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
  document.getElementById("gate0").classList.add("fx");

  var smokeOn = 0, smokeNow = 0, r = 0, ring = 0, opening = null, mx = 0, my = 0, emx = 0, emy = 0, t0 = performance.now(), raf = 0, last = t0;
  addEventListener("pointermove", function (e) { mx = e.clientX / innerWidth - .5; my = .5 - e.clientY / innerHeight; }, { passive: true });
  function size() { var d = Math.min(devicePixelRatio || 1, 1.5), w = Math.round(innerWidth * d * .75), h = Math.round(innerHeight * d * .75); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } gl.viewport(0, 0, w, h); }
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; size();
    var rdt = Math.min(1, (now - (frame.p || now)) / 1000); frame.p = now; smokeNow += (smokeOn - smokeNow) * (1 - Math.exp(-rdt * 1.4)); emx += (mx - emx) * dt * 2; emy += (my - emy) * dt * 2;
    if (opening) {
      var k = Math.min(1, (now - opening.t) / opening.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; e = e * e * (3 - 2 * e) * .35 + e * .65;
      var far = Math.hypot(innerWidth / innerHeight / 2, .5) + .45; r = .02 + e * far; ring = 1 - Math.max(0, (k - .85) / .15);
      if (k >= 1) { var d = opening.done; opening = null; cancelAnimationFrame(raf); cv.remove(); if (d) d(); return; }
    }
    gl.uniform2f(U.res, cv.width, cv.height); gl.uniform2f(U.mouse, emx, emy); gl.uniform1f(U.t, (now - t0) / 1000);
    gl.uniform1f(U.smoke, smokeNow); gl.uniform1f(U.r, r); gl.uniform1f(U.ring, opening ? 1 : 0);
    if (opening) gl.uniform1f(U.ring, ring);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  window.GR8_GATE = {
    smoke: function (on) { smokeOn = on ? 1 : 0; },
    open: function (done, quick) { opening = { t: performance.now(), dur: quick ? 1200 : 5600, done: done }; }
  };
})();
