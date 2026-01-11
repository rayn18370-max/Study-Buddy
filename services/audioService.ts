
class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() {
    this.playTone(800, 'sine', 0.1, 0.05);
  }

  playFlip() {
    this.playTone(400, 'triangle', 0.15, 0.08);
  }

  playSuccess() {
    const now = this.ctx?.currentTime || 0;
    this.playTone(523.25, 'sine', 0.1, 0.05); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.05), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.3, 0.05), 200); // G5
  }

  playCorrect() {
    this.playTone(1046.50, 'sine', 0.2, 0.05); // C6
  }

  playWrong() {
    this.playTone(150, 'sawtooth', 0.2, 0.05);
  }

  playError() {
    this.playTone(100, 'square', 0.3, 0.05);
  }
}

export const audioService = new AudioService();
