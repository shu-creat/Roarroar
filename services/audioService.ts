/**
 * Handles Microphone input, Recording, and Sound Synthesis
 */
export class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private dataArray: Uint8Array | null = null;

  constructor() {
    // Initialize AudioContext lazily on user interaction
  }

  async startListening(onDecibelUpdate: (db: number) => void): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = 256;
      this.microphone.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.analyzeLoop(onDecibelUpdate);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }

  /**
   * Captures a short audio sample from the current stream
   */
  async recordSample(durationMs: number): Promise<Blob> {
    if (!this.stream) throw new Error("Stream not active");

    return new Promise((resolve, reject) => {
      // Use a separate MediaRecorder to not interfere with the analysis stream
      // We need to check if the browser supports the mimeType, standard is webm/opus or mp4
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''; 
      // If empty string, it uses default.
      
      const recorder = new MediaRecorder(this.stream!, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        resolve(blob);
      };

      recorder.onerror = (e) => reject(e);

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, durationMs);
    });
  }

  private analyzeLoop = (callback: (db: number) => void) => {
    if (!this.analyser || !this.dataArray) return;

    requestAnimationFrame(() => this.analyzeLoop(callback));

    this.analyser.getByteTimeDomainData(this.dataArray);

    let sum = 0;
    // Calculate RMS (Root Mean Square)
    for (let i = 0; i < this.dataArray.length; i++) {
      const x = (this.dataArray[i] - 128) / 128.0;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);

    // Map RMS to Decibels
    // Standard formula: 20 * log10(rms). 
    // We add an offset to map silence/noise floor (~0.01) to ~30dB and loud screams to ~100-120dB
    let db = 20 * Math.log10(rms);
    
    // Calibration offset (approximate for mobile devices)
    // A raw calculation often results in negative values relative to digital full scale.
    // We boost it to positive integers for UI display.
    const calibration = 100; 
    let displayDb = Math.max(30, Math.round(db + calibration));
    
    // Cap at 120 for UI sanity
    if (displayDb > 120) displayDb = 120;

    callback(displayDb);
  };

  /**
   * Synthesize a glass cracking sound using white noise and envelopes
   */
  playCrackSound() {
    if (!this.audioContext) return;
    
    // Create a buffer for white noise
    const bufferSize = this.audioContext.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound "sharp"
    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = 'highpass';
    bandpass.frequency.value = 1000;

    // Amplitude envelope for the "crack" (fast attack, fast decay)
    const gain = this.audioContext.createGain();
    
    // Timing
    const now = this.audioContext.currentTime;
    
    // Main impact
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.5);
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const audioService = new AudioService();