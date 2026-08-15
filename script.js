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

  /* ---------------- sound engine (record scratch only; music is an audio file) --- */
  var audioCtx = null;
  var masterGain = null;
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

  // Browsers only let audio start from a user gesture. The film hands over to
  // the invitation on a timer, so that later play() has no activation behind it
  // and gets rejected. Unlock the element during the opening tap instead —
  // start it muted, then immediately pause — after which programmatic play()
  // on that same element is allowed.
  var musicPrimed = false;
  function primeBackgroundMusic() {
    if (!backgroundMusic || musicPrimed) return;
    musicPrimed = true;
    backgroundMusic.muted = true;
    var settle = function () {
      // don't clobber playback that legitimately started in the meantime
      if (!revealed) {
        backgroundMusic.pause();
        try { backgroundMusic.currentTime = 0; } catch (e) {}
      }
      backgroundMusic.muted = false;
    };
    var p = backgroundMusic.play();
    if (p && p.then) p.then(settle).catch(function () { backgroundMusic.muted = false; });
    else settle();
  }

  // If play() is still refused, retry once on the visitor's next interaction
  // rather than leaving the invitation silent until they find the sound button.
  function playBackgroundMusic() {
    if (!backgroundMusic || muted) return;
    backgroundMusic.volume = 0.7;
    var p = backgroundMusic.play();
    if (p && p.catch) {
      p.catch(function () {
        var retry = function () {
          document.removeEventListener('pointerdown', retry);
          document.removeEventListener('keydown', retry);
          if (!muted) backgroundMusic.play().catch(function () {});
        };
        document.addEventListener('pointerdown', retry);
        document.addEventListener('keydown', retry);
      });
    }
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
        playBackgroundMusic();
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
    playBackgroundMusic();
    skipToInvitation.classList.add('hidden');
    cinematic.style.transition = 'opacity 0.7s ease';
    cinematic.style.opacity = '0';
    setTimeout(function () {
      cinematic.classList.add('hidden');
      invitation.classList.remove('hidden');
      soundToggle.classList.add('on-parchment');
      document.body.classList.add('invitation-active');
    }, reduceMotion ? 0 : 700);
  }

  function beginBridge() {
    if (bridgeStarted) return;
    bridgeStarted = true;
    fx.scatterTwinkle(620);
    fxCanvas.classList.add('on');
  }

  function onVideoEnded() {
    beginBridge();
    playRecordScratch();
    introVideo.style.transition = 'opacity 0.6s ease';
    introVideo.style.opacity = '0';
    if (cineScrim) cineScrim.classList.add('on');

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
    primeBackgroundMusic();
    startBtn.classList.add('hidden');

    if (reduceMotion) {
      revealInvitation();
      return;
    }
    runIntro();
  });

  // Skip reveals the invitation synchronously inside this click, so play() has
  // user activation on its own and needs no priming.
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

  var ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function localizeDigits(str) {
    if (currentLang !== 'ar') return str;
    return str.replace(/[0-9]/g, function (d) { return ARABIC_DIGITS[+d]; });
  }
  function pad(n) { return localizeDigits(n < 10 ? '0' + n : '' + n); }

  function tick() {
    var diff = weddingDate.getTime() - Date.now();
    if (diff <= 0) {
      dEl.textContent = hEl.textContent = mEl.textContent = sEl.textContent = localizeDigits('00');
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

  /* ---------------- language switching (English / Arabic) ---------------- */
  var LANG_KEY = 'omarMaryamLang';
  var currentLang = 'ar';
  var langToggle = document.getElementById('langToggle');

  var META_BY_LANG = {
    en: {
      title: "Omar & Maryam's Marriage Ceremony Invitation",
      description: "You're invited to the marriage ceremony of Omar & Maryam on Friday, September 11, 2026 at El-Noor Hall, Hassan El-Sharbatly Mosque.",
      address: 'El-Noor Hall, Hassan El-Sharbatly Mosque, New Cairo, Cairo, Egypt',
      copied: 'Copied!',
      copyFailed: 'Failed to copy address',
      toggleLabel: 'Switch language to Arabic'
    },
    ar: {
      title: 'دعوة حفل عقد قران عمر ومريم',
      description: 'يسعدنا دعوتكم لحضور حفل عقد قران عمر ومريم يوم الجمعة ١١ سبتمبر ٢٠٢٦ بقاعة النور، مسجد حسن الشربتلي.',
      address: 'قاعة النور، مسجد حسن الشربتلي، القاهرة الجديدة، القاهرة، مصر',
      copied: 'تم النسخ!',
      copyFailed: 'تعذّر نسخ العنوان',
      toggleLabel: 'التبديل إلى اللغة الإنجليزية'
    }
  };

  function applyLang(lang) {
    currentLang = lang;
    var isAr = lang === 'ar';

    document.documentElement.lang = isAr ? 'ar' : 'en';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ar', isAr);

    document.querySelectorAll('[data-en]').forEach(function (el) {
      var val = el.getAttribute(isAr ? 'data-ar' : 'data-en');
      if (val !== null) el.textContent = val;
    });
    document.querySelectorAll('[data-en-html]').forEach(function (el) {
      var val = el.getAttribute(isAr ? 'data-ar-html' : 'data-en-html');
      if (val !== null) el.innerHTML = val;
    });

    var meta = META_BY_LANG[lang];
    document.title = meta.title;
    [
      ['meta[name="description"]', 'content'],
      ['meta[property="og:description"]', 'content'],
      ['meta[name="twitter:description"]', 'content']
    ].forEach(function (pair) {
      var node = document.querySelector(pair[0]);
      if (node) node.setAttribute(pair[1], meta.description);
    });
    ['meta[property="og:title"]', 'meta[name="twitter:title"]'].forEach(function (sel) {
      var node = document.querySelector(sel);
      if (node) node.setAttribute('content', meta.title);
    });

    if (langToggle) {
      langToggle.setAttribute('aria-label', meta.toggleLabel);
      langToggle.title = isAr ? 'English' : 'العربية';
      var label = langToggle.querySelector('.lang-label');
      if (label) label.textContent = isAr ? 'EN' : 'ع';
    }

    // redraw the countdown so its digits switch script along with the text
    tick();

    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  var savedLang = null;
  try { savedLang = localStorage.getItem(LANG_KEY); } catch (e) {}
  applyLang(savedLang === 'en' ? 'en' : 'ar');

  if (langToggle) {
    langToggle.addEventListener('click', function () {
      applyLang(currentLang === 'ar' ? 'en' : 'ar');
    });
  }

  // Copy address to clipboard
  var copyAddressBtn = document.querySelector('.copy-address');
  if (copyAddressBtn) {
    copyAddressBtn.addEventListener('click', function () {
      var strings = META_BY_LANG[currentLang];
      var addressText = strings.address;
      var originalText = copyAddressBtn.textContent;
      function showCopied() {
        copyAddressBtn.textContent = strings.copied;
        setTimeout(function () {
          copyAddressBtn.textContent = originalText;
        }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addressText).then(showCopied).catch(function () {
          alert(strings.copyFailed);
        });
      } else {
        // Fallback for older browsers
        var textArea = document.createElement('textarea');
        textArea.value = addressText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showCopied();
        } catch (err) {
          alert(strings.copyFailed);
        }
        document.body.removeChild(textArea);
      }
    });
  }
})();
