(function () {
  var cinematic = document.getElementById('cinematic');
  var introVideo = document.getElementById('introVideo');
  var backgroundMusic = document.getElementById('backgroundMusic');
  var fxCanvas = document.getElementById('fx-canvas');
  var cineScrim = document.getElementById('cineScrim');
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
  try { localStorage.removeItem(INTRO_SEEN_KEY); } catch (e) {}
  var seenBefore = false;
  try { seenBefore = localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch (e) {}
  if (seenBefore) {
    revealed = true;
    cinematic.classList.add('hidden');
    skipToInvitation.classList.add('hidden');
    invitation.classList.remove('hidden');
    soundToggle.classList.add('on-parchment');
    document.body.classList.add('invitation-active');
    setTimeout(function () {
      if (backgroundMusic && !muted) {
        backgroundMusic.play().catch(function () {});
      }
    }, 100);
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

  // A plucked, oud-like string voice: fast attack, a quick upward slide
  // into pitch (the finger/plectrum "pull"), a buzzy harmonic layer that
  // decays faster than the fundamental, then a long natural decay.
  function playOudPluck(freq, startTime, dest) {
    var ctx = audioCtx;
    if (!ctx) return;
    var duration = 1.8 + Math.random() * 1.3;

    var body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(freq * 1.02, startTime);
    body.frequency.exponentialRampToValueAtTime(freq, startTime + 0.05);

    var buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = freq;

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(freq * 7, startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.6, startTime + duration);

    var bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, startTime);
    bodyGain.gain.linearRampToValueAtTime(0.24, startTime + 0.008);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    var buzzGain = ctx.createGain();
    buzzGain.gain.setValueAtTime(0.0001, startTime);
    buzzGain.gain.linearRampToValueAtTime(0.07, startTime + 0.006);
    buzzGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.5);

    body.connect(bodyGain); bodyGain.connect(filter);
    buzz.connect(buzzGain); buzzGain.connect(filter);
    filter.connect(dest || masterGain);

    body.start(startTime); body.stop(startTime + duration + 0.05);
    buzz.start(startTime); buzz.stop(startTime + duration * 0.5 + 0.05);
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

    // A simple root+fifth drone, D3/A3 — maqam music leans on a drone
    // rather than Western triadic harmony, so the oud melody carries the
    // character instead of a full chord underneath it.
    var voices = [
      { freq: 146.83, type: 'sine', level: 1 },   // D3 root
      { freq: 220.00, type: 'sine', level: 0.45 } // A3 fifth
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

    // Maqam Hijaz scale on D (D Eb F# G A Bb C), the augmented-second
    // interval between Eb and F# is what gives it that unmistakably
    // Middle Eastern character. Sparse, unhurried plucked phrase.
    var hijaz = [146.83, 155.56, 185.00, 196.00, 220.00, 233.08, 261.63,
                 293.66, 311.13, 369.99, 392.00];
    var oudOn = true;
    function oudStep() {
      if (!oudOn) return;
      var freq = hijaz[Math.floor(Math.random() * hijaz.length)];
      playOudPluck(freq, ctx.currentTime, pad);
      ambientNodes.oudTimeout = setTimeout(oudStep, 900 + Math.random() * 1400);
    }

    ambientNodes = { pad: pad, lfo: lfo, oscillators: oscillators, oudTimeout: null };
    oudStep();
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
    if (backgroundMusic) {
      if (muted) {
        backgroundMusic.pause();
      } else {
        backgroundMusic.volume = 0.7;
        backgroundMusic.play().catch(function () {});
      }
    }
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
  // Scatter tumbling confetti ribbons radiating outward from the screen's
  // center, continuing the film's own radial burst (not a downward fall).
  FX.prototype.scatterTwinkle = function (count) {
    this.particles = [];
    var cx = this.w / 2;
    var cy = this.h * 0.42;
    var maxR = Math.max(this.w, this.h) * 0.55;
    var dustCount = Math.round(count * 0.5);
    for (var i = 0; i < count + dustCount; i++) {
      var isDust = i >= count;
      var angle = Math.random() * Math.PI * 2;
      // denser near center, already spread toward the edges (mid-burst)
      var radius = Math.pow(Math.random(), 0.6) * maxR;
      var speed = (isDust ? 8 : 25) + Math.random() * (isDust ? 18 : 55);
      var p = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * 0.95,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 5,
        color: Math.random() < 0.8 ? GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)] : WHITE,
        age: 0,
        life: 2.4 + Math.random() * 1.1,
        dust: isDust
      };
      if (isDust) {
        p.r = 0.6 + Math.random() * 1.2;
      } else {
        p.w = 3 + Math.random() * 3;
        p.h = 6 + Math.random() * 7;
      }
      this.particles.push(p);
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
  FX.prototype.update = function (dt) {
    this.particles.forEach(function (p) {
      // drag only: pieces keep radiating outward, just losing burst energy
      p.vx *= (1 - 0.3 * dt);
      p.vy *= (1 - 0.3 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      p.age += dt;
      p.alpha = Math.max(0, 1 - p.age / p.life);
    });
  };
  FX.prototype.draw = function () {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    this.particles.forEach(function (p) {
      if (p.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = p.dust ? p.alpha * 0.7 : p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      if (p.dust) {
        ctx.shadowBlur = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.shadowBlur = 3;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
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
    if (backgroundMusic && !muted) {
      backgroundMusic.play().catch(function () {});
    }
    skipToInvitation.classList.add('hidden');
    cinematic.style.transition = 'opacity 0.7s ease';
    cinematic.style.opacity = '0';
    setTimeout(function () {
      cinematic.classList.add('hidden');
      invitation.classList.remove('hidden');
      soundToggle.classList.add('on-parchment');
      document.body.classList.add('invitation-active');
      startAmbient();
    }, reduceMotion ? 0 : 700);
  }

  function beginBridge() {
    if (bridgeStarted) return;
    bridgeStarted = true;
    fx.scatterTwinkle(320);
    fxCanvas.classList.add('on');
  }

  function onVideoEnded() {
    beginBridge();
    playRecordScratch();
    introVideo.style.transition = 'opacity 0.6s ease';
    introVideo.style.opacity = '0';
    if (cineScrim) cineScrim.classList.add('on');

    schedule(function () { startAmbient(); }, 400);
    schedule(function () { showLine(line1); }, 800);
    schedule(function () { hideLine(line1); }, 2900);
    schedule(function () { showLine(line2); }, 3400);
    schedule(function () { hideLine(line2); }, 5200);
    schedule(function () { revealInvitation(); }, 5600);
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
    fx.start();

    introVideo.addEventListener('timeupdate', function () {
      if (!bridgeStarted && introVideo.duration && (introVideo.duration - introVideo.currentTime) < 1.5) {
        beginBridge();
      }
    });
    introVideo.addEventListener('playing', hideLoading);
    introVideo.addEventListener('ended', onVideoEnded);
    introVideo.addEventListener('error', function () { hideLoading(); revealInvitation(); });

    // Video plays with audio during cinematic, background music only on invitation
    introVideo.muted = false;
    if (backgroundMusic) {
      backgroundMusic.pause();
    }
    showLoadingIfSlow();
    var playPromise = introVideo.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () {
        introVideo.muted = false;
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

  // Countdown to the wedding: Friday, September 11, 2026, 8:30 PM
  var weddingDate = new Date(2026, 8, 11, 20, 30, 0);
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

  // Copy address to clipboard
  var copyAddressBtn = document.querySelector('.copy-address');
  if (copyAddressBtn) {
    copyAddressBtn.addEventListener('click', function () {
      var addressText = 'Noor Hall, Hassan El-Sharbatly Mosque, New Cairo, Cairo, Egypt';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addressText).then(function () {
          var originalText = copyAddressBtn.textContent;
          copyAddressBtn.textContent = 'Copied!';
          setTimeout(function () {
            copyAddressBtn.textContent = originalText;
          }, 2000);
        }).catch(function () {
          alert('Failed to copy address');
        });
      } else {
        // Fallback for older browsers
        var textArea = document.createElement('textarea');
        textArea.value = addressText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          copyAddressBtn.textContent = 'Copied!';
          setTimeout(function () {
            copyAddressBtn.textContent = originalText;
          }, 2000);
        } catch (err) {
          alert('Failed to copy address');
        }
        document.body.removeChild(textArea);
      }
    });
  }
})();
