import React, { useState, useEffect } from 'react';
import { KokoroTTS } from 'kokoro-js';
import { split } from 'sentence-splitter';
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
];

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [tts, setTts] = useState(null);
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [audioContext] = useState(() => new (window.AudioContext || window.webkitAudioContext)());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // --- Effect to load the TTS model on startup ---
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

  // --- Effect for PWA installation prompt ---
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

  // --- ✅ FINAL SPEECH GENERATION & STREAMING PLAYBACK FUNCTION ---
  const generateSpeech = async () => {
    if (!tts || !text.trim()) return;

    // Resume AudioContext if it was suspended by browser policy
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 1. Split text into clean, non-empty sentences
      const sentences = split(text)
        .filter(node => node.type === 'Sentence')
        .map(node => node.raw.trim())
        .filter(sentence => sentence.length > 0);

      if (sentences.length === 0) {
        throw new Error("No valid sentences found to process.");
      }

      console.log(`Found ${sentences.length} sentences. Starting parallel generation...`);

      // 2. Generate audio for all sentences in parallel for efficiency
      const generationPromises = sentences.map(sentence => tts.generate(sentence, { voice: selectedVoice }));
      const audioResults = await Promise.all(generationPromises);

      console.log("All sentences processed. Starting playback queue.");
      
      const sampleRate = audioResults.length > 0 ? audioResults[0].sampling_rate : 44100;
      const audioChunks = audioResults.map(result => result.audio);

      // 3. Play the audio chunks back-to-back seamlessly
      playQueue(audioChunks, sampleRate);

    } catch (error) {
      console.error("Speech generation failed:", error);
      setError(`Failed to generate speech: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Helper function to play a queue of audio buffers ---
  const playQueue = (audioChunks, sampleRate) => {
    let nextPlayTime = audioContext.currentTime;

    for (const chunk of audioChunks) {
      const buffer = audioContext.createBuffer(1, chunk.length, sampleRate);
      buffer.copyToChannel(chunk, 0);

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(nextPlayTime);

      // Schedule the next chunk to play right after the current one ends
      nextPlayTime += buffer.duration;
    }
  };
  
  // --- Other helper functions ---
  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
  };

  const getVoiceName = (voice) => {
    const genderEmoji = voice.gender === 'female' ? '👩' : '🙎‍♂️';
    const countryFlag = voice.country ? ` 🇺🇸` : '';
    return `${voice.name.split(' ')[0]} ${genderEmoji}${countryFlag}`;
  };

  // --- Render logic ---
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

      {/* ✅ UI update: Removed the old audio player and added a simple status message */}
      <div className="status-message">
        {isGenerating ? "Generating speech..." : (text.trim() && "Audio will play automatically.")}
      </div>

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
