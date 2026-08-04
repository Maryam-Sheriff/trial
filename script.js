(function () {
  var intro = document.getElementById('intro');
  var openBtn = document.getElementById('openBtn');
  var flightWrap = document.getElementById('flightWrap');
  var skipHint = document.getElementById('skip');
  var invitation = document.getElementById('invitation');
  var revealed = false;

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

  var flightStarted = false;

  openBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    flightStarted = true;
    openBtn.classList.add('hidden');
    flightWrap.classList.remove('hidden');
    skipHint.classList.remove('hidden');
    setTimeout(revealInvitation, 3600);
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
