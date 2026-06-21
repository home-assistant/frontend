// Shared state for the Solar scene cards (the 3D scene, its timeline, and the Energy clock card).
// Keyed by the energy collection so every card on a dashboard moves together with no DOM coupling: the
// timeline writes the scrubbed instant, the others read it; the chips write the chart target; and the
// camera (bearing/tilt) is shared so rotating any 3D card rotates them all in lockstep.
//   - instant: absolute epoch (ms) anywhere inside the selected dashboard period, or null for live.
//   - target: which energy metric the timeline plots (mirrors the metric a clicked chip represents).
//   - bearing / tilt: the shared camera orientation (degrees).

export type ChartTarget =
  | "production"
  | "grid"
  | "battery"
  | "battery-soc"
  | "home";

export interface SolarSceneSyncState {
  instant: number | null;
  target: ChartTarget;
  bearing: number;
  tilt: number;
}

type Listener = (state: SolarSceneSyncState) => void;

export class SolarSceneSync {
  private _state: SolarSceneSyncState = {
    instant: null,
    target: "production",
    bearing: 180,
    tilt: 50,
  };

  // Once any card has seeded the camera from its config, later seeds are ignored so cards stay aligned.
  private _cameraSeeded = false;

  private _listeners = new Set<Listener>();

  public get state(): SolarSceneSyncState {
    return this._state;
  }

  public setInstant(instant: number): void {
    this._update({ ...this._state, instant });
  }

  public setLive(): void {
    this._update({ ...this._state, instant: null });
  }

  public setTarget(target: ChartTarget): void {
    this._update({ ...this._state, target });
  }

  // Live camera change from a drag: shared with every linked card.
  public setCamera(bearing: number, tilt: number): void {
    this._update({ ...this._state, bearing, tilt });
  }

  // Initial camera, applied only the first time (the first card to connect wins), so a per-card
  // config tilt seeds the shared camera without later cards fighting over it.
  public seedCamera(bearing: number, tilt: number): void {
    if (this._cameraSeeded) return;
    this._cameraSeeded = true;
    this._update({ ...this._state, bearing, tilt });
  }

  public subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    listener(this._state);
    return () => this._listeners.delete(listener);
  }

  private _update(state: SolarSceneSyncState): void {
    this._state = state;
    this._listeners.forEach((listener) => listener(this._state));
  }
}

const stores = new Map<string, SolarSceneSync>();

export const getSolarSceneSync = (key: string): SolarSceneSync => {
  let store = stores.get(key);
  if (!store) {
    store = new SolarSceneSync();
    stores.set(key, store);
  }
  return store;
};
