import { ActionConfig } from "../../../data/lovelace";

// Check if config or Entity changed
export function hasAction(config?: ActionConfig): boolean {
  return config !== undefined && config.action !== "none";
}
