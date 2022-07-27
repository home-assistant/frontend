import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import {
  LightColorModes,
  SUPPORT_EFFECT,
  SUPPORT_FLASH,
  SUPPORT_TRANSITION,
} from "../../../../src/data/light";
import "../../../../src/dialogs/more-info/more-info-content";
import { getEntity } from "../../../../src/fake_data/entity";
import {
  MockHomeAssistant,
  provideHass,
} from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";

const ENTITIES = [
  getEntity("light", "bed_light", "on", {
    friendly_name: "Basic Light",
  }),
  getEntity("light", "kitchen_light", "on", {
    friendly_name: "Brightness Light",
    brightness: 200,
    supported_color_modes: [LightColorModes.BRIGHTNESS],
    color_mode: LightColorModes.BRIGHTNESS,
  }),
  getEntity("light", "color_temperature_light", "on", {
    friendly_name: "White Color Temperature Light",
    brightness: 128,
    color_temp: 75,
    min_mireds: 30,
    max_mireds: 150,
    supported_color_modes: [
      LightColorModes.BRIGHTNESS,
      LightColorModes.COLOR_TEMP,
    ],
    color_mode: LightColorModes.COLOR_TEMP,
  }),
  getEntity("light", "color_hs_light", "on", {
    friendly_name: "Color HS Light",
    brightness: 255,
    hs_color: [30, 100],
    rgb_color: [30, 100, 255],
    min_mireds: 30,
    max_mireds: 150,
    supported_features: SUPPORT_EFFECT + SUPPORT_FLASH + SUPPORT_TRANSITION,
    supported_color_modes: [
      LightColorModes.BRIGHTNESS,
      LightColorModes.COLOR_TEMP,
      LightColorModes.HS,
    ],
    color_mode: LightColorModes.HS,
    effect_list: ["random", "colorloop"],
  }),
  getEntity("light", "color_rgb_ct_light", "on", {
    friendly_name: "Color RGB + CT Light",
    brightness: 255,
    color_temp: 75,
    min_mireds: 30,
    max_mireds: 150,
    supported_features: SUPPORT_EFFECT + SUPPORT_FLASH + SUPPORT_TRANSITION,
    supported_color_modes: [
      LightColorModes.BRIGHTNESS,
      LightColorModes.COLOR_TEMP,
      LightColorModes.RGB,
    ],
    color_mode: LightColorModes.COLOR_TEMP,
    effect_list: ["random", "colorloop"],
  }),
  getEntity("light", "color_RGB_light", "on", {
    friendly_name: "Color Effects Light",
    brightness: 255,
    rgb_color: [30, 100, 255],
    supported_features: SUPPORT_EFFECT + SUPPORT_FLASH + SUPPORT_TRANSITION,
    supported_color_modes: [LightColorModes.BRIGHTNESS, LightColorModes.RGB],
    color_mode: LightColorModes.RGB,
    effect_list: ["random", "colorloop"],
  }),
  getEntity("light", "color_rgbw_light", "on", {
    friendly_name: "Color RGBW Light",
    brightness: 255,
    rgbw_color: [30, 100, 255, 125],
    min_mireds: 30,
    max_mireds: 150,
    supported_features: SUPPORT_EFFECT + SUPPORT_FLASH + SUPPORT_TRANSITION,
    supported_color_modes: [
      LightColorModes.BRIGHTNESS,
      LightColorModes.COLOR_TEMP,
      LightColorModes.RGBW,
    ],
    color_mode: LightColorModes.RGBW,
    effect_list: ["random", "colorloop"],
  }),
  getEntity("light", "color_rgbww_light", "on", {
    friendly_name: "Color RGBWW Light",
    brightness: 255,
    rgbww_color: [30, 100, 255, 125, 10],
    min_mireds: 30,
    max_mireds: 150,
    supported_features: SUPPORT_EFFECT + SUPPORT_FLASH + SUPPORT_TRANSITION,
    supported_color_modes: [
      LightColorModes.BRIGHTNESS,
      LightColorModes.COLOR_TEMP,
      LightColorModes.RGBWW,
    ],
    color_mode: LightColorModes.RGBWW,
    effect_list: ["random", "colorloop"],
  }),
  getEntity("light", "color_xy_light", "on", {
    friendly_name: "Color XY Light",
    brightness: 255,
    xy_color: [30, 100],
    rgb_color: [30, 100, 255],
    min_mireds: 30,
    max_mireds: 150,
    supported_features: SUPPORT_EFFECT + SUPPORT_FLASH + SUPPORT_TRANSITION,
    supported_color_modes: [
      LightColorModes.BRIGHTNESS,
      LightColorModes.COLOR_TEMP,
      LightColorModes.XY,
    ],
    color_mode: LightColorModes.XY,
    effect_list: ["random", "colorloop"],
  }),
];

@customElement("demo-more-info-light")
class DemoMoreInfoLight extends LitElement {
  @property() public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entityId)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-light": DemoMoreInfoLight;
  }
}
