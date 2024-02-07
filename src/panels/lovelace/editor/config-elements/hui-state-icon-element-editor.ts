import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import "../../../../components/ha-form/ha-form";
import { LovelacePictureElementEditor } from "../../types";
import { StateIconElementConfig } from "../../elements/types";

const SCHEMA = [
  { name: "entity", selector: { entity: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "title", selector: { text: {} } },
  { name: "state_color", selector: { boolean: {} } },
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

@customElement("hui-state-icon-element-editor")
export class HuiStateIconElementEditor
  extends LitElement
  implements LovelacePictureElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: StateIconElementConfig;

  public setConfig(config: StateIconElementConfig): void {
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

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-icon-element-editor": HuiStateIconElementEditor;
  }
}
