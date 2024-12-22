import { ActionConfig } from "../../../data/lovelace/config/action";

export function hasAction(config?: ActionConfig): boolean {
  return config !== undefined && config.action !== "none";
}
