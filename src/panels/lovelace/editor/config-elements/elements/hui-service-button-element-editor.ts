import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { any, assert, literal, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-form/ha-form";
import { LovelacePictureElementEditor } from "../../../types";
import { ServiceButtonElementConfig } from "../../../elements/types";
// import { UiAction } from "../../components/hui-action-editor";

const serviceButtonElementConfigStruct = object({
  type: literal("service-button"),
  style: optional(any()),
  title: optional(string()),
  service: optional(string()),
  service_data: optional(any()),
});

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  /* {
    name: "service",
    selector: {
      ui_action: { actions: ["call-service"] as UiAction[] },
    },
  }, */
  { name: "service", selector: { text: {} } },
  { name: "service_data", selector: { object: {} } },
  { name: "style", selector: { object: {} } },
] as const;

@customElement("hui-service-button-element-editor")
export class HuiServiceButtonElementEditor
  extends LitElement
  implements LovelacePictureElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ServiceButtonElementConfig;

  public setConfig(config: ServiceButtonElementConfig): void {
    assert(config, serviceButtonElementConfigStruct);
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
    "hui-service-button-element-editor": HuiServiceButtonElementEditor;
  }
}
