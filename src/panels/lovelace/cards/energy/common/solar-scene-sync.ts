// Shared state for the Solar scene card and its timeline companion. Keyed by the energy collection
// so the two sibling cards on a dashboard move together with no DOM coupling: the timeline writes
// the scrubbed instant, the scene reads it to place the sun; the chips write the chart target, the
// timeline reads it to pick which metric it plots.
//   - instant: absolute epoch (ms) anywhere inside the selected dashboard period, or null for live.
//   - target: which energy metric the timeline plots (mirrors the metric a clicked chip represents).

export type ChartTarget =
  | "production"
  | "grid"
  | "battery"
  | "battery-soc"
  | "lowcarbon"
  | "home";

export interface SolarSceneSyncState {
  instant: number | null;
  target: ChartTarget;
}

type Listener = (state: SolarSceneSyncState) => void;

export class SolarSceneSync {
  private _state: SolarSceneSyncState = { instant: null, target: "production" };

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
