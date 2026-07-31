// FOR TESTING ONLY — Tile Card editor concept comparison. Not for merge.
export type { HomeAssistant } from "../../../../types";

export type ConceptId = "control" | "a" | "b" | "c";

export const CONCEPTS: { id: ConceptId; label: string }[] = [
  { id: "control", label: "Control" },
  { id: "a", label: "Concept A" },
  { id: "b", label: "Concept B" },
  { id: "c", label: "Concept C" },
];

export interface TileCardLabConfig {
  type: string;
  entity?: string;
  name?: string;
  icon?: string;
  color?: string;
  show_entity_picture?: boolean;
  hide_state?: boolean;
  state_content?: string | string[];
  vertical?: boolean;
  tap_action?: unknown;
  hold_action?: unknown;
  double_tap_action?: unknown;
  icon_tap_action?: unknown;
  icon_hold_action?: unknown;
  icon_double_tap_action?: unknown;
  features?: unknown[];
  features_position?: "bottom" | "inline";
  visibility?: unknown[];
  [key: string]: unknown;
}

export interface ConfigChangedEvent extends CustomEvent {
  detail: { config: TileCardLabConfig };
}
