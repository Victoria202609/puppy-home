// Original local effects, one shared mixer. No microphone, network service or tracking.
class PuppySound {
  constructor() {
    this.context = null;
    this.volume = .85;
    this.buffers = new Map();
    this.voices = new Set();
    this.generation = 0;
  }

  async ready() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio is unavailable');
      this.context = new Audio();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 5;
      limiter.ratio.value = 8;
      limiter.attack.value = .003;
      limiter.release.value = .12;
      this.master.connect(limiter).connect(this.context.destination);
    }
    await this.context.resume();
  }

  async buffer(name) {
    if (!this.buffers.has(name)) {
      const loading = fetch(`sounds/${name}.wav`).then(response => {
        if (!response.ok) throw new Error(`Sound unavailable: ${name}`);
        return response.arrayBuffer();
      }).then(bytes => this.context.decodeAudioData(bytes)).catch(error => {
        this.buffers.delete(name);
        throw error;
      });
      this.buffers.set(name, loading);
    }
    return this.buffers.get(name);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .025);
  }

  stop() {
    this.generation++;
    const room = document.querySelector('#room');
    room.dataset.soundEffect = '';
    room.dataset.soundStatus = 'idle';
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const voice of this.voices) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, .008);
      try { voice.source.stop(now + .04); } catch { /* Already ended. */ }
    }
  }

  async play(name, loop = false) {
    this.stop();
    const ticket = this.generation;
    const room = document.querySelector('#room');
    room.dataset.soundStatus = 'loading';
    try {
      // resume runs in the initiating click before any asset fetch is awaited.
      await this.ready();
      const buffer = await this.buffer(name);
      if (ticket !== this.generation || document.hidden || !this.volume) return false;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = loop;
      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(1, this.context.currentTime + .012);
      source.connect(gain).connect(this.master);
      const voice = { source, gain };
      this.voices.add(voice);
      source.onended = () => {
        this.voices.delete(voice); source.disconnect(); gain.disconnect();
        if (ticket === this.generation) {
          room.dataset.soundEffect = '';
          room.dataset.soundStatus = 'idle';
        }
      };
      source.start();
      room.dataset.soundEffect = name;
      room.dataset.soundStatus = this.context.state;
      document.querySelector('#room').dispatchEvent(new CustomEvent('puppy-sound-start', { detail: { action: name } }));
      return true;
    } catch (error) {
      if (ticket === this.generation) {
        room.dataset.soundStatus = 'unavailable';
        document.querySelector('#activity-note').textContent = '声音暂时没加载好，可以再点一下声音按钮。';
      }
      return false;
    }
  }
}
