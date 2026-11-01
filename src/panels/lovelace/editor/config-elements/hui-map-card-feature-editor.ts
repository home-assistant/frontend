import type { HassEntities } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { getEntityLocation } from "../../../../common/entity/get_entity_location";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  findRelatedLocationEntity,
  supportsMapCardFeatureFromState,
} from "../../card-features/hui-map-card-feature";
import type {
  LovelaceCardFeatureContext,
  MapCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-map-card-feature-editor")
export class HuiMapCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MapCardFeatureConfig;

  public setConfig(config: MapCardFeatureConfig): void {
    this._config = config;
  }

  private _filteredEntities = memoizeOne((states: HassEntities): string[] =>
    Object.keys(states).filter(
      (entityId) => getEntityLocation(states[entityId], states) !== undefined
    )
  );

  private _getAutoSelectedEntity(): string | undefined {
    if (!this.hass || !this.context?.entity_id) {
      return undefined;
    }
    const stateObj = this.hass.states[this.context.entity_id];
    if (
      stateObj &&
      supportsMapCardFeatureFromState(stateObj, this.hass.states)
    ) {
      return this.context.entity_id;
    }
    return findRelatedLocationEntity(
      this.hass.entities,
      this.hass.states,
      this.context.entity_id
    );
  }

  private _includeEntities = memoizeOne(
    (
      locationEntities: string[],
      configuredEntity: string | undefined,
      autoEntity: string | undefined
    ): string[] => {
      const extraEntities = Array.from(
        new Set(
          [configuredEntity, autoEntity].filter(
            (e): e is string => e !== undefined && !locationEntities.includes(e)
          )
        )
      );
      return extraEntities.length
        ? [...extraEntities, ...locationEntities]
        : locationEntities;
    }
  );

  private _schema = memoizeOne(
    (includeEntities: string[]) =>
      [
        {
          name: "entity_id",
          selector: {
            entity: {
              include_entities: includeEntities,
            },
          },
        },
        {
          name: "color",
          selector: { ui_color: {} },
        },
        {
          name: "rows",
          default: 3,
          selector: {
            number: {
              mode: "box",
              min: 2,
              max: 20,
              step: 1,
            },
          },
        },
        {
          name: "auto_fit",
          default: true,
          selector: { boolean: {} },
        },
        {
          name: "default_zoom",
          default: 14,
          selector: { number: { mode: "box", min: 1, max: 20 } },
        },
        {
          name: "hours_to_show",
          selector: { number: { mode: "box", min: 0 } },
        },
        {
          name: "interactive",
          default: false,
          selector: { boolean: {} },
        },
      ] as const satisfies HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const autoEntity = this._getAutoSelectedEntity();
    const configuredEntity = this._config.entity_id;

    const data: MapCardFeatureConfig = {
      auto_fit: true,
      default_zoom: 14,
      interactive: false,
      rows: 3,
      ...this._config,
    };

    const locationEntities = this._filteredEntities(this.hass.states);
    const includeEntities = this._includeEntities(
      locationEntities,
      configuredEntity,
      autoEntity
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(includeEntities)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "entity_id":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.entity"
        );
      case "color":
        return this.hass!.localize("ui.panel.lovelace.editor.card.tile.color");
      default:
        return (
          this.hass!.localize(
            `ui.panel.lovelace.editor.features.types.map.${schema.name}`
          ) ||
          this.hass!.localize(
            `ui.panel.lovelace.editor.card.map.${schema.name}`
          ) ||
          this.hass!.localize(
            `ui.panel.lovelace.editor.card.generic.${schema.name}`
          )
        );
    }
  };

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card-feature-editor": HuiMapCardFeatureEditor;
  }
}
