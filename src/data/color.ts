import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export type ColorKind = "chromatic" | "white";

interface ColorEntityAttributes extends HassEntityAttributeBase {
  kind: ColorKind;
  hex_color: string;
  rgb_color: [number, number, number];
  hs_color: [number, number];
  xy_color: [number, number];
  color_temp_kelvin: number | null;
  brightness: number | null;
  source_hex: string | null;
  color_params: Record<string, unknown>;
}

export interface ColorEntity extends HassEntityBase {
  attributes: ColorEntityAttributes;
}
