import { ActionConfig } from "../../../data/lovelace";

export function hasAction(config?: ActionConfig): boolean {
  return config !== undefined && config.action !== "none";
}
