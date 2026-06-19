// Shared time cursor for the Solar scene card and its timeline companion. Keyed by the
// energy collection so the two sibling cards on a dashboard move together with no DOM
// coupling: the timeline writes the selected minute, the scene reads it to place the sun.

const minutesNow = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export interface SolarSceneSyncState {
  minute: number; // selected minute of day, 0-1439 (used only when not live)
  live: boolean; // when true both cards follow the current time
}

type Listener = (state: SolarSceneSyncState) => void;

export class SolarSceneSync {
  private _state: SolarSceneSyncState = { minute: minutesNow(), live: true };

  private _listeners = new Set<Listener>();

  public get state(): SolarSceneSyncState {
    return this._state;
  }

  public setMinute(minute: number): void {
    this._update({
      minute: Math.max(0, Math.min(1439, Math.round(minute))),
      live: false,
    });
  }

  public setLive(live: boolean): void {
    this._update({ live, minute: live ? minutesNow() : this._state.minute });
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
