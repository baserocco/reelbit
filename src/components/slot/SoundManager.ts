/**
 * SoundManager — Dragon's Inferno & ReelBit site-wide audio.
 * Rich procedural ambient music + polished casino slot SFX.
 * All Web Audio API — zero external files.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let muted = false;

// ── Ambient state ──
let ambientGain: GainNode | null = null;
let ambientNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
let ambientPlaying = false;
let ambientVolume = 0.5;
let ambientSchedulerId: number | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.4;
    sfxGain.connect(masterGain);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function getSfx(): GainNode {
  getCtx();
  return sfxGain!;
}

// ── Mute ──
export function setMuted(m: boolean) {
  muted = m;
  if (sfxGain) sfxGain.gain.setTargetAtTime(m ? 0 : 0.4, getCtx().currentTime, 0.05);
  if (ambientGain) ambientGain.gain.setTargetAtTime(m ? 0 : ambientVolume * 0.18, getCtx().currentTime, 0.3);
}
export function isMuted(): boolean { return muted; }

// ── Helpers ──
function osc(freq: number, type: OscillatorType, gain: number, dur: number, dest: AudioNode, detune = 0, fadeIn = 0) {
  if (muted) return;
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  if (fadeIn > 0) {
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + fadeIn);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  } else {
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  }
  o.connect(g);
  g.connect(dest);
  o.start(c.currentTime);
  o.stop(c.currentTime + dur + 0.05);
}

function noise(dur: number, gain: number, hp: number, lp: number, dest: AudioNode) {
  if (muted) return;
  const c = getCtx();
  const len = c.sampleRate * dur;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;
  const hpf = c.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = hp;
  const lpf = c.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = lp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);

  src.connect(hpf); hpf.connect(lpf); lpf.connect(g); g.connect(dest);
  src.start(); src.stop(c.currentTime + dur + 0.01);
}

function delayedOsc(delay: number, freq: number, type: OscillatorType, gain: number, dur: number, dest: AudioNode, detune = 0) {
  if (muted) return;
  setTimeout(() => osc(freq, type, gain, dur, dest, detune), delay);
}

// ════════════════════════════════════════
// AMBIENT MUSIC — Cinematic Dark Fantasy
// ════════════════════════════════════════

export function startAmbient() {
  if (ambientPlaying) return;
  const c = getCtx();
  ambientPlaying = true;
  ambientNodes = [];

  ambientGain = c.createGain();
  ambientGain.gain.setValueAtTime(0, c.currentTime);
  ambientGain.gain.linearRampToValueAtTime(muted ? 0 : ambientVolume * 0.18, c.currentTime + 3);
  ambientGain.connect(masterGain!);

  // — Compressor for cohesion
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.connect(ambientGain);

  // — Convolver reverb (synthetic IR)
  const reverbLen = 3;
  const reverbBuf = c.createBuffer(2, c.sampleRate * reverbLen, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const rd = reverbBuf.getChannelData(ch);
    for (let i = 0; i < rd.length; i++) {
      rd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rd.length, 2.5);
    }
  }
  const reverb = c.createConvolver();
  reverb.buffer = reverbBuf;

  const reverbSend = c.createGain();
  reverbSend.gain.value = 0.3;
  reverbSend.connect(reverb);
  reverb.connect(comp);

  const dryBus = c.createGain();
  dryBus.gain.value = 0.7;
  dryBus.connect(comp);

  // ── Layer 1: Deep Sub Bass Drone (A0 = 27.5 Hz) ──
  const sub = c.createOscillator();
  sub.type = "sine";
  sub.frequency.value = 27.5;
  const subG = c.createGain(); subG.gain.value = 0.5;
  // Sub LFO for slow pulse
  const subLfo = c.createOscillator(); subLfo.type = "sine"; subLfo.frequency.value = 0.06;
  const subLfoG = c.createGain(); subLfoG.gain.value = 0.15;
  subLfo.connect(subLfoG); subLfoG.connect(subG.gain);
  sub.connect(subG); subG.connect(dryBus);
  sub.start(); subLfo.start();
  ambientNodes.push(sub, subLfo);

  // ── Layer 2: Low Drone (A1 = 55 Hz) ──
  const drone = c.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 55;
  const droneG = c.createGain(); droneG.gain.value = 0.3;
  // Slow vibrato
  const droneLfo = c.createOscillator(); droneLfo.type = "sine"; droneLfo.frequency.value = 0.12;
  const droneLfoG = c.createGain(); droneLfoG.gain.value = 0.8;
  droneLfo.connect(droneLfoG); droneLfoG.connect(drone.frequency);
  drone.connect(droneG); droneG.connect(dryBus); droneG.connect(reverbSend);
  drone.start(); droneLfo.start();
  ambientNodes.push(drone, droneLfo);

  // ── Layer 3: Power Fifth (E2 = 82.4 Hz) ──
  const fifth = c.createOscillator();
  fifth.type = "triangle";
  fifth.frequency.value = 82.4;
  const fifthG = c.createGain(); fifthG.gain.value = 0.12;
  const fifthLfo = c.createOscillator(); fifthLfo.type = "sine"; fifthLfo.frequency.value = 0.04;
  const fifthLfoG = c.createGain(); fifthLfoG.gain.value = 0.06;
  fifthLfo.connect(fifthLfoG); fifthLfoG.connect(fifthG.gain);
  fifth.connect(fifthG); fifthG.connect(dryBus); fifthG.connect(reverbSend);
  fifth.start(); fifthLfo.start();
  ambientNodes.push(fifth, fifthLfo);

  // ── Layer 4: Dark Pad (Am chord: A2, C3, E3) ──
  const padNotes = [110, 130.81, 164.81];
  padNotes.forEach((freq, i) => {
    const pad = c.createOscillator();
    pad.type = "sine";
    pad.frequency.value = freq;
    pad.detune.value = (i - 1) * 3; // Slight detune for width
    const padG = c.createGain(); padG.gain.value = 0.04;
    // Slow swell
    const padLfo = c.createOscillator(); padLfo.type = "sine";
    padLfo.frequency.value = 0.03 + i * 0.008;
    const padLfoG = c.createGain(); padLfoG.gain.value = 0.025;
    padLfo.connect(padLfoG); padLfoG.connect(padG.gain);
    pad.connect(padG);
    padG.connect(dryBus);
    padG.connect(reverbSend);
    pad.start(); padLfo.start();
    ambientNodes.push(pad, padLfo);
  });

  // ── Layer 5: Ethereal High Harmonics ──
  const harmonics = [440, 659.25, 880]; // A4, E5, A5
  harmonics.forEach((freq, i) => {
    const harm = c.createOscillator();
    harm.type = "sine";
    harm.frequency.value = freq;
    const harmG = c.createGain(); harmG.gain.value = 0.008;
    // Slow pan via slight pitch wobble
    const harmLfo = c.createOscillator(); harmLfo.type = "sine";
    harmLfo.frequency.value = 0.02 + i * 0.01;
    const harmLfoG = c.createGain(); harmLfoG.gain.value = 2.5;
    harmLfo.connect(harmLfoG); harmLfoG.connect(harm.frequency);
    // Amplitude swell
    const harmAmpLfo = c.createOscillator(); harmAmpLfo.type = "sine";
    harmAmpLfo.frequency.value = 0.015 + i * 0.005;
    const harmAmpLfoG = c.createGain(); harmAmpLfoG.gain.value = 0.006;
    harmAmpLfo.connect(harmAmpLfoG); harmAmpLfoG.connect(harmG.gain);
    harm.connect(harmG);
    harmG.connect(reverbSend); // Mostly reverb for ethereal feel
    harm.start(); harmLfo.start(); harmAmpLfo.start();
    ambientNodes.push(harm, harmLfo, harmAmpLfo);
  });

  // ── Layer 6: Volcanic Rumble (filtered noise) ──
  const rumbleLen = 6;
  const rumbleBuf = c.createBuffer(2, c.sampleRate * rumbleLen, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const rd = rumbleBuf.getChannelData(ch);
    for (let i = 0; i < rd.length; i++) {
      // Brownian noise (smoother)
      rd[i] = i === 0 ? 0 : rd[i - 1] + (Math.random() * 2 - 1) * 0.04;
      rd[i] = Math.max(-1, Math.min(1, rd[i]));
    }
  }
  const rumble = c.createBufferSource();
  rumble.buffer = rumbleBuf;
  rumble.loop = true;
  const rumbleLpf = c.createBiquadFilter(); rumbleLpf.type = "lowpass"; rumbleLpf.frequency.value = 120; rumbleLpf.Q.value = 2;
  // Sweep the filter
  const filterLfo = c.createOscillator(); filterLfo.type = "sine"; filterLfo.frequency.value = 0.04;
  const filterLfoG = c.createGain(); filterLfoG.gain.value = 60;
  filterLfo.connect(filterLfoG); filterLfoG.connect(rumbleLpf.frequency);
  const rumbleG = c.createGain(); rumbleG.gain.value = 0.25;
  rumble.connect(rumbleLpf); rumbleLpf.connect(rumbleG); rumbleG.connect(dryBus);
  rumble.start(); filterLfo.start();
  ambientNodes.push(rumble as any, filterLfo);

  // ── Layer 7: Wind / Breath (high-passed noise) ──
  const windLen = 4;
  const windBuf = c.createBuffer(2, c.sampleRate * windLen, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const wd = windBuf.getChannelData(ch);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
  }
  const wind = c.createBufferSource();
  wind.buffer = windBuf;
  wind.loop = true;
  const windBpf = c.createBiquadFilter(); windBpf.type = "bandpass"; windBpf.frequency.value = 800; windBpf.Q.value = 0.5;
  const windLfo = c.createOscillator(); windLfo.type = "sine"; windLfo.frequency.value = 0.06;
  const windLfoG = c.createGain(); windLfoG.gain.value = 400;
  windLfo.connect(windLfoG); windLfoG.connect(windBpf.frequency);
  const windG = c.createGain(); windG.gain.value = 0.04;
  const windAmpLfo = c.createOscillator(); windAmpLfo.type = "sine"; windAmpLfo.frequency.value = 0.025;
  const windAmpG = c.createGain(); windAmpG.gain.value = 0.03;
  windAmpLfo.connect(windAmpG); windAmpG.connect(windG.gain);
  wind.connect(windBpf); windBpf.connect(windG); windG.connect(reverbSend);
  wind.start(); windLfo.start(); windAmpLfo.start();
  ambientNodes.push(wind as any, windLfo, windAmpLfo);

  // ── Layer 8: Melodic Shimmer — scheduled arpeggiated notes ──
  // Pentatonic Am: A, C, D, E, G across octaves
  const penta = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
  let nextNoteTime = c.currentTime + 4; // Start after fade in

  const scheduleNote = () => {
    if (!ambientPlaying) return;
    const now = getCtx().currentTime;
    while (nextNoteTime < now + 2) {
      const freq = penta[Math.floor(Math.random() * penta.length)];
      const noteO = c.createOscillator();
      noteO.type = "sine";
      noteO.frequency.value = freq;
      noteO.detune.value = (Math.random() - 0.5) * 6;

      const noteG = c.createGain();
      const vol = 0.008 + Math.random() * 0.012;
      const dur = 2 + Math.random() * 4;
      noteG.gain.setValueAtTime(0, nextNoteTime);
      noteG.gain.linearRampToValueAtTime(vol, nextNoteTime + dur * 0.3);
      noteG.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + dur);

      noteO.connect(noteG);
      noteG.connect(reverbSend);
      noteO.start(nextNoteTime);
      noteO.stop(nextNoteTime + dur + 0.1);

      // Random interval: 1.5-5s between notes
      nextNoteTime += 1.5 + Math.random() * 3.5;
    }
    ambientSchedulerId = requestAnimationFrame(scheduleNote);
  };
  ambientSchedulerId = requestAnimationFrame(scheduleNote);
}

export function stopAmbient() {
  if (!ambientPlaying || !ambientGain) return;
  const c = getCtx();
  ambientPlaying = false;
  if (ambientSchedulerId) cancelAnimationFrame(ambientSchedulerId);
  ambientSchedulerId = null;

  ambientGain.gain.setTargetAtTime(0, c.currentTime, 1.5);

  setTimeout(() => {
    ambientNodes.forEach(n => { try { n.stop(); } catch {} });
    ambientNodes = [];
    ambientGain = null;
  }, 5000);
}

export function setAmbientVolume(vol: number) {
  ambientVolume = Math.max(0, Math.min(1, vol));
  if (ambientGain && !muted) {
    ambientGain.gain.setTargetAtTime(ambientVolume * 0.18, getCtx().currentTime, 0.1);
  }
}
export function getAmbientVolume(): number { return ambientVolume; }
export function isAmbientPlaying(): boolean { return ambientPlaying; }


// ════════════════════════════════════════
// SLOT SOUND EFFECTS — Professional Casino
// ════════════════════════════════════════

/** Spin start — satisfying mechanical lever + whoosh */
export function playSpin() {
  if (muted) return;
  const s = getSfx();
  const c = getCtx();

  // Chunky lever click
  noise(0.035, 0.2, 1500, 8000, s);
  osc(340, "square", 0.06, 0.03, s);

  // Whoosh — filtered sweep down
  const whoosh = c.createOscillator();
  whoosh.type = "sawtooth";
  whoosh.frequency.setValueAtTime(600, c.currentTime);
  whoosh.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.35);
  const wLpf = c.createBiquadFilter(); wLpf.type = "lowpass"; wLpf.frequency.value = 2000;
  const wG = c.createGain();
  wG.gain.setValueAtTime(0.06, c.currentTime);
  wG.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  whoosh.connect(wLpf); wLpf.connect(wG); wG.connect(s);
  whoosh.start(); whoosh.stop(c.currentTime + 0.45);

  // Reel spin hum
  delayedOsc(40, 120, "triangle", 0.04, 0.25, s);
}

