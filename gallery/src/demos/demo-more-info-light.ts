import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import "../../../src/components/ha-card";
import {
  LightColorModes,
  SUPPORT_EFFECT,
  SUPPORT_FLASH,
  SUPPORT_TRANSITION,
} from "../../../src/data/light";
import "../../../src/dialogs/more-info/more-info-content";
import { getEntity } from "../../../src/fake_data/entity";
import {
  MockHomeAssistant,
  provideHass,
} from "../../../src/fake_data/provide_hass";
import "../components/demo-more-infos";

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
  getEntity("light", "color_effectslight", "on", {
    friendly_name: "Color Effets Light",
    brightness: 255,
    hs_color: [30, 100],
    white_value: 36,
    supported_features: SUPPORT_EFFECT + SUPPORT_FLASH + SUPPORT_TRANSITION,
    supported_color_modes: [
      LightColorModes.BRIGHTNESS,
      LightColorModes.COLOR_TEMP,
      LightColorModes.HS,
      LightColorModes.RGB,
      LightColorModes.XY,
    ],
    color_mode: LightColorModes.RGBW,
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
