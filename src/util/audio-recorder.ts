export class AudioRecorder {
  public active = false;

  private _callback: (data: Int16Array) => void;

  private _context: AudioContext | undefined;

  private _stream: MediaStream | undefined;

  constructor(callback: (data: Int16Array) => void) {
    this._callback = callback;
  }

  public get sampleRate() {
    return this._context?.sampleRate;
  }

  public get isSupported() {
    return (
      window.isSecureContext &&
      // @ts-ignore-next-line
      (window.AudioContext || window.webkitAudioContext)
    );
  }

  public async start() {
    this.active = true;

    if (!this._context || !this._stream) {
      await this._createContext();
    } else {
      this._context.resume();
      this._stream.getTracks()[0].enabled = true;
    }

    if (!this._context || !this._stream) {
      this.active = false;
      return;
    }

    const source = this._context.createMediaStreamSource(this._stream);
    const recorder = new AudioWorkletNode(this._context, "recorder.worklet");

    source.connect(recorder).connect(this._context.destination);
    recorder.port.onmessage = (e) => {
      if (!this.active) {
        return;
      }
      this._callback(e.data);
    };
  }

  public async stop() {
    this.active = false;
    if (this._stream) {
      this._stream.getTracks()[0].enabled = false;
    }
    await this._context?.suspend();
  }

  public close() {
    this.active = false;
    this._stream?.getTracks()[0].stop();
    this._context?.close();
    this._stream = undefined;
    this._context = undefined;
  }

  private async _createContext() {
    try {
      // @ts-ignore-next-line
      this._context = new (window.AudioContext || window.webkitAudioContext)();
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return;
    }

    await this._context.audioWorklet.addModule(
      new URL("./recorder.worklet.js", import.meta.url)
    );
  }
}
