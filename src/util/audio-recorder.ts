export type MicrophoneError =
  "permission_denied" | "not_found" | "in_use" | "unknown";

const microphoneErrorFromName = (name?: string): MicrophoneError => {
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "permission_denied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "not_found";
    case "NotReadableError":
      return "in_use";
    default:
      return "unknown";
  }
};

export class AudioRecorder {
  private _active = false;

  private _callback: (data: Int16Array) => void;

  private _context: AudioContext | undefined;

  private _stream: MediaStream | undefined;

  private _source: MediaStreamAudioSourceNode | undefined;

  private _recorder: AudioWorkletNode | undefined;

  constructor(callback: (data: Int16Array) => void) {
    this._callback = callback;
  }

  public get active() {
    return this._active;
  }

  public get sampleRate() {
    return this._context?.sampleRate;
  }

  public static get isSupported() {
    return window.isSecureContext && "AudioContext" in window;
  }

  public async start(): Promise<MicrophoneError | undefined> {
    if (!this._context || !this._stream || !this._source || !this._recorder) {
      try {
        await this._createContext();
      } catch (err) {
        this.close();

        return microphoneErrorFromName(
          err instanceof DOMException ? err.name : undefined
        );
      }
    } else {
      this._stream.getTracks()[0].enabled = true;
      await this._context.resume();
      this._active = true;
    }

    return undefined;
  }

  public async stop() {
    this._active = false;
    if (this._stream) {
      this._stream.getTracks()[0].enabled = false;
    }
    await this._context?.suspend();
  }

  public close() {
    this._active = false;
    this._stream?.getTracks()[0].stop();
    if (this._recorder) {
      this._recorder.port.onmessage = null;
    }
    this._source?.disconnect();
    this._context?.close();
    this._stream = undefined;
    this._source = undefined;
    this._recorder = undefined;
    this._context = undefined;
  }

  private async _createContext() {
    const context = new AudioContext();
    this._context = context;
    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Syntax here must match an item of `parser.worker` in Webpack config in
    // order for module to be parsed and a chunk to be properly created.
    await context.audioWorklet.addModule(
      /* webpackChunkName: "recorder-worklet" */
      new URL("./recorder-worklet.js", import.meta.url)
    );
    this._source = this._context.createMediaStreamSource(this._stream);
    this._recorder = new AudioWorkletNode(this._context, "recorder-worklet");
    this._recorder.port.onmessage = (e) => {
      if (!this._active) {
        return;
      }
      this._callback(e.data);
    };
    this._active = true;
    this._source.connect(this._recorder);
  }
}
