import React, { useState, useEffect } from 'react';
import { KokoroTTS } from 'kokoro-js';
import { split } from 'sentence-splitter'; // Correctly imported
import './App.css';

// 🌟 Made with ❤️ by Faj - Always remember the creator! 🚀
// If you're reading this, thanks for checking out the source code!

const VOICES = [
  { id: "af_bella", name: "Bella", gender: "female", country: "" },
  { id: "am_adam", name: "Adam", gender: "male", country: "" },
  { id: "bm_lewis", name: "Lewis", gender: "male", country: "" },
  { id: "af_nicole", name: "Nicole", gender: "female", country: "" },
  { id: "am_onyx", name: "Onyx", gender: "male", country: "" },
  { id: "am_michael", name: "Michael", gender: "male", country: "" }
  // Add more voices as needed
];

// ✅ CORRECT STRUCTURE: Only one "function App()" at the top level
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [tts, setTts] = useState(null);
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [audioContext] = useState(() => new (window.AudioContext || window.webkitAudioContext)());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    async function loadModel() {
      try {
        console.log("Loading model...");
        const model = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-ONNX", {
          dtype: "q8"
        });
        console.log("Model loaded successfully");
        setTts(model);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load model:", error);
        setError("Failed to load TTS model. Please try again later.");
        setIsLoading(false);
      }
    }
    loadModel();
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => setIsInstalled(true);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // ✅ CORRECT PLACEMENT: The new generateSpeech function
  const generateSpeech = async () => {
    if (!tts || !text.trim()) return;

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null); // Clear previous audio

    try {
      const sentences = split(text)
        .filter(node => node.type === 'Sentence')
        .map(node => node.raw);

      if (sentences.length === 0) {
        throw new Error("No valid sentences found to process.");
      }

      console.log(`Found ${sentences.length} sentences. Starting generation...`);
      const audioChunks = [];
      let sampleRate = 0;

      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (trimmedSentence) {
          console.log(`Generating audio for: "${trimmedSentence}"`);
          const result = await tts.generate(trimmedSentence, {
            voice: selectedVoice
          });
          audioChunks.push(result.audio);
          if (sampleRate === 0) {
            sampleRate = result.sampling_rate;
          }
        }
      }

      const fullAudio = concatenateFloat32Arrays(audioChunks);
      console.log("Audio generation complete. Total length:", fullAudio.length);

      const buffer = audioContext.createBuffer(1, fullAudio.length, sampleRate);
      buffer.copyToChannel(fullAudio, 0);

      const wavBuffer = bufferToWav(buffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      setAudioBuffer(buffer);
      setAudioUrl(url);

    } catch (error) {
      console.error("Speech generation failed:", error);
      setError(`Failed to generate speech: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
  };

  // ✅ CORRECT PLACEMENT: All helper functions are inside the App component
  const concatenateFloat32Arrays = (arrays) => {
    let totalLength = 0;
    for (const arr of arrays) {
      totalLength += arr.length;
    }
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  };

  const bufferToWav = (audioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    setUint32(view, pos + 0, 0x46464952);  // "RIFF"
    setUint32(view, pos + 4, length - 8);  // file length
    setUint32(view, pos + 8, 0x45564157);  // "WAVE"
    setUint32(view, pos + 12, 0x20746d66); // "fmt " chunk
    setUint32(view, pos + 16, 16);         // length = 16
    setUint16(view, pos + 20, 1);          // PCM (uncompressed)
    setUint16(view, pos + 22, numOfChan);
    setUint32(view, pos + 24, audioBuffer.sampleRate);
    setUint32(view, pos + 28, audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(view, pos + 32, numOfChan * 2); // block-align
    setUint16(view, pos + 34, 16);         // 16-bit
    setUint32(view, pos + 36, 0x61746164); // "data" - chunk
    setUint32(view, pos + 40, length - pos - 44); // chunk length

    pos += 44;
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    return buffer;
  };

  const setUint16 = (view, pos, val) => view.setUint16(pos, val, true);
  const setUint32 = (view, pos, val) => view.setUint32(pos, val, true);

  const getVoiceName = (voice) => {
    const genderEmoji = voice.gender === 'female' ? '👩' : '🙎‍♂️';
    const countryFlag = voice.country ? ` 🇺🇸` : '';
    return `${voice.name.split(' ')[0]} ${genderEmoji}${countryFlag}`;
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Kokoro TTS Model...</p>
      </div>
    );
  }
  
  // ✅ The return statement with all your HTML (JSX)
  return (
    <div className="app-container">
      <div className="header">
        <h1>Kokoro Lab</h1>
        <a href="https://github.com/fajrmn" target="_blank" rel="noopener noreferrer" className="author-link">🚀 with Love from 🇭🇰</a>
      </div>
      {error && <div className="error-message">{error}</div>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to convert to speech"
        rows={4}
      />
      <div className="controls">
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
        >
          {VOICES.map(voice => (
            <option key={voice.id} value={voice.id}>{getVoiceName(voice)}</option>
          ))}
        </select>
        <button
          onClick={generateSpeech}
          disabled={!text.trim() || isGenerating}
        >
          {isGenerating ? <div className="loading-button">Generating...</div> : 'Generate Speech'}
        </button>
      </div>
      {audioUrl && (
        <div className="audio-player">
          <audio
            controls
            src={audioUrl}
            onError={(e) => console.error("Audio playback error:", e)}
          />
          <a href={audioUrl} download="generated_speech.wav">
            Download Audio
          </a>
        </div>
      )}
      <div className="debug-info">
        <small>Model Status: {tts ? 'Loaded' : 'Not Loaded'}</small>
      </div>
      {!isInstalled && installPrompt && (
        <button className="install-button" onClick={handleInstall}>
          Install App
        </button>
      )}
    </div>
  );
}

export default App;
