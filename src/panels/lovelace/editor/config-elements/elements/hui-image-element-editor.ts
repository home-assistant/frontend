import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-form/ha-form";
import { LovelacePictureElementEditor } from "../../../types";
import { ImageElementConfig } from "../../../elements/types";

const SCHEMA = [
  { name: "entity", selector: { entity: {} } },
  { name: "title", selector: { text: {} } },
  {
    name: "tap_action",
    selector: {
      ui_action: {},
    },
  },
  {
    name: "hold_action",
    selector: {
      ui_action: {},
    },
  },
  { name: "image", selector: { text: {} } },
  { name: "camera_image", selector: { entity: { domain: "camera" } } },
  {
    name: "camera_view",
    selector: { select: { options: ["auto", "live"] } },
  },
  { name: "state_image", selector: { object: {} } },
  { name: "filter", selector: { text: {} } },
  { name: "state_filter", selector: { object: {} } },
  { name: "aspect_ratio", selector: { text: {} } },
  { name: "style", selector: { object: {} } },
] as const;

@customElement("hui-image-element-editor")
export class HuiImageElementEditor
  extends LitElement
  implements LovelacePictureElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ImageElementConfig;

  public setConfig(config: ImageElementConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    ) ||
    this.hass!.localize(`ui.panel.lovelace.editor.elements.${schema.name}`) ||
    schema.name;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-image-element-editor": HuiImageElementEditor;
  }
}