/** Reel stop — weight impact with tonal ping */
export function playReelStop(reelIndex: number) {
  if (muted) return;
  const s = getSfx();
  const pitch = 200 + reelIndex * 40;

  // Impact thud
  osc(pitch * 0.5, "sine", 0.18, 0.08, s);
  noise(0.025, 0.12, 2000, 12000, s);

  // Tonal ping — higher for each reel (satisfying progression)
  osc(pitch, "sine", 0.08, 0.15, s);
  osc(pitch * 1.5, "triangle", 0.03, 0.1, s);

  // Subtle resonance tail
  osc(pitch * 0.75, "sine", 0.02, 0.2, s);
}

/** Last reel — dramatic heavy impact */
export function playLastReelStop() {
  if (muted) return;
  const s = getSfx();

  // Heavy bass thud
  osc(60, "sine", 0.25, 0.18, s);
  osc(90, "sine", 0.15, 0.15, s);
  noise(0.05, 0.15, 1000, 6000, s);

  // Metallic ring
  osc(400, "sine", 0.06, 0.25, s);
  osc(600, "triangle", 0.03, 0.2, s, 7);

  // Sub boom
  osc(35, "sine", 0.12, 0.3, s);
}

/** Win — bright ascending chime arpeggio */
export function playWin() {
  if (muted) return;
  const s = getSfx();
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    setTimeout(() => {
      osc(freq, "sine", 0.12, 0.35, s, (Math.random() - 0.5) * 4);
      osc(freq * 2, "sine", 0.03, 0.25, s);  // Octave shimmer
      osc(freq * 0.5, "triangle", 0.04, 0.3, s); // Body
    }, i * 65);
  });

  // Sparkle tail
  setTimeout(() => noise(0.15, 0.02, 6000, 16000, s), 260);
}

