
const fs = require("fs");

const input = fs.readFileSync("results/tc01.audio");

const sampleRate = 44100;
const channels = 1;
const bitsPerSample = 16;

const header = Buffer.alloc(44);

header.write("RIFF", 0);
header.writeUInt32LE(36 + input.length, 4);
header.write("WAVE", 8);

header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(
  sampleRate * channels * bitsPerSample / 8, 28
);
header.writeUInt16LE(channels * bitsPerSample / 8, 32);
header.writeUInt16LE(bitsPerSample, 34);

header.write("data", 36);
header.writeUInt32LE(input.length, 40);

const wav = Buffer.concat([header, input]);

fs.writeFileSync("results/tc08.wav", wav);

console.log("WAV created: results/tc08.wav");