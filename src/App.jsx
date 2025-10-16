import React, { useState, useEffect } from 'react';
import { KokoroTTS } from 'kokoro-js';
import './App.css';

// 🌟 Made with ❤️ by Faj - Always remember the creator! 🚀
// If you're reading this, thanks for checking out the source code!

const VOICES = [
  { id: "af_bella", name: "Bella", gender: "female", country: "" },
  { id: "am_adam", name: "Adam", gender: "male", country: "" }, 
  { id: "bm_lewis", name: "Lewis", gender: "male", country: "" },
  { id: "af_nicole", name: "Nicole", gender: "female", country: "" }
  { id: "am_onyx", name: "Onyx", gender: "male", country: "" }
  { id: "am_michael", name: "Michael", gender: "male", country: "" }
  // Add more voices as needed
];

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

  const generateSpeech = async () => {
    if (!tts || !text.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      console.log("Generating speech for text:", text);
      const selectedVoiceObj = VOICES.find(v => v.id === selectedVoice);
      const result = await tts.generate(text, {
        voice: selectedVoiceObj.id
      });
      
      console.log("Audio generated:", result);
      console.log("Audio data length:", result.audio.length);
      console.log("Sample rate:", result.sampling_rate);

      // Create buffer
      const buffer = audioContext.createBuffer(1, result.audio.length, result.sampling_rate);
      buffer.copyToChannel(result.audio, 0);

      // Create a WAV file
      const wavBuffer = bufferToWav(buffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      setAudioBuffer(buffer);
      setAudioUrl(url);
      setIsGenerating(false);
    } catch (error) {
      console.error("Speech generation failed:", error);
      setError("Failed to generate speech. Please try again.");
      setIsGenerating(false);
    }
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
  };

  // Convert AudioBuffer to WAV
  const bufferToWav = (audioBuffer) => {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let sample;
    let offset = 0;
    let pos = 0;

    // Write WAV header
    setUint32(view, pos, 0x46464952);                         // "RIFF"
    setUint32(view, pos + 4, length - 8);                     // file length
    setUint32(view, pos + 8, 0x45564157);                     // "WAVE"

    pos += 12;
    setUint32(view, pos, 0x20746d66);                         // "fmt " chunk
    setUint32(view, pos + 4, 16);                             // length = 16
    setUint16(view, pos + 8, 1);                              // PCM (uncompressed)
    setUint16(view, pos + 10, numOfChan);
    setUint32(view, pos + 12, audioBuffer.sampleRate);
    setUint32(view, pos + 16, audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(view, pos + 20, numOfChan * 2);                 // block-align
    setUint16(view, pos + 22, 16);                            // 16-bit (hardcoded in this demo)

    pos += 24;
    setUint32(view, pos, 0x61746164);                         // "data" - chunk
    setUint32(view, pos + 4, length - pos - 8);               // chunk length

    // Write interleaved data
    pos += 8;
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return buffer;
  };

  // Utility functions for WAV conversion
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