/** Big win — layered fanfare */
export function playBigWin() {
  if (muted) return;
  const s = getSfx();

  // Bass foundation
  osc(130.8, "sine", 0.12, 1.0, s);
  osc(65.4, "sine", 0.08, 1.2, s);

  // Fanfare melody
  const melody = [523, 659, 784, 1047, 1319, 1568];
  melody.forEach((freq, i) => {
    setTimeout(() => {
      osc(freq, "sine", 0.14, 0.5, s, (Math.random() - 0.5) * 6);
      osc(freq * 1.5, "triangle", 0.04, 0.35, s);
      osc(freq * 0.5, "sine", 0.06, 0.4, s);
    }, i * 100);
  });

  // Coin shower shimmer
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      osc(2000 + Math.random() * 3000, "sine", 0.02, 0.15, s);
    }, 500 + i * 70);
  }

  // Impact cymbal
  setTimeout(() => noise(0.4, 0.04, 4000, 16000, s), 550);
}

/** Super/Mega win — full cinematic */
export function playSuperWin() {
  if (muted) return;
  const s = getSfx();

  // Sub impact
  osc(30, "sine", 0.15, 1.5, s);
  osc(55, "sine", 0.12, 1.2, s);

  // Epic rising power chord (Am → C → E → Am)
  const progression = [
    { t: 0, notes: [220, 277, 330] },
    { t: 200, notes: [261, 330, 392] },
    { t: 400, notes: [330, 415, 494] },
    { t: 600, notes: [440, 554, 659] },
    { t: 800, notes: [523, 659, 784] },
    { t: 950, notes: [659, 784, 1047] },
    { t: 1100, notes: [880, 1047, 1319] },
  ];

  progression.forEach(({ t, notes }) => {
    notes.forEach((freq, i) => {
      setTimeout(() => {
        osc(freq, "sine", 0.1, 0.6, s, i * 3);
        osc(freq * 2, "sine", 0.02, 0.4, s);
      }, t);
    });
  });

  // Crash + sparkle
  setTimeout(() => {
    noise(0.6, 0.06, 3000, 16000, s);
    osc(1568, "sine", 0.08, 1.0, s);
    osc(2093, "sine", 0.04, 0.8, s);
  }, 1100);

  // Final shimmer cascade
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      osc(1500 + Math.random() * 4000, "sine", 0.015, 0.2, s);
    }, 1200 + i * 50);
  }
}

