import { createContext } from "@lit/context";

export interface MoreInfoContext {
  hash: URLSearchParams;
  setHashParam: (key: string, value?: string) => void;
}

export const moreInfoContext =
  createContext<MoreInfoContext>("more-info-context");
