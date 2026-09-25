import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  assert,
  assign,
  boolean,
  literal,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  EnergyCardBaseConfig,
  EnergyCardConfig,
  EnergyDistributionCardConfig,
  PowerSourcesGraphCardConfig,
} from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const SCHEMA: HaFormSchema[] = [
  {
    name: "title",
    visible: { field: "type", operator: "not_eq", value: "energy-compare" },
    selector: { text: {} },
  },
  {
    name: "show_legend",
    visible: {
      field: "type",
      operator: "in",
      value: ["power-sources-graph", "energy-usage-graph"],
    },
    default: true,
    required: false,
    selector: { boolean: {} },
  },
  {
    name: "expand_legend",
    visible: [
      {
        field: "type",
        operator: "in",
        value: ["power-sources-graph", "energy-usage-graph"],
      },
      { field: "show_legend", operator: "not_eq", value: false },
    ],
    required: false,
    selector: { boolean: {} },
  },
  {
    name: "link_dashboard",
    visible: { field: "type", value: "energy-distribution" },
    required: false,
    selector: { boolean: {} },
  },
  {
    type: "string",
    name: "collection_key",
    required: false,
  },
];

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    type: union([
      literal("energy-carbon-consumed-gauge"),
      literal("energy-compare"),
      literal("energy-distribution"),
      literal("energy-gas-graph"),
      literal("energy-grid-balance"),
      literal("energy-grid-neutrality-gauge"),
      literal("energy-self-sufficiency-gauge"),
      literal("energy-solar-consumed-gauge"),
      literal("energy-solar-graph"),
      literal("energy-usage-graph"),
      literal("energy-water-graph"),
      literal("power-sources-graph"),
    ]),
    title: optional(string()),
    collection_key: optional(string()),
    show_legend: optional(boolean()),
    expand_legend: optional(boolean()),
    link_dashboard: optional(boolean()),
  })
);

@customElement("hui-energy-graph-card-editor")
export class HuiEnergyGraphCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?:
    | EnergyCardBaseConfig
    | EnergyCardConfig
    | EnergyDistributionCardConfig
    | PowerSourcesGraphCardConfig;

  public setConfig(
    config:
      | EnergyCardBaseConfig
      | EnergyCardConfig
      | EnergyDistributionCardConfig
      | PowerSourcesGraphCardConfig
  ): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      ...this._config,
    };

    return html` <ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${SCHEMA}
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
      case "link_dashboard":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.energy-distribution.${schema.name}`
        );
      case "show_legend":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.power-sources-graph.${schema.name}`
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
    "hui-energy-graph-card-editor": HuiEnergyGraphCardEditor;
  }
}
