import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { EntityCardConfig } from "../../cards/types";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    attribute: optional(string()),
    unit: optional(string()),
    theme: optional(string()),
    state_color: optional(boolean()),
    footer: optional(headerFooterConfigStructs),
  })
);

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      {
        name: "icon",
        selector: {
          icon: {},
        },
        context: {
          icon_entity: "entity",
        },
      },
      {
        name: "attribute",
        selector: {
          attribute: {},
        },
        context: {
          filter_entity: "entity",
        },
      },
      { name: "unit", selector: { text: {} } },
      { name: "theme", selector: { theme: {} } },
      { name: "state_color", selector: { boolean: {} } },
    ],
  },
] as const;

@customElement("hui-entity-card-editor")
export class HuiEntityCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityCardConfig;

  public setConfig(config: EntityCardConfig): void {
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
    const config = ev.detail.value;
    Object.keys(config).forEach((k) => config[k] === "" && delete config[k]);
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    if (schema.name === "entity") {
      return this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.entity"
      );
    }

    if (schema.name === "theme") {
      return `${this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.theme"
      )} (${this.hass!.localize(
        "ui.panel.lovelace.editor.card.config.optional"
      )})`;
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-card-editor": HuiEntityCardEditor;
  }
}
