import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { array, assert, assign, object, optional, string } from "superstruct";
import { HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  AlarmPanelCardConfig,
  AlarmPanelCardConfigState,
} from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import {
  DEFAULT_STATES,
  ALARM_MODE_STATE_MAP,
  filterSupportedAlarmStates,
} from "../../cards/hui-alarm-panel-card";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import { ALARM_MODES } from "../../../../data/alarm_control_panel";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    states: optional(array()),
    theme: optional(string()),
  })
);

const states = Object.keys(ALARM_MODE_STATE_MAP) as AlarmPanelCardConfigState[];

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
    (
      localize: LocalizeFunc,
      stateObj: HassEntity | undefined,
      config_states: AlarmPanelCardConfigState[]
    ) =>
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
          name: "states",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options: states.map((s) => ({
                value: s,
                label: localize(`ui.card.alarm_control_panel.${s}`),
                disabled:
                  !config_states.includes(s) &&
                  (!stateObj ||
                    !supportsFeature(
                      stateObj,
                      ALARM_MODES[ALARM_MODE_STATE_MAP[s]].feature || 0
                    )),
              })),
            },
          },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];
    const defaultFilteredStates = filterSupportedAlarmStates(
      stateObj,
      DEFAULT_STATES
    );
    const config = { states: defaultFilteredStates, ...this._config };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${config}
        .schema=${this._schema(this.hass.localize, stateObj, config.states)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const newConfig = ev.detail.value;

    // Sort states in a consistent order
    if (newConfig.states) {
      const sortStates = states.filter((s) => newConfig.states.includes(s));
      newConfig.states = sortStates;
    }

    // When changing entities, clear any states that the new entity does not support
    if (newConfig.states && newConfig.entity !== this._config?.entity) {
      const newStateObj = this.hass?.states[newConfig.entity];
      if (newStateObj) {
        newConfig.states = filterSupportedAlarmStates(
          newStateObj,
          newConfig.states
        );
      }
    }

    fireEvent(this, "config-changed", { config: newConfig });
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
