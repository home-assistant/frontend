import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { ALERT_DOMAINS } from "../../../../common/entity/alert_active";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type { AlertCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    color: optional(string()),
    inactive_color: optional(string()),
    pulse: optional(boolean()),
  })
);

const SCHEMA = [
  {
    name: "entity",
    required: true,
    selector: { entity: { filter: { domain: ALERT_DOMAINS } } },
  },
  {
    name: "color",
    selector: { ui_color: { include_none: true, default_color: "none" } },
  },
  {
    name: "inactive_color",
    selector: { ui_color: { include_none: true, default_color: "none" } },
  },
  { name: "pulse", selector: { boolean: {} } },
] as const;

@customElement("hui-alert-card-editor")
export class HuiAlertCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlertCardConfig;

  public setConfig(config: AlertCardConfig): void {
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
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<AlertCardConfig>): void {
    ev.stopPropagation();
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (schema.name === "pulse" || schema.name === "inactive_color") {
      return this.hass!.localize(
        `ui.panel.lovelace.editor.card.alert.${schema.name}`
      );
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };

  private _computeHelperCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (
      schema.name === "pulse" ||
      schema.name === "color" ||
      schema.name === "inactive_color"
    ) {
      return this.hass?.localize(
        `ui.panel.lovelace.editor.card.alert.${schema.name}_helper`
      );
    }

    return undefined;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alert-card-editor": HuiAlertCardEditor;
  }
}
