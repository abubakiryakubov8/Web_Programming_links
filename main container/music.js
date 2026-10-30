/* Synthwave loop generated live with the Web Audio API.
   No audio file needed. Browsers block autoplay, so sound starts
   after the visitor clicks "Press start" or the music button. */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var root = document.documentElement;
  var start = document.getElementById('start');
  var toggle = document.getElementById('music-toggle');
  var label = document.getElementById('music-label');
  var bars = document.querySelectorAll('.eq span');

  if (!AC) { if (toggle) toggle.style.display = 'none'; }

  var ctx, master, analyser, delay, noiseBuf, data, timer;
  var playing = false, step = 0, nextTime = 0;
  var BPM = 98, S = 60 / BPM / 4;                       // one sixteenth note
  var chords = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]]; // Am F C G
  var roots = [33, 29, 36, 31];
  var arp = [0, 1, 2, 1, 0, 2, 1, 2];

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function init() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    var comp = ctx.createDynamicsCompressor();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);

    delay = ctx.createDelay();
    delay.delayTime.value = S * 3;
    var fb = ctx.createGain();
    fb.gain.value = 0.35;
    delay.connect(fb); fb.connect(delay); delay.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    data = new Uint8Array(analyser.frequencyBinCount);
  }

  function tone(type, f, t, dur, vol, o) {
    o = o || {};
    var osc = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = f;
    if (o.detune) osc.detune.value = o.detune;
    fl.type = 'lowpass';
    fl.frequency.value = o.cutoff || 1200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(fl); fl.connect(g); g.connect(master);
    if (o.send) g.connect(delay);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function kick(t) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + 0.35);
  }

  function noise(t, dur, type, freq, vol) {
    var src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    fl.type = type;
    fl.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }

  function schedule(n, t) {
    var bar = Math.floor(n / 16) % 4, s = n % 16, c = chords[bar];
    tone('sawtooth', hz(roots[bar] + (s % 4 === 2 ? 12 : 0)), t, S * 0.9, 0.28, { cutoff: 550 });
    if (s % 4 === 0) kick(t);
    if (s % 8 === 4) noise(t, 0.18, 'bandpass', 1800, 0.35);
    if (s % 4 === 2) noise(t, 0.05, 'highpass', 7000, 0.18);
    if (s === 0) {
      c.forEach(function (m) {
        [-7, 7].forEach(function (dt) {
          tone('sawtooth', hz(m), t, S * 16, 0.05, { detune: dt, cutoff: 900, attack: 0.6 });
        });
      });
    }
    if (s % 2 === 0) {
      tone('square', hz(c[arp[(s / 2) % 8]] + 12), t, S * 1.6, 0.07, { cutoff: 2500, send: true });
    }
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.15) {
      schedule(step, nextTime);
      nextTime += S;
      step++;
    }
  }

  function draw() {
    if (!playing) return;
    analyser.getByteFrequencyData(data);
    var idx = [1, 3, 5, 8, 12];
    for (var i = 0; i < bars.length; i++) {
      bars[i].style.transform = 'scaleY(' + (0.15 + (data[idx[i]] / 255) * 0.85) + ')';
    }
    requestAnimationFrame(draw);
  }

  function ui() {
    toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    label.textContent = playing ? 'Music on' : 'Music off';
    if (!playing) for (var i = 0; i < bars.length; i++) bars[i].style.transform = '';
  }

  function play() {
    if (!AC) return;
    if (!ctx) init();
    ctx.resume();
    nextTime = ctx.currentTime + 0.05;
    clearInterval(timer);
    timer = setInterval(tick, 25);
    playing = true;
    ui();
    draw();
  }

  function pause() {
    clearInterval(timer);
    if (ctx) ctx.suspend();
    playing = false;
    ui();
  }

  function enter() {
    start.classList.add('hide');
    root.classList.add('started');
    setTimeout(function () { start.style.display = 'none'; }, 700);
    toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', function () { playing ? pause() : play(); });
  document.getElementById('start-sound').addEventListener('click', function () { play(); enter(); });
  document.getElementById('start-quiet').addEventListener('click', enter);
  document.getElementById('start-sound').focus();
})();
