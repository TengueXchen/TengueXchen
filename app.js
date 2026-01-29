const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

const controls = {
  feminity: document.getElementById("feminity"),
  brightness: document.getElementById("brightness"),
  volume: document.getElementById("volume"),
};

let audioContext;
let micStream;
let micSource;
let outputGain;
let highPass;
let lowShelf;
let highShelf;
let presence;
let compressor;

function updateStatus(active) {
  statusDot.classList.toggle("active", active);
  statusText.textContent = active ? "女聲啟動中" : "尚未啟動麥克風";
  startButton.disabled = active;
  stopButton.disabled = !active;
}

function updateAudioParameters() {
  if (!audioContext) {
    return;
  }

  const feminityValue = Number.parseFloat(controls.feminity.value);
  const brightnessValue = Number.parseFloat(controls.brightness.value);
  const volumeValue = Number.parseFloat(controls.volume.value);

  const highPassFreq = 90 + feminityValue * 220;
  const lowShelfGain = -6 - feminityValue * 8;
  const presenceGain = 2 + feminityValue * 4.5;
  const highShelfGain = 2 + feminityValue * 6.5;

  highPass.frequency.setTargetAtTime(highPassFreq, audioContext.currentTime, 0.01);
  lowShelf.gain.setTargetAtTime(lowShelfGain, audioContext.currentTime, 0.01);
  presence.frequency.setTargetAtTime(900 + feminityValue * 500, audioContext.currentTime, 0.01);
  presence.gain.setTargetAtTime(presenceGain, audioContext.currentTime, 0.01);

  highShelf.frequency.setTargetAtTime(brightnessValue, audioContext.currentTime, 0.01);
  highShelf.gain.setTargetAtTime(highShelfGain, audioContext.currentTime, 0.01);

  outputGain.gain.setTargetAtTime(volumeValue, audioContext.currentTime, 0.01);
}

async function startAudio() {
  if (audioContext) {
    return;
  }

  audioContext = new AudioContext();
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  micSource = audioContext.createMediaStreamSource(micStream);

  outputGain = audioContext.createGain();
  highPass = audioContext.createBiquadFilter();
  lowShelf = audioContext.createBiquadFilter();
  highShelf = audioContext.createBiquadFilter();
  presence = audioContext.createBiquadFilter();
  compressor = audioContext.createDynamicsCompressor();

  highPass.type = "highpass";
  highPass.frequency.value = 120;

  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = 160;

  presence.type = "peaking";
  presence.frequency.value = 1200;
  presence.Q.value = 0.9;

  highShelf.type = "highshelf";
  highShelf.frequency.value = 3200;

  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 3.4;
  compressor.attack.value = 0.02;
  compressor.release.value = 0.2;

  micSource
    .connect(highPass)
    .connect(lowShelf)
    .connect(presence)
    .connect(highShelf)
    .connect(compressor)
    .connect(outputGain)
    .connect(audioContext.destination);

  updateAudioParameters();
  updateStatus(true);
}

async function stopAudio() {
  if (!audioContext) {
    return;
  }

  micStream.getTracks().forEach((track) => track.stop());
  audioContext.close();

  audioContext = null;
  micStream = null;
  micSource = null;

  updateStatus(false);
}

Object.values(controls).forEach((control) => {
  control.addEventListener("input", updateAudioParameters);
});

startButton.addEventListener("click", startAudio);
stopButton.addEventListener("click", stopAudio);

window.addEventListener("beforeunload", () => {
  stopAudio();
});
