(function () {
  var intro = document.getElementById('intro');
  var openBtn = document.getElementById('openBtn');
  var flightWrap = document.getElementById('flightWrap');
  var burst = document.getElementById('burst');
  var skipHint = document.getElementById('skip');
  var invitation = document.getElementById('invitation');
  var revealed = false;
  var flightStarted = false;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CONFETTI_COLORS = ['#c8a04e', '#9c7a2f', '#f4a261', '#fdf6ec'];
  var PETAL_COLORS = ['#e08fa3', '#f0b8c6'];

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
    }, 700);
  }

  openBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    flightStarted = true;

    if (reduceMotion) {
      revealInvitation();
      return;
    }

    openBtn.classList.add('hidden');
    flightWrap.classList.remove('hidden');
    skipHint.classList.remove('hidden');
    setTimeout(function () {
      spawnBurst();
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
})();
