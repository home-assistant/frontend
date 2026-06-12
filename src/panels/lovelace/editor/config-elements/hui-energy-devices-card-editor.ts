import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
  assert,
  assign,
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  EnergyCardConfig,
  EnergyDevicesDetailGraphCardConfig,
  EnergyDevicesGraphCardConfig,
} from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    type: union([
      literal("energy-devices-graph"),
      literal("energy-devices-detail-graph"),
    ]),
    title: optional(string()),
    collection_key: optional(string()),
    max_devices: optional(number()),
    modes: optional(array(union([literal("bar"), literal("pie")]))),
    hide_compound_stats: optional(boolean()),
  })
);

const chartModeOpts = ["bar", "pie"] as const;

type EnergyDevicesCardConfig =
  | EnergyCardConfig
  | EnergyDevicesGraphCardConfig
  | EnergyDevicesDetailGraphCardConfig;
@customElement("hui-energy-devices-card-editor")
export class HuiEnergyDevicesCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyDevicesCardConfig;

  public setConfig(config: EnergyDevicesCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne((localize: LocalizeFunc, type: string) => {
    const schema: HaFormSchema[] = [
      { name: "title", selector: { text: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          ...(type === "energy-devices-graph"
            ? ([
                {
                  name: "modes",
                  required: false,
                  selector: {
                    select: {
                      multiple: true,
                      mode: "list",
                      options: chartModeOpts.map((mode) => ({
                        value: mode,
                        label: localize(
                          `ui.panel.lovelace.editor.card.energy-devices-graph.mode_options.${mode}`
                        ),
                      })),
                    },
                  },
                },
                {
                  name: "hide_compound_stats",
                  required: false,
                  selector: { boolean: {} },
                },
              ] as HaFormSchema[])
            : []),
          {
            name: "max_devices",
            required: false,
            selector: { number: { min: 1, mode: "box" } },
          },
          {
            type: "string",
            name: "collection_key",
            required: false,
          },
        ],
      },
    ];
    return schema;
  });

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(this.hass.localize, this._config.type);

    const data = {
      ...this._config,
    };

    return html` <ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${schema}
      .computeLabel=${this._computeLabelCallback}
      .computeHelper=${this._computeHelperCallback}
      @value-changed=${this._valueChanged}
    ></ha-form>`;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeHelperCallback = (schema) => {
    switch (schema.name) {
      case "collection_key":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.collection_key_description`
        );
      default:
        return undefined;
    }
  };

  private _computeLabelCallback = (schema) => {
    switch (schema.name) {
      case "modes":
      case "max_devices":
      case "hide_compound_stats":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.energy-devices-graph.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-devices-card-editor": HuiEnergyDevicesCardEditor;
  }
}
