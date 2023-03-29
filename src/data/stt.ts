export interface SpeechMetadata {
  language: string;
  format: "wav" | "ogg";
  codec: "pcm" | "opus";
  bit_rate: 8 | 16 | 24 | 32;
  sample_rate:
    | 8000
    | 11000
    | 16000
    | 18900
    | 22000
    | 32000
    | 37800
    | 44100
    | 48000;
  channel: 1 | 2;
}
