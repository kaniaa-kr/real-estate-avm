/**
 * Sintesis Efek Suara Web Audio (Sims-Style Feedback).
 *
 * Efek suara dihasilkan secara prosedural tanpa dependensi aset audio eksternal.
 * Default: MATI (Mute). Status persistensi disimpan di localStorage dengan try/catch.
 */

export type SoundType = "click" | "build" | "success";

const STORAGE_KEY = "sims_sound_enabled";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {
      // Browser belum mengizinkan audio tanpa interaksi pengguna
    });
  }
  return audioCtx;
}

/**
 * Cek apakah efek suara sedang aktif.
 * Default bernilai false (mute).
 */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Mengubah status aktif/nonaktif suara dan menyimpannya di localStorage.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Abaikan jika localStorage tidak tersedia (misal private mode)
  }
}

/**
 * Beralih antara suara aktif dan bisu. Mengembalikan status terbaru.
 */
export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  if (next) {
    // Putar suara build singkat sebagai konfirmasi aktif
    playBuildSound();
  }
  return next;
}

/**
 * Memainkan suara jenis "click": blip pendek dan renyah untuk navigasi tombol.
 */
export function playClickSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(680, now);
  osc.frequency.exponentialRampToValueAtTime(340, now + 0.035);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

/**
 * Memainkan suara jenis "build": nada pop/plink ala mode konstruksi saat mengubah slider/nilai.
 */
export function playBuildSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(540, now + 0.07);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * Memainkan suara jenis "success": nada akord naik (C5 - E5 - G5) saat estimasi berhasil dihitung.
 */
export function playSuccessSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Arpeggio ceria C5 -> E5 -> G5
  const notes = [523.25, 659.25, 783.99];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.06;
    const duration = 0.16;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.09, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration + 0.02);
  });
}

/**
 * Fungsi umum untuk memainkan suara berdasarkan nama tipe.
 */
export function playSound(type: SoundType): void {
  switch (type) {
    case "click":
      playClickSound();
      break;
    case "build":
      playBuildSound();
      break;
    case "success":
      playSuccessSound();
      break;
  }
}
