import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { TimerCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    theme: optional(string()),
    features: optional(array(any())),
  })
);

const SCHEMA = [
  { name: "entity", selector: { entity: { domain: "timer" } } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      { name: "theme", selector: { theme: {} } },
    ],
  },
] as const;

@customElement("hui-timer-card-editor")
export class HuiTimerCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TimerCardConfig;

  public setConfig(config: TimerCardConfig): void {
    assert(config, cardConfigStruct);
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
    if (schema.name === "entity") {
      return this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.entity"
      );
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };

  static get styles() {
    return css`
      ha-form {
        display: block;
        margin-bottom: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-card-editor": HuiTimerCardEditor;
  }
}
