(function () {
  var intro = document.getElementById('intro');
  var openBtn = document.getElementById('openBtn');
  var flightWrap = document.getElementById('flightWrap');
  var burst = document.getElementById('burst');
  var skipHint = document.getElementById('skip');
  var invitation = document.getElementById('invitation');
  var soundToggle = document.getElementById('soundToggle');
  var revealed = false;
  var flightStarted = false;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CONFETTI_COLORS = ['#c8a04e', '#9c7a2f', '#f4a261', '#fdf6ec'];
  var PETAL_COLORS = ['#e08fa3', '#f0b8c6'];

  /* ---------------- sound engine (synthesized, no audio files) ---------------- */
  var audioCtx = null;
  var masterGain = null;
  var ambientNodes = null;
  var muted = false;

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 0.8;
    masterGain.connect(audioCtx.destination);
    return audioCtx;
  }

  function noiseBuffer(ctx, duration) {
    var buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function playWhoosh(duration) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, duration);
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    var now = ctx.currentTime;
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.linearRampToValueAtTime(1400, now + duration * 0.5);
    filter.frequency.linearRampToValueAtTime(320, now + duration);
    var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5, now + duration * 0.18);
    gain.gain.linearRampToValueAtTime(0.35, now + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    if (pan) {
      pan.pan.setValueAtTime(-0.9, now);
      pan.pan.linearRampToValueAtTime(0.9, now + duration);
      filter.connect(pan);
      pan.connect(gain);
    } else {
      filter.connect(gain);
    }
    gain.connect(masterGain);
    src.start(now);
    src.stop(now + duration + 0.05);
  }

  function playTone(freq, startTime, duration, type, peakGain) {
    var ctx = audioCtx;
    var osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain || 0.22, startTime + duration * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playChime() {
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach(function (freq, i) {
      playTone(freq, now + i * 0.09, 0.6, 'triangle', 0.18);
    });
  }

  function playSparkle() {
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    var scale = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5];
    for (var i = 0; i < 9; i++) {
      var freq = scale[Math.floor(Math.random() * scale.length)];
      playTone(freq, now + i * 0.055, 0.5, 'sine', 0.14);
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

  function setMuted(next) {
    muted = next;
    soundToggle.classList.toggle('muted', muted);
    soundToggle.setAttribute('aria-pressed', String(muted));
    if (masterGain) {
      var ctx = audioCtx;
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.8, ctx.currentTime + 0.15);
    }
  }

  soundToggle.addEventListener('click', function () {
    ensureAudio();
    setMuted(!muted);
  });

  function spawnBurst() {
    var count = 30;
    for (var i = 0; i < count; i++) {
      var isPetal = i % 2 === 0;
      var el = document.createElement('span');
      el.className = 'particle ' + (isPetal ? 'petal' : 'confetti');

      var angle = (Math.random() * Math.PI) + Math.PI;
      var dist = 90 + Math.random() * 220;
      var dx = Math.cos(angle) * dist;
      var dy = Math.abs(Math.sin(angle) * dist) + 160 + Math.random() * 140;
      var rot = (Math.random() * 540 - 270).toFixed(0) + 'deg';
      var size = isPetal ? (8 + Math.random() * 7) : (5 + Math.random() * 6);
      var duration = (1.1 + Math.random() * 0.6).toFixed(2) + 's';
      var delay = (Math.random() * 0.25).toFixed(2) + 's';

      el.style.setProperty('--dx', dx.toFixed(0) + 'px');
      el.style.setProperty('--dy', dy.toFixed(0) + 'px');
      el.style.setProperty('--rot', rot);
      el.style.width = size + 'px';
      el.style.height = (isPetal ? size * 1.3 : size) + 'px';
      el.style.background = isPetal
        ? PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]
        : CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      el.style.animationDuration = duration;
      el.style.animationDelay = delay;
      el.style.marginLeft = (Math.random() * 40 - 20) + 'px';

      burst.appendChild(el);
    }
  }

  function revealInvitation() {
    if (revealed) return;
    revealed = true;
    intro.style.transition = 'opacity 0.7s ease';
    intro.style.opacity = '0';
    setTimeout(function () {
      intro.classList.add('hidden');
      invitation.classList.remove('hidden');
      soundToggle.classList.add('on-parchment');
      startAmbient();
    }, 700);
  }

  openBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    flightStarted = true;

    if (reduceMotion) {
      revealInvitation();
      return;
    }

    ensureAudio();
    openBtn.classList.add('hidden');
    flightWrap.classList.remove('hidden');
    skipHint.classList.remove('hidden');
    playWhoosh(3.6);
    setTimeout(playChime, 1660);
    setTimeout(function () {
      spawnBurst();
      playSparkle();
      setTimeout(revealInvitation, 1400);
    }, 3600);
  });

  intro.addEventListener('click', function () {
    if (!flightStarted) return;
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
    }, { threshold: 0.2 });
    document.querySelectorAll('.reveal-on-scroll').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal-on-scroll').forEach(function (el) {
      el.classList.add('in-view');
    });
  }
})();