/** Tumble — cascading crystalline waterfall */
export function playTumble() {
  if (muted) return;
  const s = getSfx();
  const cascade = [987, 880, 784, 659, 587];
  cascade.forEach((freq, i) => {
    setTimeout(() => {
      osc(freq, "sine", 0.06, 0.12, s, (Math.random() - 0.5) * 8);
      osc(freq * 2, "sine", 0.015, 0.1, s);
    }, i * 35);
  });
  // Whoosh
  noise(0.12, 0.03, 3000, 10000, s);
}

/** Symbol removal — shattering dissolve */
export function playSymbolRemove() {
  if (muted) return;
  const s = getSfx();
  osc(1400, "sine", 0.05, 0.08, s);
  osc(800, "triangle", 0.03, 0.12, s);
  noise(0.06, 0.06, 5000, 14000, s);
  // Glass shatter
  for (let i = 0; i < 3; i++) {
    delayedOsc(i * 15, 3000 + Math.random() * 2000, "sine", 0.01, 0.06, s);
  }
}

/** Anticipation — dark tension build with heartbeat pulse */
export function playAnticipation() {
  if (muted) return;
  const s = getSfx();
  const c = getCtx();

  // Rising tension sweep
  const sweep = c.createOscillator();
  sweep.type = "sawtooth";
  sweep.frequency.setValueAtTime(80, c.currentTime);
  sweep.frequency.exponentialRampToValueAtTime(400, c.currentTime + 1.0);
  const sweepLpf = c.createBiquadFilter(); sweepLpf.type = "lowpass";
  sweepLpf.frequency.setValueAtTime(300, c.currentTime);
  sweepLpf.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 1.0);
  const sweepG = c.createGain();
  sweepG.gain.setValueAtTime(0, c.currentTime);
  sweepG.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.7);
  sweepG.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.1);
  sweep.connect(sweepLpf); sweepLpf.connect(sweepG); sweepG.connect(s);
  sweep.start(); sweep.stop(c.currentTime + 1.15);

  // Heartbeat-style bass pulses
  [0, 300, 550, 750].forEach(t => {
    setTimeout(() => {
      osc(50, "sine", 0.1 + t * 0.0001, 0.12, s);
      osc(100, "triangle", 0.03, 0.08, s);
    }, t);
  });

  // High tension string
  osc(880, "sine", 0.0, 1.1, s, 0, 0.8); // fadeIn
}

