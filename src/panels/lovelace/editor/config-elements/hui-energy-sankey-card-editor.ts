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
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { EnergyCardSankeyConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    type: union([
      literal("power-sankey"),
      literal("water-sankey"),
      literal("energy-sankey"),
      literal("water-flow-sankey"),
    ]),
    title: optional(string()),
    collection_key: optional(string()),
    layout: optional(
      union([literal("auto"), literal("vertical"), literal("horizontal")])
    ),
    group_by_floor: optional(boolean()),
    group_by_area: optional(boolean()),
  })
);

const layoutDirections = ["auto", "vertical", "horizontal"] as const;

@customElement("hui-energy-sankey-card-editor")
export class HuiEnergySankeyCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyCardSankeyConfig;

  public setConfig(config: EnergyCardSankeyConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne((localize: LocalizeFunc) => {
    const schema: HaFormSchema[] = [
      { name: "title", selector: { text: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          {
            name: "layout",
            required: false,
            selector: {
              select: {
                options: layoutDirections.map((direction) => ({
                  value: direction,
                  label: localize(
                    `ui.panel.lovelace.editor.card.energy-sankey.layout_directions.${direction}`
                  ),
                })),
              },
            },
          },
          {
            name: "",
            type: "grid",
            schema: [
              {
                name: "group_by_floor",
                required: false,
                selector: { boolean: {} },
              },
              {
                name: "group_by_area",
                required: false,
                selector: { boolean: {} },
              },
            ],
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

    const schema = this._schema(this.hass.localize);

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
      case "layout":
      case "group_by_floor":
      case "group_by_area":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.energy-sankey.${schema.name}`
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
    "hui-energy-sankey-card-editor": HuiEnergySankeyCardEditor;
  }
}
