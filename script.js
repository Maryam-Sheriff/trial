(function () {
  var frame = document.getElementById('frame');
  var cinematic = document.getElementById('cinematic');
  var camera = document.getElementById('camera');
  var sceneVehicle = document.getElementById('scene-vehicle');
  var sceneTower = document.getElementById('scene-tower');
  var alarmOverlay = document.getElementById('alarm-overlay');
  var freezeFlash = document.getElementById('freeze-flash');
  var fxCanvas = document.getElementById('fx-canvas');
  var textOverlay = document.getElementById('text-overlay');
  var line1 = document.getElementById('line1');
  var line2 = document.getElementById('line2');
  var startBtn = document.getElementById('startBtn');
  var skipBtn = document.getElementById('skipCine');
  var caption = document.getElementById('cine-caption');
  var invitation = document.getElementById('invitation');
  var soundToggle = document.getElementById('soundToggle');

  var revealed = false;
  var started = false;
  var timers = [];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function schedule(fn, t) { timers.push(setTimeout(fn, t)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---------------- sound engine (synthesized, no audio files) ---------------- */
  var audioCtx = null;
  var masterGain = null;
  var ambientNodes = null;
  var droneNodes = null;
  var alarmIntervalId = null;
  var sputterIntervalId = null;
  var cheerfulTimeoutId = null;
  var cheerfulPlaying = false;
  var muted = false;

  function ensureAudio() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.9;
      masterGain.connect(audioCtx.destination);
      // iOS Safari in particular needs an actual buffer played (not just
      // resume()) synchronously inside the gesture to unlock hardware audio.
      try {
        var unlockSrc = audioCtx.createBufferSource();
        unlockSrc.buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
        unlockSrc.connect(audioCtx.destination);
        unlockSrc.start(0);
      } catch (e) {}
    }
    // Some browsers (esp. inside embedded/iframed pages) create the context
    // suspended even on a direct click; kick it explicitly every time we
    // touch audio from a user gesture so playback never silently no-ops.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function noiseBuffer(ctx, duration) {
    var buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * duration), ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function playTone(freq, startTime, duration, type, peakGain, dest) {
    var ctx = audioCtx;
    if (!ctx) return;
    var osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain || 0.22, startTime + duration * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(dest || masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playChime() {
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach(function (freq, i) {
      playTone(freq, now + i * 0.09, 0.6, 'triangle', 0.24);
    });
  }

  function playSparkle() {
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    var scale = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5];
    for (var i = 0; i < 9; i++) {
      var freq = scale[Math.floor(Math.random() * scale.length)];
      playTone(freq, now + i * 0.055, 0.5, 'sine', 0.2);
    }
  }

  function startAmbient() {
    var ctx = ensureAudio();
    if (!ctx || ambientNodes) return;
    var now = ctx.currentTime;
    var pad = ctx.createGain();
    pad.gain.setValueAtTime(0.0001, now);
    pad.gain.linearRampToValueAtTime(0.05, now + 2.5);
    pad.connect(masterGain);

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(pad.gain);
    lfo.start(now);

    var oscillators = [110, 164.81, 220].map(function (freq) {
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(pad);
      osc.start(now);
      return osc;
    });

    ambientNodes = { pad: pad, lfo: lfo, oscillators: oscillators };
  }

  /* --- dramatic drone (plays while the vehicle spirals toward the tower) --- */
  function startDrone() {
    var ctx = ensureAudio();
    if (!ctx || droneNodes) return;
    var now = ctx.currentTime;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 1.2);
    gain.connect(masterGain);

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.connect(gain);

    var oscillators = [55, 82.5, 110].map(function (freq) {
      var osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start(now);
      return osc;
    });

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    droneNodes = { gain: gain, filter: filter, oscillators: oscillators, lfo: lfo };
  }

  function stopDrone(fast) {
    if (!droneNodes || !audioCtx) return;
    var now = audioCtx.currentTime;
    var t = fast ? 0.08 : 0.5;
    droneNodes.gain.gain.cancelScheduledValues(now);
    droneNodes.gain.gain.setValueAtTime(droneNodes.gain.gain.value, now);
    droneNodes.gain.gain.linearRampToValueAtTime(0.0001, now + t);
    var nodes = droneNodes;
    setTimeout(function () {
      nodes.oscillators.forEach(function (o) { try { o.stop(); } catch (e) {} });
      try { nodes.lfo.stop(); } catch (e) {}
    }, (t + 0.05) * 1000);
    droneNodes = null;
  }

  /* --- alarm siren loop --- */
  function startAlarmLoop() {
    var ctx = ensureAudio();
    if (!ctx || alarmIntervalId) return;
    var toggle = false;
    function beep() {
      var now = ctx.currentTime;
      playTone(toggle ? 880 : 660, now, 0.22, 'square', 0.2);
      toggle = !toggle;
    }
    beep();
    alarmIntervalId = setInterval(beep, 260);
  }
  function stopAlarmLoop() {
    if (alarmIntervalId) { clearInterval(alarmIntervalId); alarmIntervalId = null; }
  }

  /* --- engine sputter noise bursts --- */
  function playBurstNoise(duration, freqStart, freqEnd, peak) {
    var ctx = audioCtx;
    if (!ctx) return;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, duration);
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    var now = ctx.currentTime;
    filter.frequency.setValueAtTime(freqStart, now);
    filter.frequency.linearRampToValueAtTime(freqEnd, now + duration);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + duration * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
    src.stop(now + duration + 0.05);
  }
  function startSputter() {
    var ctx = ensureAudio();
    if (!ctx || sputterIntervalId) return;
    sputterIntervalId = setInterval(function () {
      playBurstNoise(0.18 + Math.random() * 0.12, 200 + Math.random() * 200, 900 + Math.random() * 600, 0.26);
    }, 340);
  }
  function stopSputter() {
    if (sputterIntervalId) { clearInterval(sputterIntervalId); sputterIntervalId = null; }
  }

  /* --- time-freeze whoosh --- */
  function playFreezeSweep() {
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.85);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.95);
  }

  /* --- comedic record scratch --- */
  function playRecordScratch() {
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.4);
    src.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(1200, now);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.setValueAtTime(0.5, now + 0.32);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);

    var rates = [1, 2.6, 0.6, 2.2, 0.4, 1.8, 0.15];
    rates.forEach(function (rate, i) {
      var t = now + i * 0.05;
      src.playbackRate.setValueAtTime(rate, t);
    });

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
    src.stop(now + 0.42);
  }

  /* --- cheerful romantic loop (plucky arpeggio) --- */
  var CHEERFUL_NOTES = [523.25, 659.25, 783.99, 659.25, 587.33, 783.99, 987.77, 783.99];
  function startCheerful() {
    var ctx = ensureAudio();
    if (!ctx || cheerfulPlaying) return;
    cheerfulPlaying = true;
    var i = 0;
    function step() {
      if (!cheerfulPlaying) return;
      var freq = CHEERFUL_NOTES[i % CHEERFUL_NOTES.length];
      playTone(freq, ctx.currentTime, 0.42, 'triangle', 0.2);
      if (i % 4 === 0) playTone(freq / 2, ctx.currentTime, 0.5, 'sine', 0.13);
      i++;
      cheerfulTimeoutId = setTimeout(step, 260);
    }
    step();
  }
  function stopCheerful() {
    cheerfulPlaying = false;
    if (cheerfulTimeoutId) { clearTimeout(cheerfulTimeoutId); cheerfulTimeoutId = null; }
  }

  function killAllLoops() {
    stopAlarmLoop();
    stopSputter();
    stopCheerful();
    stopDrone(true);
  }

  function setMuted(next) {
    muted = next;
    soundToggle.classList.toggle('muted', muted);
    soundToggle.setAttribute('aria-pressed', String(muted));
    if (masterGain) {
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.8, audioCtx.currentTime + 0.15);
    }
  }
  soundToggle.addEventListener('click', function () {
    ensureAudio();
    setMuted(!muted);
  });

  /* ---------------- golden particle engine (canvas) ---------------- */
  var GOLD_COLORS = ['#f6c869', '#c8a04e', '#ffe9b0'];
  var WHITE = '#fffaf0';
  var BLUSH = '#f0b8c6';

  function FX(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.mode = 'idle';
    this.raf = null;
    this.last = 0;
  }
  FX.prototype.resize = function () {
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };
  FX.prototype.explode = function (cx, cy, count) {
    this.particles = [];
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 60 + Math.random() * 260;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.4 + Math.random() * 2.2,
        alpha: 1,
        color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
        angle: 0, radius: 0, angSpeed: 0.6 + Math.random() * 1.6,
        tx: cx, ty: cy, phase: Math.random() * Math.PI * 2
      });
    }
    this.mode = 'explode';
  };
  FX.prototype.beginSwirl = function () {
    var cx = this.w * 0.5, cy = this.h * 0.46;
    this.particles.forEach(function (p) {
      var dx = p.x - cx, dy = p.y - cy;
      p.radius = Math.sqrt(dx * dx + dy * dy) || 1;
      p.angle = Math.atan2(dy, dx);
    });
    this.swirlCx = cx; this.swirlCy = cy;
    this.mode = 'swirl';
  };
  FX.prototype.buildTargets = function () {
    var w = this.w, h = this.h;
    var cx = w * 0.5, cy = h * 0.47;
    var cardW = w * 0.64, cardH = h * 0.36;
    var x0 = cx - cardW / 2, y0 = cy - cardH / 2, x1 = cx + cardW / 2, y1 = cy + cardH / 2;
    var count = this.particles.length;
    var borderCount = Math.floor(count * 0.55);
    var flowerCount = Math.floor(count * 0.18);
    var perim = 2 * (cardW + cardH);
    var idx = 0;

    for (var i = 0; i < borderCount && idx < count; i++, idx++) {
      var d = (i / borderCount) * perim;
      var x, y;
      if (d < cardW) { x = x0 + d; y = y0; }
      else if (d < cardW + cardH) { x = x1; y = y0 + (d - cardW); }
      else if (d < 2 * cardW + cardH) { x = x1 - (d - cardW - cardH); y = y1; }
      else { x = x0; y = y1 - (d - 2 * cardW - cardH); }
      this.particles[idx].tx = x; this.particles[idx].ty = y;
      this.particles[idx].tcolor = GOLD_COLORS[idx % GOLD_COLORS.length];
    }

    var R = Math.min(cardW, cardH) * 0.12;
    var fx = cx, fy = y0 + cardH * 0.26;
    for (var j = 0; j < flowerCount && idx < count; j++, idx++) {
      var theta = (j / flowerCount) * Math.PI * 2 * 3;
      var rr = R * Math.cos(2.5 * theta);
      var px = fx + rr * Math.cos(theta);
      var py = fy + rr * Math.sin(theta) * 0.9;
      this.particles[idx].tx = px; this.particles[idx].ty = py;
      this.particles[idx].tcolor = (j % 3 === 0) ? WHITE : BLUSH;
    }

    for (; idx < count; idx++) {
      this.particles[idx].tx = x0 + Math.random() * cardW;
      this.particles[idx].ty = y0 + Math.random() * cardH;
      this.particles[idx].tcolor = WHITE;
      this.particles[idx].sparkle = true;
    }
    this.mode = 'form';
  };
  FX.prototype.beginTwinkle = function () { this.mode = 'twinkle'; };
  FX.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.mode = 'idle';
    this.particles = [];
    this.ctx.clearRect(0, 0, this.w, this.h);
  };
  FX.prototype.start = function () {
    var self = this;
    this.last = performance.now();
    function loop(now) {
      var dt = Math.min((now - self.last) / 1000, 0.05);
      self.last = now;
      self.update(dt, now);
      self.draw();
      self.raf = requestAnimationFrame(loop);
    }
    this.raf = requestAnimationFrame(loop);
  };
  FX.prototype.update = function (dt, now) {
    var mode = this.mode;
    this.particles.forEach(function (p) {
      if (mode === 'explode') {
        p.vy += 40 * dt;
        p.vx *= (1 - 0.6 * dt);
        p.vy *= (1 - 0.4 * dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      } else if (mode === 'swirl') {
        p.angSpeed *= (1 + 0.25 * dt);
        p.angle += p.angSpeed * dt;
        p.radius += (18 - p.radius) * 0.35 * dt * 2 - p.radius * 0.15 * dt;
        p.radius = Math.max(6, p.radius);
        p.x = this.swirlCx + Math.cos(p.angle) * p.radius;
        p.y = this.swirlCy + Math.sin(p.angle) * p.radius * 0.85;
      } else if (mode === 'form') {
        p.x += (p.tx - p.x) * Math.min(1, dt * 3.2);
        p.y += (p.ty - p.y) * Math.min(1, dt * 3.2);
        if (p.tcolor) p.color = p.tcolor;
        p.r += ((p.sparkle ? 1 : 1.6) - p.r) * dt * 2;
      } else if (mode === 'twinkle') {
        p.alpha = 0.55 + 0.45 * Math.sin(now * 0.002 + p.phase);
      }
    }, this);
  };
  FX.prototype.draw = function () {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    this.particles.forEach(function (p) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  var fx = new FX(fxCanvas);

  /* ---------------- cinematic timeline ---------------- */
  function showLine(el) { el.classList.add('show'); }
  function hideLine(el) { el.classList.remove('show'); }

  function revealInvitation() {
    if (revealed) return;
    revealed = true;
    clearTimers();
    killAllLoops();
    fx.stop();
    cinematic.style.transition = 'opacity 0.7s ease';
    cinematic.style.opacity = '0';
    setTimeout(function () {
      cinematic.classList.add('hidden');
      invitation.classList.remove('hidden');
      soundToggle.classList.add('on-parchment');
      playChime();
      startAmbient();
    }, reduceMotion ? 0 : 700);
  }

  function runCinematicTimeline() {
    fx.resize();
    window.addEventListener('resize', function () { if (fx.w) fx.resize(); });

    startDrone();
    camera.classList.add('slow-drift');

    schedule(function () {
      sceneVehicle.classList.add('vehicle-fly');
      sceneTower.classList.add('tower-visible');
    }, 200);

    schedule(function () {
      caption.classList.remove('hidden');
    }, 1200);

    schedule(function () {
      camera.classList.remove('slow-drift');
      camera.classList.add('shaking');
      alarmOverlay.classList.add('active');
      sceneVehicle.classList.add('vehicle-alarm');
      startAlarmLoop();
      startSputter();
    }, 1900);

    schedule(function () {
      camera.classList.remove('shaking');
      camera.classList.add('frozen');
      alarmOverlay.classList.add('frozen');
      alarmOverlay.classList.remove('active');
      caption.classList.add('hidden');
      stopAlarmLoop();
      stopSputter();
      stopDrone(false);
      freezeFlash.classList.add('flash');
      playFreezeSweep();
    }, 6500);

    schedule(function () {
      playRecordScratch();
      camera.style.transition = 'opacity 0.6s ease';
      camera.style.opacity = '0';
      alarmOverlay.style.transition = 'opacity 0.4s ease';
      alarmOverlay.style.opacity = '0';
      fxCanvas.classList.add('on');
      var cx = fx.w * 0.66, cy = fx.h * 0.37;
      fx.explode(cx, cy, 240);
      fx.start();
    }, 7450);

    schedule(function () { startCheerful(); }, 8200);
    schedule(function () { fx.beginSwirl(); }, 8850);
    schedule(function () { fx.buildTargets(); }, 10700);
    schedule(function () {
      fx.beginTwinkle();
      playSparkle();
      showLine(line1);
    }, 12600);
    schedule(function () { hideLine(line1); }, 15000);
    schedule(function () { showLine(line2); }, 15900);
    schedule(function () { hideLine(line2); }, 18400);
    schedule(function () { revealInvitation(); }, 19300);
  }

  startBtn.addEventListener('click', function () {
    if (started) return;
    started = true;
    ensureAudio();
    startBtn.classList.add('hidden');
    skipBtn.classList.remove('hidden');

    if (reduceMotion) {
      revealInvitation();
      return;
    }
    runCinematicTimeline();
  });

  skipBtn.addEventListener('click', function () {
    ensureAudio();
    revealInvitation();
  });

  // Countdown to the wedding: Friday, September 11, 2026, 8:00 PM
  var weddingDate = new Date(2026, 8, 11, 20, 0, 0);
  var dEl = document.getElementById('cd-days');
  var hEl = document.getElementById('cd-hours');
  var mEl = document.getElementById('cd-mins');
  var sEl = document.getElementById('cd-secs');

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function tick() {
    var diff = weddingDate.getTime() - Date.now();
    if (diff <= 0) {
      dEl.textContent = hEl.textContent = mEl.textContent = sEl.textContent = '00';
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    dEl.textContent = pad(days);
    hEl.textContent = pad(hours);
    mEl.textContent = pad(mins);
    sEl.textContent = pad(secs);
  }

  tick();
  setInterval(tick, 1000);

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, root: invitation });
    document.querySelectorAll('.reveal-on-scroll').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal-on-scroll').forEach(function (el) {
      el.classList.add('in-view');
    });
  }
})();