/** Free spins trigger — heroic reveal */
export function playFreeSpinsTrigger() {
  if (muted) return;
  const s = getSfx();

  // Deep impact
  osc(40, "sine", 0.2, 0.8, s);
  noise(0.15, 0.1, 800, 4000, s);

  // Rising power notes
  const rise = [196, 261, 330, 392, 523, 659, 784, 1047];
  rise.forEach((freq, i) => {
    setTimeout(() => {
      osc(freq, "sine", 0.1, 0.7, s, (Math.random() - 0.5) * 5);
      osc(freq * 1.5, "triangle", 0.03, 0.5, s);
    }, i * 70);
  });

  // Grand impact at peak
  setTimeout(() => {
    osc(55, "sine", 0.2, 1.0, s);
    noise(0.3, 0.08, 2000, 12000, s);
    osc(1047, "sine", 0.1, 0.8, s);
    osc(1568, "sine", 0.05, 0.6, s);
  }, 560);

  // Magical sparkle shower
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      osc(2500 + Math.random() * 3000, "sine", 0.02, 0.2, s);
    }, 650 + i * 50);
  }
}

/** Button click — crisp tactile feedback */
export function playClick() {
  if (muted) return;
  const s = getSfx();
  osc(900, "sine", 0.06, 0.03, s);
  noise(0.015, 0.05, 4000, 12000, s);
}

