import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
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
import type { EnergySourcesTableCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    type: literal("energy-sources-table"),
    title: optional(string()),
    collection_key: optional(string()),
    types: optional(
      array(
        union([
          literal("grid"),
          literal("solar"),
          literal("battery"),
          literal("gas"),
          literal("water"),
        ])
      )
    ),
    show_only_totals: optional(boolean()),
  })
);

const sourceTypeOpts = ["grid", "solar", "battery", "gas", "water"] as const;

@customElement("hui-energy-sources-table-card-editor")
export class HuiEnergySourcesTableCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergySourcesTableCardConfig;

  public setConfig(config: EnergySourcesTableCardConfig): void {
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
            name: "types",
            required: false,
            selector: {
              select: {
                multiple: true,
                mode: "list",
                options: sourceTypeOpts.map((type) => ({
                  value: type,
                  label: localize(
                    `ui.panel.lovelace.editor.card.energy-sources-table.type_options.${type}`
                  ),
                })),
              },
            },
          },
          {
            name: "show_only_totals",
            required: false,
            selector: { boolean: {} },
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
      case "types":
      case "show_only_totals":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.energy-sources-table.${schema.name}`
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
    "hui-energy-sources-table-card-editor": HuiEnergySourcesTableCardEditor;
  }
}
