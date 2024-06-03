import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { any, assert, literal, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-form/ha-form";
import { LovelacePictureElementEditor } from "../../../types";
import { StateBadgeElementConfig } from "../../../elements/types";
import { actionConfigStruct } from "../../structs/action-struct";

const stateBadgeElementConfigStruct = object({
  type: literal("state-badge"),
  entity: optional(string()),
  style: optional(any()),
  title: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
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
  { name: "style", selector: { object: {} } },
] as const;

@customElement("hui-state-badge-element-editor")
export class HuiStateBadgeElementEditor
  extends LitElement
  implements LovelacePictureElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StateBadgeElementConfig;

  public setConfig(config: StateBadgeElementConfig): void {
    assert(config, stateBadgeElementConfigStruct);
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
    "hui-state-badge-element-editor": HuiStateBadgeElementEditor;
  }
}
