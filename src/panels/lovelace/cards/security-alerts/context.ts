import { createContext } from "@lit/context";
import type { SecurityAlertItem } from "./helpers";

export const securityAlertsContext =
  createContext<SecurityAlertItem[]>("security-alerts");
