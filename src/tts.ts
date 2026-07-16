// Speech playback with a sequential queue: agent replies are spoken one
// after another, in order, even while the debate keeps generating.
// Primary path is the server's Edge TTS endpoint; if that's unreachable
// (offline, or the host blocks Microsoft's TTS service) it falls back to
// the browser's built-in speech synthesis.

export interface SpeechItem {
  id: string;
  text: string;
  voice: string;
}

type Listener = (speakingId: string | null) => void;

class SpeechQueue {
  private queue: SpeechItem[] = [];
  private processing = false;
  private currentAudio: HTMLAudioElement | null = null;
  private stopped = false;
  private listener: Listener = () => {};

  onSpeakingChange(fn: Listener) {
    this.listener = fn;
  }

  enqueue(item: SpeechItem) {
    this.queue.push(item);
    void this.process();
  }

  /** Speak one item immediately, dropping anything queued or playing. */
  speakNow(item: SpeechItem) {
    this.stop();
    this.enqueue(item);
  }

  stop() {
    this.queue = [];
    this.stopped = true;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    this.listener(null);
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;
    this.stopped = false;
    while (this.queue.length > 0 && !this.stopped) {
      const item = this.queue.shift()!;
      this.listener(item.id);
      try {
        await this.playViaServer(item);
      } catch {
        if (!this.stopped) await this.playViaBrowser(item);
      }
      this.listener(null);
    }
    this.processing = false;
  }

  private async playViaServer(item: SpeechItem): Promise<void> {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: item.text, voice: item.voice }),
    });
    if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
    const blob = await res.blob();
    if (blob.size === 0) throw new Error("Empty audio");
    if (this.stopped) return;
    const url = URL.createObjectURL(blob);
    try {
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url);
        this.currentAudio = audio;
        audio.onended = () => resolve();
        audio.onpause = () => resolve(); // stop() pauses
        audio.onerror = () => reject(new Error("Audio playback failed"));
        audio.play().catch(reject);
      });
    } finally {
      this.currentAudio = null;
      URL.revokeObjectURL(url);
    }
  }

  private playViaBrowser(item: SpeechItem): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      const utterance = new SpeechSynthesisUtterance(item.text);
      // Edge voice names start with a BCP-47 locale ("en-US-AriaNeural").
      const lang = item.voice.split("-").slice(0, 2).join("-");
      utterance.lang = lang || "en-US";
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}

export const speechQueue = new SpeechQueue();

// A small curated set of Edge neural voices. Any valid Edge voice name works
// on the server; these are just sensible choices for English debates.
export const VOICE_OPTIONS: { value: string; label: string }[] = [
  { value: "en-US-ChristopherNeural", label: "Christopher (US, deep)" },
  { value: "en-US-GuyNeural", label: "Guy (US)" },
  { value: "en-US-EricNeural", label: "Eric (US)" },
  { value: "en-US-AndrewNeural", label: "Andrew (US, warm)" },
  { value: "en-US-AriaNeural", label: "Aria (US)" },
  { value: "en-US-JennyNeural", label: "Jenny (US)" },
  { value: "en-US-MichelleNeural", label: "Michelle (US)" },
  { value: "en-US-AvaNeural", label: "Ava (US, expressive)" },
  { value: "en-GB-RyanNeural", label: "Ryan (UK)" },
  { value: "en-GB-SoniaNeural", label: "Sonia (UK)" },
  { value: "en-AU-WilliamNeural", label: "William (AU)" },
  { value: "en-AU-NatashaNeural", label: "Natasha (AU)" },
];
