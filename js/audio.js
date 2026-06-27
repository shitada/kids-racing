/* =====================================================================
 * キッズレーシング - サウンドエンジン (Web Audio API)
 * racing_game.py の create_beep_sound / create_bgm を忠実に移植。
 * 同じ波形生成アルゴリズムでバッファを生成するため、音は元のままです。
 * ===================================================================== */
"use strict";

class GameAudio {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.bgmSource = null;
    this.bgmGain = null;
    this.ready = false;
    this.bgmPlaying = false;
  }

  /** ユーザー操作後に呼び出して AudioContext を生成・バッファを準備 */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this._generateAll();
    this.ready = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // --- create_beep_sound(frequency=440, duration_ms=100, volume=0.3) の移植 ---
  _createBeep(frequency, durationMs, volume) {
    const sr = this.ctx.sampleRate;
    const n = Math.floor((sr * durationMs) / 1000);
    const buffer = this.ctx.createBuffer(1, n, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let val = volume * Math.sin(2 * Math.PI * frequency * t);
      // フェードアウト
      const fade = Math.max(0, 1.0 - (i / n) * 0.5);
      val = val * fade;
      data[i] = Math.max(-1, Math.min(1, val));
    }
    return buffer;
  }

  // --- create_bgm(tempo=140, bars=8, volume=0.08) の移植 ---
  _createBgm(tempo = 140, bars = 8, volume = 0.08) {
    const sr = this.ctx.sampleRate;
    const beatDuration = 60.0 / tempo;
    const totalDuration = beatDuration * 4 * bars; // 4拍 x bars小節
    const n = Math.floor(sr * totalDuration);
    const buffer = this.ctx.createBuffer(1, n, sr);
    const data = buffer.getChannelData(0);

    // メロディ (周波数リスト: C D E F G A B)
    const notes = {
      C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2,
      G4: 392.0, A4: 440.0, B4: 493.9,
      C5: 523.3, D5: 587.3, E5: 659.3,
    };
    // メロディパターン
    const melody = [
      "C4", "E4", "G4", "C5", "G4", "E4", "G4", "A4",
      "F4", "A4", "C5", "A4", "G4", "E4", "D4", "E4",
      "C4", "G4", "E4", "C5", "D5", "C5", "A4", "G4",
      "F4", "E4", "D4", "C4", "D4", "E4", "G4", "C5",
    ];
    // ベースパターン
    const bass = ["C4", "C4", "F4", "F4", "G4", "G4", "C4", "C4"];

    const beatSamples = Math.floor(sr * beatDuration);

    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const beatIdx = Math.floor(t / beatDuration);
      const beatPos = (i % beatSamples) / beatSamples; // 0-1 within beat

      // メロディ
      const melIdx = beatIdx % melody.length;
      const melFreq = notes[melody[melIdx]] ?? 261.6;
      const env = Math.max(0, 1.0 - beatPos * 1.5) * 0.5;
      const melVal = Math.sin(2 * Math.PI * melFreq * t) * env;

      // ベース (半分の周波数)
      const bassIdx = Math.floor(beatIdx / 4) % bass.length;
      const bassFreq = (notes[bass[bassIdx]] ?? 130.8) * 0.5;
      const bassEnv = Math.max(0, 1.0 - beatPos * 0.8) * 0.6;
      const bassVal = Math.sin(2 * Math.PI * bassFreq * t) * bassEnv;

      // ドラム (キック on 1,3 / ハイハット on every beat)
      let kick = 0;
      const m = beatIdx % 4;
      if (m === 0 || m === 2) {
        const kickT = beatPos;
        if (kickT < 0.15) {
          kick =
            Math.sin(2 * Math.PI * 80 * (1 - kickT * 5) * t) *
            (1 - kickT / 0.15) *
            0.7;
        }
      }
      let hihat = 0;
      if (beatPos < 0.05) {
        hihat = (Math.random() * 0.6 - 0.3) * (1 - beatPos / 0.05);
      }

      const val = (melVal + bassVal + kick + hihat) * volume;
      data[i] = Math.max(-1, Math.min(1, val));
    }
    return buffer;
  }

  _generateAll() {
    // racing_game.py と同じパラメータ
    this.buffers.accel = this._createBeep(220, 50, 0.15);
    this.buffers.crash = this._createBeep(100, 200, 0.3);
    this.buffers.goal = this._createBeep(880, 300, 0.2);
    this.buffers.countdown = this._createBeep(660, 150, 0.2);
    this.buffers.start = this._createBeep(1320, 400, 0.25);
    this.buffers.bgm = this._createBgm(140, 8, 0.08);
  }

  /** 効果音を再生 (pygame の .play() に相当: 音量1.0) */
  play(name) {
    if (!this.ready) return;
    const buf = this.buffers[name];
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.start();
  }

  /** BGM ループ再生 (set_volume(0.08) に相当) */
  startBgm() {
    if (!this.ready) return;
    this.stopBgm();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.bgm;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
    this.bgmSource = src;
    this.bgmGain = gain;
    this.bgmPlaying = true;
  }

  stopBgm() {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch (e) {
        /* already stopped */
      }
      try {
        this.bgmSource.disconnect();
      } catch (e) {}
      this.bgmSource = null;
    }
    this.bgmPlaying = false;
  }
}

window.gameAudio = new GameAudio();
