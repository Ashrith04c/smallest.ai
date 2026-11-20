
require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_URL = "https://api.smallest.ai/waves/v1/tts";
const API_KEY = process.env.SMALLEST_API_KEY;

if (!API_KEY) {
  console.error("Missing SMALLEST_API_KEY in .env");
  process.exit(1);
}
const boundary250 = "The quick brown fox jumps over the lazy dog. "
  .repeat(6)
  .slice(0, 250);

const boundary251 = boundary250 + "X";

console.log("TC07 length:", boundary250.length);
console.log("TC08 length:", boundary251.length);

const RESULTS_DIR = path.join(__dirname, "results");
fs.mkdirSync(RESULTS_DIR, { recursive: true });

const testCases = [
  {
    id: "TC01",
    name: "Valid Pro TTS request",
    payload: {
      text: "Hello, welcome to our service. How can I help you today?",
      voice_id: "meher",
      language: "hi",
      model: "lightning_v3.1_pro"
    },
    expectAudio: true
  },
  {
    id: "TC02",
    name: "Standard model with Pro voice",
    payload: {
      text: "Hello, welcome to our service.",
      voice_id: "meher",
      language: "hi",
      model: "lightning_v3.1"
    }
  },
  {
    id: "TC03",
    name: "Invalid voice ID",
    payload: {
      text: "Testing invalid voice.",
      voice_id: "invalid_voice_123",
      language: "hi",
      model: "lightning_v3.1_pro"
    }
  },
  {
    id: "TC04",
    name: "Invalid model ID",
    payload: {
      text: "Testing invalid model.",
      voice_id: "meher",
      language: "hi",
      model: "invalid_model_123"
    }
  },
  {
    id: "TC05",
    name: "Empty text",
    payload: {
      text: "",
      voice_id: "meher",
      language: "hi",
      model: "lightning_v3.1_pro"
    }
  },
  {
    id: "TC06",
    name: "140 character input",
    payload: {
      text: "This is a controlled test of the text to speech API. We are checking how the service handles a normal length input request.",
      voice_id: "meher",
      language: "hi",
      model: "lightning_v3.1_pro"
    }
  },
  {
    id: "TC07",
    name: "250 character fairy",
    payload: {
     text: boundary250,
      voice_id: "meher",
      language: "hi",
      model: "lightning_v3.1_pro"
    }
  },
  {
    id: "TC08",
    name: "251 character boundary",
    payload: {
     text: boundary251,
      voice_id: "meher",
      language: "hi",
      model: "lightning_v3.1_pro"
    }
  }
];


async function runTest(test) {
  console.log(`\nRunning ${test.id}: ${test.name}`);

  const startTime = Date.now();

  const result = {
    id: test.id,
    name: test.name,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await axios.post(
      API_URL,
      test.payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          Accept: "audio/wav"
        },
        responseType: "arraybuffer",
        timeout: 30000,
        validateStatus: () => true
      }
    );

    const buffer = Buffer.from(response.data);
    const duration = Date.now() - startTime;
    const contentType =
      response.headers["content-type"] || "unknown";
const isAudioContentType =
  contentType.toLowerCase().includes("audio") ||
  contentType.toLowerCase().includes("octet-stream");

    const isWav =
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WAVE";

    const isMp3 =
      buffer.length >= 3 &&
      (
        buffer.toString("ascii", 0, 3) === "ID3" ||
        (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
      );

    const isOgg =
      buffer.length >= 4 &&
      buffer.toString("ascii", 0, 4) === "OggS";

const isAudio =
  response.status >= 200 &&
  response.status < 300 &&
  isAudioContentType &&
  buffer.length > 0;

    result.status = response.status;
    result.responseTimeMs = duration;
    result.contentType = contentType;
    result.responseSizeBytes = buffer.length;
    result.requestId =
      response.headers["x-request-id"] || null;
    result.audioGenerated = isAudio;

    if (isAudio) {
      const filename = `${test.id.toLowerCase()}.audio`;

      fs.writeFileSync(
        path.join(RESULTS_DIR, filename),
        buffer
      );

      result.audioFile = filename;
      result.audioSignature = isWav
        ? "WAV"
        : isMp3
          ? "MP3"
          : isOgg
            ? "OGG"
            : "Audio content type";
    } else {
      const body = buffer.toString("utf8");

      result.responsePreview = body.slice(0, 2000);

      console.log("Response body:", result.responsePreview);
    }

    console.log("Status:", result.status);
    console.log("Response time:", duration, "ms");
    console.log("Content-Type:", contentType);
    console.log("Response size:", buffer.length, "bytes");
    console.log("Audio detected:", isAudio);
    console.log("Request ID:", result.requestId || "Not provided");
    console.log("Input characters:", test.payload.text.length);
console.log("Input text:", test.payload.text);

  } catch (error) {
    result.responseTimeMs = Date.now() - startTime;
    result.audioGenerated = false;
    result.error = error.message;

    console.log("Request failed:", error.message);
  }

  return result;
}

async function main() {
  console.log("================================");
  console.log("SMALLEST AI - TTS API QA TEST");
  console.log("================================");

  const results = [];

  for (const test of testCases) {
    const result = await runTest(test);
    results.push(result);

    // Avoid sending requests too quickly.
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const report = {
    project: "Smallest AI TTS API QA",
    executedAt: new Date().toISOString(),
    totalTests: results.length,
    passedHttp: results.filter(
      r => r.status >= 200 && r.status < 300
    ).length,
    failedHttp: results.filter(
      r => !r.status || r.status < 200 || r.status >= 300
    ).length,
    results
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, "test-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log("\n================================");
  console.log("TEST EXECUTION COMPLETED");
  console.log("Total tests:", report.totalTests);
  console.log("HTTP success:", report.passedHttp);
  console.log("HTTP failure:", report.failedHttp);
  console.log("Report saved in results/test-report.json");
  console.log("================================");
}

main();
