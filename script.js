(function () {
  var cinematic = document.getElementById('cinematic');
  var backgroundMusic = document.getElementById('backgroundMusic');
  var fxCanvas = document.getElementById('fx-canvas');
  var emblem = document.getElementById('emblem');
  var line1 = document.getElementById('line1');
  var line2 = document.getElementById('line2');
  var startBtn = document.getElementById('startBtn');
  var skipToInvitation = document.getElementById('skipToInvitation');
  var invitation = document.getElementById('invitation');
  var soundToggle = document.getElementById('soundToggle');

  var revealed = false;
  var started = false;
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
  // Slow-drifting gold dust: motes rise gently and twinkle, the way light
  // catches specks in a warm room. Deliberately calm, not a confetti burst.
  FX.prototype.goldDust = function (count) {
    this.particles = [];
    for (var i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: 0.5 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 5,
        vy: -(3 + Math.random() * 9),
        color: Math.random() < 0.85 ? GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)] : WHITE,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.5 + Math.random() * 1.1,
        base: 0.18 + Math.random() * 0.5
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
    var h = this.h, w = this.w;
    this.particles.forEach(function (p) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // wrap so the drift never thins out during the opening
      if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
      if (p.x < -8) p.x = w + 8;
      else if (p.x > w + 8) p.x = -8;
      p.alpha = p.base * (0.55 + 0.45 * Math.sin(now * 0.001 * p.twinkle + p.phase));
    });
  };
  FX.prototype.draw = function () {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    this.particles.forEach(function (p) {
      if (p.alpha <= 0) return;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
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
    fx.stop();
    playBackgroundMusic();
    skipToInvitation.classList.add('hidden');
    cinematic.style.transition = 'opacity 0.9s ease';
    cinematic.style.opacity = '0';
    setTimeout(function () {
      cinematic.classList.add('hidden');
      invitation.classList.remove('hidden');
      soundToggle.classList.add('on-parchment');
      document.body.classList.add('invitation-active');
    }, reduceMotion ? 0 : 900);
  }

  // The opening is a timed sequence now: warm light, then the monogram draws
  // itself in and catches a sheen, then the two lines, then the invitation.
  function runIntro() {
    fx.resize();
    window.addEventListener('resize', function () { if (fx.w) fx.resize(); });
    fx.goldDust(110);
    fx.start();
    fxCanvas.classList.add('on');
    cinematic.classList.add('lit');

    schedule(function () { emblem.classList.add('show'); }, 250);
    schedule(function () { emblem.classList.add('fade'); }, 5200);
    schedule(function () { showLine(line1); }, 6100);
    schedule(function () { hideLine(line1); }, 8400);
    schedule(function () { showLine(line2); }, 8900);
    schedule(function () { hideLine(line2); }, 11400);
    schedule(function () { revealInvitation(); }, 11900);
  }

  startBtn.addEventListener('click', function () {
    if (started) return;
    started = true;
    ensureAudio();
    // starting here means play() always has a user gesture behind it
    playBackgroundMusic();
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

  // Countdown to the wedding: Friday, September 11, 2026, 9:00 PM
  var weddingDate = new Date(2026, 8, 11, 21, 0, 0);
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
