import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { any, assert, literal, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-form/ha-form";
import { LovelacePictureElementEditor } from "../../../types";
import { IconElementConfig } from "../../../elements/types";
import { actionConfigStruct } from "../../structs/action-struct";

const iconElementConfigStruct = object({
  type: literal("icon"),
  entity: optional(string()),
  icon: optional(string()),
  style: optional(any()),
  title: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const SCHEMA = [
  { name: "icon", selector: { icon: {} } },
  { name: "title", selector: { text: {} } },
  { name: "entity", selector: { entity: {} } },
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
  { name: "style", selector: { object: {} } },
] as const;

@customElement("hui-icon-element-editor")
export class HuiIconElementEditor
  extends LitElement
  implements LovelacePictureElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: IconElementConfig;

  public setConfig(config: IconElementConfig): void {
    assert(config, iconElementConfigStruct);
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
    "hui-icon-element-editor": HuiIconElementEditor;
  }
}
