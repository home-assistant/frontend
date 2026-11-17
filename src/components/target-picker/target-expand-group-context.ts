import { createContext } from "@lit/context";

/**
 * Whether the targets below expand the groups they name when they are used.
 * Actions do, so that is what holds when nothing provides it. Triggers and
 * conditions don't, so their editors provide `false`.
 */
export const targetExpandGroupContext =
  createContext<boolean>("targetExpandGroup");
