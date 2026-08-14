(function () {
  var cinematic = document.getElementById('cinematic');
  var introVideo = document.getElementById('introVideo');
  var fxCanvas = document.getElementById('fx-canvas');
  var line1 = document.getElementById('line1');
  var line2 = document.getElementById('line2');
  var startBtn = document.getElementById('startBtn');
  var skipToInvitation = document.getElementById('skipToInvitation');
  var introLoading = document.getElementById('introLoading');
  var invitation = document.getElementById('invitation');
  var soundToggle = document.getElementById('soundToggle');

  var revealed = false;
  var started = false;
  var bridgeStarted = false;
  var timers = [];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function schedule(fn, t) { timers.push(setTimeout(fn, t)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  // Returning visitors have already seen the film once; don't make them
  // sit through it again every time they reopen the link to check a detail.
  var INTRO_SEEN_KEY = 'omarMaryamIntroSeen';
  function markIntroSeen() {
    try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch (e) {}
  }
  var seenBefore = false;
  try { seenBefore = localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch (e) {}
  if (seenBefore) {
    revealed = true;
    cinematic.classList.add('hidden');
    invitation.classList.remove('hidden');
    soundToggle.classList.add('on-parchment');
  }

  /* ---------------- sound engine (synthesized, no audio files) ---------------- */
  var audioCtx = null;
  var masterGain = null;
  var ambientNodes = null;
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
      playTone(freq, now + i * 0.09, 0.6, 'triangle', 0.2);
    });
  }

  function playSparkle() {
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    var scale = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5];
    for (var i = 0; i < 9; i++) {
      var freq = scale[Math.floor(Math.random() * scale.length)];
      playTone(freq, now + i * 0.055, 0.5, 'sine', 0.16);
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

    // A warm A-major chord (root, third, fifth, octave) instead of a bare
    // open fifth, plus a soft high shimmer voice, for a fuller, richer pad.
    var voices = [
      { freq: 110,    type: 'sine',     level: 1 },    // A2 root
      { freq: 138.59, type: 'sine',     level: 0.75 }, // C#3 third
      { freq: 164.81, type: 'sine',     level: 0.9 },  // E3 fifth
      { freq: 220,    type: 'triangle', level: 0.6 },  // A3 octave
      { freq: 329.63, type: 'sine',     level: 0.22 }  // E4 airy shimmer
    ];
    var oscillators = voices.map(function (v) {
      var osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.value = v.freq;
      var g = ctx.createGain();
      g.gain.value = v.level;
      osc.connect(g);
      g.connect(pad);
      osc.start(now);
      return osc;
    });

    // Sparse, slow music-box shimmer: single soft notes from the chord's
    // own scale, minutes apart in feel, never a repeating melodic loop.
    var sparkleScale = [440, 523.25, 587.33, 659.25, 830.61];
    var sparkleOn = true;
    function sparkleStep() {
      if (!sparkleOn) return;
      var freq = sparkleScale[Math.floor(Math.random() * sparkleScale.length)];
      playTone(freq, ctx.currentTime, 3, 'sine', 0.05, pad);
      ambientNodes.sparkleTimeout = setTimeout(sparkleStep, 2600 + Math.random() * 3200);
    }

    ambientNodes = { pad: pad, lfo: lfo, oscillators: oscillators, sparkleTimeout: null };
    sparkleStep();
  }

  /* --- comedic record scratch: interrupts the film's own score --- */
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

  function setMuted(next) {
    muted = next;
    soundToggle.classList.toggle('muted', muted);
    soundToggle.setAttribute('aria-pressed', String(muted));
    introVideo.muted = muted;
    if (masterGain) {
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.9, audioCtx.currentTime + 0.15);
    }
  }
  soundToggle.addEventListener('click', function () {
    ensureAudio();
    setMuted(!muted);
  });

  /* ---------------- golden particle bridge (canvas) ---------------- */
  var GOLD_COLORS = ['#f6c869', '#c8a04e', '#ffe9b0'];
  var WHITE = '#fffaf0';

  function FX(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  // Scatter particles directly into a gentle twinkle field, continuing
  // the film's own confetti burst rather than re-simulating an explosion.
  FX.prototype.scatterTwinkle = function (count) {
    this.particles = [];
    for (var i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: this.h * 0.15 + Math.random() * this.h * 0.7,
        r: 0.9 + Math.random() * 2,
        alpha: 0.5,
        color: Math.random() < 0.8 ? GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)] : WHITE,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 4,
        driftY: -2 - Math.random() * 4
      });
    }
  };
  FX.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.particles = [];
    if (this.w) this.ctx.clearRect(0, 0, this.w, this.h);
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
    this.particles.forEach(function (p) {
      p.x += p.driftX * dt;
      p.y += p.driftY * dt;
      p.alpha = 0.35 + 0.45 * Math.sin(now * 0.0016 + p.phase);
    });
  };
  FX.prototype.draw = function () {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    this.particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.alpha);
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

  /* ---------------- timeline ---------------- */
  function showLine(el) { el.classList.add('show'); }
  function hideLine(el) { el.classList.remove('show'); }

  function revealInvitation() {
    if (revealed) return;
    revealed = true;
    markIntroSeen();
    clearTimers();
    hideLoading();
    fx.stop();
    try { introVideo.pause(); } catch (e) {}
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

  function beginBridge() {
    if (bridgeStarted) return;
    bridgeStarted = true;
    fxCanvas.classList.add('on');
  }

  function onVideoEnded() {
    beginBridge();
    playRecordScratch();
    introVideo.style.transition = 'opacity 0.6s ease';
    introVideo.style.opacity = '0';

    schedule(function () { startAmbient(); }, 500);
    schedule(function () { showLine(line1); }, 700);
    schedule(function () { hideLine(line1); }, 3300);
    schedule(function () { showLine(line2); }, 4000);
    schedule(function () { hideLine(line2); }, 6600);
    schedule(function () { revealInvitation(); }, 7500);
  }

  // Only show the loading dot if the film takes a moment to actually start
  // playing, so it never flashes on a normal fast load.
  var loadingTimer = null;
  function showLoadingIfSlow() {
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(function () {
      introLoading.classList.add('show');
    }, 350);
  }
  function hideLoading() {
    clearTimeout(loadingTimer);
    introLoading.classList.remove('show');
  }

  function runIntro() {
    fx.resize();
    window.addEventListener('resize', function () { if (fx.w) fx.resize(); });
    fx.scatterTwinkle(130);
    fx.start();

    introVideo.addEventListener('timeupdate', function () {
      if (!bridgeStarted && introVideo.duration && (introVideo.duration - introVideo.currentTime) < 1.5) {
        beginBridge();
      }
    });
    introVideo.addEventListener('playing', hideLoading);
    introVideo.addEventListener('ended', onVideoEnded);
    introVideo.addEventListener('error', function () { hideLoading(); revealInvitation(); });

    introVideo.muted = muted;
    showLoadingIfSlow();
    var playPromise = introVideo.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () {
        // Autoplay-with-sound was blocked despite the gesture; retry muted
        // so the visuals still play, and let the user unmute manually.
        introVideo.muted = true;
        introVideo.play().catch(function () { hideLoading(); revealInvitation(); });
      });
    }
  }

  startBtn.addEventListener('click', function () {
    if (started) return;
    started = true;
    ensureAudio();
    startBtn.classList.add('hidden');

    if (reduceMotion) {
      revealInvitation();
      return;
    }
    runIntro();
  });

  skipToInvitation.addEventListener('click', function () {
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
