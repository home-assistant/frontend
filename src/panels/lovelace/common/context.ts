import { createContext } from "@lit/context";

export const columnCountContext = createContext<number>(
  "lovelace-column-count"
);
