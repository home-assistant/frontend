import type { HassEntity } from "home-assistant-js-websocket";
import { rgb2hsv, hsv2rgb } from "../../common/color/convert-color";
import {
  kelvin2mired,
  temperature2rgb,
} from "../../common/color/convert-light-color";
import { supportsFeatureFromAttributes } from "../../common/entity/supports-feature";
import { LightColorMode, LightEntityFeature } from "../../data/light";
import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

// HA hs_color uses saturation 0-100, internal hsv uses 0-1
const haHsToRgb = (hs: [number, number]): [number, number, number] =>
  hsv2rgb([hs[0], hs[1] / 100, 255]);

const rgbToHaHs = (rgb: [number, number, number]): [number, number] => {
  const [h, s] = rgb2hsv(rgb);
  return [h, s * 100];
};

const MODES_SUPPORTING_COLOR = [
  LightColorMode.HS,
  LightColorMode.XY,
  LightColorMode.RGB,
  LightColorMode.RGBW,
  LightColorMode.RGBWW,
];

export class MockLightEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    if (service === "turn_on") {
      const attrs = { ...this.attributes };

      // Brightness
      if (data.brightness) {
        attrs.brightness = data.brightness;
      } else if (data.brightness_pct) {
        attrs.brightness = (255 * data.brightness_pct) / 100;
      } else if (!attrs.brightness) {
        attrs.brightness = 255;
      }

      // Resolve input color and derive all representations
      let rgb: [number, number, number] | undefined;
      let hs: [number, number] | undefined;

      if (data.color_temp_kelvin) {
        // Color temp mode: derive approximate RGB from kelvin
        attrs.color_temp_kelvin = data.color_temp_kelvin;
        attrs.color_temp = kelvin2mired(data.color_temp_kelvin);
        rgb = temperature2rgb(data.color_temp_kelvin);
        attrs.color_mode = LightColorMode.COLOR_TEMP;
      } else if (data.hs_color) {
        hs = data.hs_color;
        rgb = haHsToRgb(data.hs_color);
      } else if (data.rgb_color) {
        rgb = data.rgb_color;
        hs = rgbToHaHs(data.rgb_color);
      } else if (data.xy_color) {
        attrs.xy_color = data.xy_color;
      } else if (data.rgbw_color) {
        const rgbFromW = data.rgbw_color.slice(0, 3) as [
          number,
          number,
          number,
        ];
        rgb = rgbFromW;
        hs = rgbToHaHs(rgbFromW);
        attrs.rgbw_color = data.rgbw_color;
      } else if (data.rgbww_color) {
        const rgbFromWW = data.rgbww_color.slice(0, 3) as [
          number,
          number,
          number,
        ];
        rgb = rgbFromWW;
        hs = rgbToHaHs(rgbFromWW);
        attrs.rgbww_color = data.rgbww_color;
      }

      // Populate all color representations
      if (rgb) {
        attrs.rgb_color = rgb;
      }
      if (hs) {
        attrs.hs_color = hs;
      }

      // Determine color_mode based on supported modes (for non-color_temp)
      if (!data.color_temp_kelvin && (rgb || data.xy_color)) {
        const supportedModes: LightColorMode[] =
          attrs.supported_color_modes || [];
        const nativeColorMode = supportedModes.find((mode) =>
          MODES_SUPPORTING_COLOR.includes(mode)
        );
        attrs.color_mode = nativeColorMode || LightColorMode.UNKNOWN;
      }

      // Effect
      if (data.effect) {
        attrs.effect = data.effect;
      }

      // Default color_mode if not set
      if (!attrs.color_mode) {
        const supportedModes: LightColorMode[] =
          attrs.supported_color_modes || [];
        attrs.color_mode = supportedModes[0] || LightColorMode.UNKNOWN;
      }

      this.update({ state: "on", attributes: attrs });
      return;
    }
    if (service === "turn_off") {
      this.update({ state: "off" });
      return;
    }
    if (service === "toggle") {
      if (this.state === "on") {
        this.handleService(domain, "turn_off", data);
      } else {
        this.handleService(domain, "turn_on", data);
      }
      return;
    }
    super.handleService(domain, service, data);
  }

  private _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const supportedColorModes: LightColorMode[] =
      attrs.supported_color_modes || [];

    const capabilityAttrs: EntityAttributes = {};

    capabilityAttrs.supported_color_modes = supportedColorModes;

    if (supportedColorModes.includes(LightColorMode.COLOR_TEMP)) {
      capabilityAttrs.min_color_temp_kelvin = attrs.min_color_temp_kelvin;
      capabilityAttrs.max_color_temp_kelvin = attrs.max_color_temp_kelvin;
    }

    if (supportsFeatureFromAttributes(attrs, LightEntityFeature.EFFECT)) {
      capabilityAttrs.effect_list = attrs.effect_list;
    }

    return capabilityAttrs;
  }

  private _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const isOn = this.state === "on";
    const colorMode = isOn ? attrs.color_mode || null : null;
    const isColorTemp = colorMode === LightColorMode.COLOR_TEMP;

    const stateAttrs: EntityAttributes = {
      color_mode: colorMode,
      brightness: isOn ? (attrs.brightness ?? null) : null,
      color_temp_kelvin: isColorTemp ? (attrs.color_temp_kelvin ?? null) : null,
      color_temp: isColorTemp ? (attrs.color_temp ?? null) : null,
      hs_color: isOn ? (attrs.hs_color ?? null) : null,
      rgb_color: isOn ? (attrs.rgb_color ?? null) : null,
      xy_color: isOn ? (attrs.xy_color ?? null) : null,
    };

    if (attrs.rgbw_color !== undefined) {
      stateAttrs.rgbw_color = isOn ? (attrs.rgbw_color ?? null) : null;
    }
    if (attrs.rgbww_color !== undefined) {
      stateAttrs.rgbww_color = isOn ? (attrs.rgbww_color ?? null) : null;
    }
    if (supportsFeatureFromAttributes(attrs, LightEntityFeature.EFFECT)) {
      stateAttrs.effect = isOn ? (attrs.effect ?? null) : null;
    }

    return stateAttrs;
  }

  public toState(): HassEntity {
    const attrs = this.attributes;

    // Base attributes (friendly_name, icon, etc.)
    const baseAttrs: EntityAttributes = {};
    for (const key of [
      "friendly_name",
      "icon",
      "entity_picture",
      "assumed_state",
      "device_class",
      "supported_features",
    ]) {
      if (key in attrs) {
        baseAttrs[key] = attrs[key];
      }
    }

    return {
      entity_id: this.entityId,
      state: this.state,
      attributes: {
        ...baseAttrs,
        ...this._getCapabilityAttributes(),
        ...this._getStateAttributes(),
      },
      last_changed: this.lastChanged,
      last_updated: this.lastUpdated,
      context: { id: this.entityId, user_id: null, parent_id: null },
    };
  }
}