/** Coin tick */
export function playCoinTick() {
  if (muted) return;
  const s = getSfx();
  osc(1600 + Math.random() * 600, "sine", 0.04, 0.04, s);
}

/** Scatter land */
export function playScatterLand() {
  if (muted) return;
  const s = getSfx();
  osc(440, "sine", 0.12, 0.3, s);
  osc(880, "sine", 0.06, 0.25, s, 5);
  osc(660, "triangle", 0.08, 0.35, s);
  noise(0.08, 0.05, 2000, 8000, s);
  // Mystical tail
  delayedOsc(100, 1320, "sine", 0.03, 0.3, s, 12);
}

/** Buy feature — power-up activation */
export function playBuyFeature() {
  if (muted) return;
  const s = getSfx();
  const c = getCtx();

  // Power charge sweep
  const charge = c.createOscillator();
  charge.type = "sawtooth";
  charge.frequency.setValueAtTime(100, c.currentTime);
  charge.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.25);
  const chLpf = c.createBiquadFilter(); chLpf.type = "lowpass"; chLpf.frequency.value = 3000;
  const chG = c.createGain();
  chG.gain.setValueAtTime(0.08, c.currentTime);
  chG.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  charge.connect(chLpf); chLpf.connect(chG); chG.connect(s);
  charge.start(); charge.stop(c.currentTime + 0.4);

  // Confirmation tones
  delayedOsc(150, 659, "sine", 0.1, 0.25, s);
  delayedOsc(280, 784, "sine", 0.1, 0.25, s);
  delayedOsc(380, 1047, "sine", 0.12, 0.4, s);

  // Bass confirmation
  delayedOsc(300, 130.8, "sine", 0.08, 0.4, s);
}
