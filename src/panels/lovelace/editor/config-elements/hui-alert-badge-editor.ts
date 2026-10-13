import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { AlertBadgeConfig } from "../../badges/types";
import type { LovelaceBadgeEditor } from "../../types";
import { baseLovelaceBadgeConfig } from "../structs/base-badge-struct";

const badgeConfigStruct = assign(
  baseLovelaceBadgeConfig,
  object({
    entity: optional(string()),
    color: optional(string()),
    pulse: optional(boolean()),
  })
);

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  {
    name: "color",
    selector: { ui_color: { include_none: true, default_color: "none" } },
  },
  { name: "pulse", selector: { boolean: {} } },
] as const;

@customElement("hui-alert-badge-editor")
export class HuiAlertBadgeEditor
  extends LitElement
  implements LovelaceBadgeEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlertBadgeConfig;

  public setConfig(config: AlertBadgeConfig): void {
    assert(config, badgeConfigStruct);
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
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<AlertBadgeConfig>): void {
    ev.stopPropagation();
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (schema.name === "pulse") {
      return this.hass!.localize("ui.panel.lovelace.editor.card.alert.pulse");
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };

  private _computeHelperCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (schema.name === "pulse") {
      return this.hass?.localize(
        "ui.panel.lovelace.editor.card.alert.pulse_helper"
      );
    }

    return undefined;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alert-badge-editor": HuiAlertBadgeEditor;
  }
}
