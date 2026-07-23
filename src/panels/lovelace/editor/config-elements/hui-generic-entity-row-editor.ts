import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { SENSOR_TIMESTAMP_DEVICE_CLASSES } from "../../../../data/sensor";
import type { EntitiesCardEntityConfig } from "../../cards/types";
import type { LovelaceRowEditor } from "../../types";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { DOMAIN_TO_ELEMENT_TYPE } from "../../create-element/create-row-element";
import { TIMESTAMP_STATE_DOMAINS } from "../../../../common/const";
import { stateContentHasTimestamp } from "../../../../state-display/state-display";

@customElement("hui-generic-entity-row-editor")
export class HuiGenericEntityRowEditor
  extends LitElement
  implements LovelaceRowEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public schema?;

  @state() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    assert(config, entitiesConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne((showTimeFormat?: boolean) => {
    return [
      { name: "entity", required: true, selector: { entity: {} } },
      {
        name: "name",
        selector: { entity_name: {} },
        context: { entity: "entity" },
      },
      {
        name: "",
        type: "grid",
        schema: [
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
            name: "color",
            selector: {
              ui_color: {
                include_state: true,
                include_none: true,
              },
            },
          },
        ],
      },
      {
        name: "secondary_info",
        selector: {
          ui_state_content: {
            allow_context: true,
          },
        },
        context: {
          filter_entity: "entity",
        },
      },
      {
        name: "time_format",
        visible: showTimeFormat,
        selector: {
          ui_time_format: {},
        },
      },
    ] as const;
  });

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const entity = this._config.entity;
    const domain = entity ? computeDomain(entity) : "";
    const simpleEntity =
      (DOMAIN_TO_ELEMENT_TYPE[domain] ||
        DOMAIN_TO_ELEMENT_TYPE["_domain_not_found"]) === "simple";
    const showTimeFormat =
      (this._config.secondary_info &&
        stateContentHasTimestamp(
          entity,
          this.hass.states[entity],
          this._config.secondary_info
        )) ||
      (simpleEntity
        ? TIMESTAMP_STATE_DOMAINS.has(domain)
        : domain === "event" ||
          (domain === "sensor" &&
            SENSOR_TIMESTAMP_DEVICE_CLASSES.includes(
              this.hass.states[entity]?.attributes.device_class
            )));

    const schema = this.schema || this._schema(showTimeFormat);

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
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "secondary_info":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.entity-row.${schema.name}`
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
    "hui-generic-entity-row-editor": HuiGenericEntityRowEditor;
  }
}
