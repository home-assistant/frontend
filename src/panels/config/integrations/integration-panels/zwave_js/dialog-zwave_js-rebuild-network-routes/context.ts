import { createContext } from "@lit/context";

export interface ZWaveJSRebuildNetworkRoutesProgress {
  pending: number[];
  skipped: number[];
  done: number[];
  failed: number[];
}

export const zwaveJsRebuildNetworkRoutesProgressContext =
  createContext<ZWaveJSRebuildNetworkRoutesProgress>(
    "zwaveJsRebuildNetworkRoutesProgress"
  );
