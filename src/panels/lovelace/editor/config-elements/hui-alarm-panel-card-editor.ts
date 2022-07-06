import "../../../../components/ha-form/ha-form";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { array, assert, assign, object, optional, string } from "superstruct";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import type { AlarmPanelCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { LocalizeFunc } from "../../../../common/translations/localize";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    states: optional(array()),
    theme: optional(string()),
  })
);

const states = [
  "arm_home",
  "arm_away",
  "arm_night",
  "arm_vacation",
  "arm_custom_bypass",
] as const;

@customElement("hui-alarm-panel-card-editor")
export class HuiAlarmPanelCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlarmPanelCardConfig;

  public setConfig(config: AlarmPanelCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "alarm_control_panel" } },
        },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "name", selector: { text: {} } },
            { name: "theme", selector: { theme: {} } },
          ],
        },
        {
          type: "multi_select",
          name: "states",
          options: states.map((s) => [
            s,
            localize(`ui.card.alarm_control_panel.${s}`),
          ]) as [string, string][],
        },
      ] as const
  );

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "entity":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.entity"
        );
      case "name":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.name"
        );
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      default:
        // "states"
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.alarm-panel.available_states"
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-panel-card-editor": HuiAlarmPanelCardEditor;
  }
}
