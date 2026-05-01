import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-card";
import { LightColorMode, LightEntityFeature } from "../../../../src/data/light";
import "../../../../src/dialogs/more-info/more-info-content";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-more-infos";

const ENTITIES = [
  {
    entity_id: "light.bed_light",
    state: "on",
    attributes: {
      friendly_name: "Basic Light",
    },
  },
  {
    entity_id: "light.kitchen_light",
    state: "on",
    attributes: {
      friendly_name: "Brightness Light",
      brightness: 200,
      supported_color_modes: [LightColorMode.BRIGHTNESS],
      color_mode: LightColorMode.BRIGHTNESS,
    },
  },
  {
    entity_id: "light.color_temperature_light",
    state: "on",
    attributes: {
      friendly_name: "White Color Temperature Light",
      brightness: 128,
      color_temp: 75,
      min_mireds: 30,
      max_mireds: 150,
      supported_color_modes: [
        LightColorMode.BRIGHTNESS,
        LightColorMode.COLOR_TEMP,
      ],
      color_mode: LightColorMode.COLOR_TEMP,
    },
  },
  {
    entity_id: "light.color_hs_light",
    state: "on",
    attributes: {
      friendly_name: "Color HS Light",
      brightness: 255,
      hs_color: [30, 100],
      rgb_color: [30, 100, 255],
      min_mireds: 30,
      max_mireds: 150,
      supported_features:
        LightEntityFeature.EFFECT +
        LightEntityFeature.FLASH +
        LightEntityFeature.TRANSITION,
      supported_color_modes: [
        LightColorMode.BRIGHTNESS,
        LightColorMode.COLOR_TEMP,
        LightColorMode.HS,
      ],
      color_mode: LightColorMode.HS,
      effect_list: ["random", "colorloop"],
    },
  },
  {
    entity_id: "light.color_rgb_ct_light",
    state: "on",
    attributes: {
      friendly_name: "Color RGB + CT Light",
      brightness: 255,
      color_temp: 75,
      min_mireds: 30,
      max_mireds: 150,
      supported_features:
        LightEntityFeature.EFFECT +
        LightEntityFeature.FLASH +
        LightEntityFeature.TRANSITION,
      supported_color_modes: [
        LightColorMode.BRIGHTNESS,
        LightColorMode.COLOR_TEMP,
        LightColorMode.RGB,
      ],
      color_mode: LightColorMode.COLOR_TEMP,
      effect_list: ["random", "colorloop"],
    },
  },
  {
    entity_id: "light.color_RGB_light",
    state: "on",
    attributes: {
      friendly_name: "Color Effects Light",
      brightness: 255,
      rgb_color: [30, 100, 255],
      supported_features:
        LightEntityFeature.EFFECT +
        LightEntityFeature.FLASH +
        LightEntityFeature.TRANSITION,
      supported_color_modes: [LightColorMode.BRIGHTNESS, LightColorMode.RGB],
      color_mode: LightColorMode.RGB,
      effect_list: ["random", "colorloop"],
    },
  },
  {
    entity_id: "light.color_rgbw_light",
    state: "on",
    attributes: {
      friendly_name: "Color RGBW Light",
      brightness: 255,
      rgbw_color: [30, 100, 255, 125],
      min_mireds: 30,
      max_mireds: 150,
      supported_features:
        LightEntityFeature.EFFECT +
        LightEntityFeature.FLASH +
        LightEntityFeature.TRANSITION,
      supported_color_modes: [
        LightColorMode.BRIGHTNESS,
        LightColorMode.COLOR_TEMP,
        LightColorMode.RGBW,
      ],
      color_mode: LightColorMode.RGBW,
      effect_list: ["random", "colorloop"],
    },
  },
  {
    entity_id: "light.color_rgbww_light",
    state: "on",
    attributes: {
      friendly_name: "Color RGBWW Light",
      brightness: 255,
      rgbww_color: [30, 100, 255, 125, 10],
      min_mireds: 30,
      max_mireds: 150,
      supported_features:
        LightEntityFeature.EFFECT +
        LightEntityFeature.FLASH +
        LightEntityFeature.TRANSITION,
      supported_color_modes: [
        LightColorMode.BRIGHTNESS,
        LightColorMode.COLOR_TEMP,
        LightColorMode.RGBWW,
      ],
      color_mode: LightColorMode.RGBWW,
      effect_list: ["random", "colorloop"],
    },
  },
  {
    entity_id: "light.color_xy_light",
    state: "on",
    attributes: {
      friendly_name: "Color XY Light",
      brightness: 255,
      xy_color: [30, 100],
      rgb_color: [30, 100, 255],
      min_mireds: 30,
      max_mireds: 150,
      supported_features:
        LightEntityFeature.EFFECT +
        LightEntityFeature.FLASH +
        LightEntityFeature.TRANSITION,
      supported_color_modes: [
        LightColorMode.BRIGHTNESS,
        LightColorMode.COLOR_TEMP,
        LightColorMode.XY,
      ],
      color_mode: LightColorMode.XY,
      effect_list: ["random", "colorloop"],
    },
  },
];

@customElement("demo-more-info-light")
class DemoMoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @query("demo-more-infos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <demo-more-infos
        .hass=${this.hass}
        .entities=${ENTITIES.map((ent) => ent.entity_id)}
      ></demo-more-infos>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
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
