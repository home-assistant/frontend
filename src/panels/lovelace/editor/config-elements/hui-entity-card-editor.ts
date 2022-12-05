import "../../../../components/ha-form/ha-form";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import type { HassEntity } from "home-assistant-js-websocket/dist/types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
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

  private _schema = memoizeOne(
    (entity: string, icon: string, entityState: HassEntity) =>
      [
        { name: "entity", required: true, selector: { entity: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "name", selector: { text: {} } },
            {
              name: "icon",
              selector: {
                icon: {
                  placeholder: icon || entityState?.attributes.icon,
                  fallbackPath:
                    !icon && !entityState?.attributes.icon && entityState
                      ? domainIcon(computeDomain(entity), entityState)
                      : undefined,
                },
              },
            },

            {
              name: "attribute",
              selector: { attribute: { entity_id: entity } },
            },
            { name: "unit", selector: { text: {} } },
            { name: "theme", selector: { theme: {} } },
            { name: "state_color", selector: { boolean: {} } },
          ],
        },
      ] as const
  );

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const entityState = this.hass.states[this._config.entity];

    const schema = this._schema(
      this._config.entity,
      this._config.icon,
      entityState
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
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

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
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
