// SOUND: short beeps made by the browser itself, so there are no sound files to download.
// Sound starts off. The player turns it on with the speaker button.
let audio = null; // the browser's sound engine, created the first time a sound plays
let soundOn = false;

export function setSoundOn(on) {
  soundOn = on;
}

export function isSoundOn() {
  return soundOn;
}

// One beep: a note (frequency in hertz) that fades out over `seconds`.
function beep(frequency, seconds, wave = "sine", volume = 0.2, delay = 0) {
  if (!soundOn) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds); // fading out avoids a click at the end
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds);
}

// The game's sounds. Change the numbers to change how they sound.
export const sounds = {
  catch: () => beep(880, 0.12, "triangle"),
  miss: () => beep(160, 0.3, "sawtooth", 0.12),
  speedUp: () => {
    beep(660, 0.1, "square", 0.08);
    beep(990, 0.15, "square", 0.08, 0.1);
  },
  roundOver: () => {
    beep(440, 0.2, "triangle");
    beep(330, 0.35, "triangle", 0.2, 0.2);
  },
};
