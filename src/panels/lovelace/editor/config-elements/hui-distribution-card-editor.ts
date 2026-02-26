import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  object,
  optional,
  string,
  union,
} from "superstruct";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HaEntityPickerEntityFilterFunc } from "../../../../data/entity/entity";
import type { HomeAssistant } from "../../../../types";
import type { DistributionCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import type { EntityConfig } from "../../entity-rows/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { processEditorEntities } from "../process-editor-entities";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import type { EditDetailElementEvent, SubElementEditorConfig } from "../types";

const distributionEntityConfigStruct = object({
  entity: string(),
  name: optional(entityNameStruct),
  color: optional(string()),
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    entities: array(union([string(), distributionEntityConfigStruct])),
  })
);

const SUB_SCHEMA = [
  { name: "entity", selector: { entity: {} }, required: true },
  {
    name: "name",
    selector: { entity_name: {} },
    context: {
      entity: "entity",
    },
  },
  {
    name: "color",
    selector: { ui_color: {} },
  },
] as const;

const SCHEMA = [{ name: "title", selector: { text: {} } }] as const;

@customElement("hui-distribution-card-editor")
export class HuiDistributionCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: DistributionCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  @state() private _configEntities?: EntityConfig[];

  public setConfig(config: DistributionCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  private _schema = memoizeOne(() => SCHEMA);

  private _entityFilter = memoizeOne(
    (
      entities: EntityConfig[] | undefined,
      hass: HomeAssistant
    ): HaEntityPickerEntityFilterFunc | undefined => {
      // No filtering if no entities yet
      if (!entities || entities.length === 0) {
        return undefined;
      }

      // Get the domain and device_class of the first entity
      const firstEntityState = hass.states[entities[0].entity];
      if (!firstEntityState) {
        return undefined;
      }

      const targetDomain = computeDomain(entities[0].entity);
      // Default to "none" if no device_class (Home Assistant pattern)
      const targetDeviceClass =
        firstEntityState.attributes.device_class || "none";

      // Create set of already selected entity IDs for fast lookup
      const selectedEntityIds = new Set(entities.map((e) => e.entity));

      // Return filter function that only allows entities with matching domain and device_class
      // and excludes already selected entities
      return (entity) => {
        const entityDomain = computeDomain(entity.entity_id);
        const entityDeviceClass = entity.attributes.device_class || "none";
        return (
          entityDomain === targetDomain &&
          entityDeviceClass === targetDeviceClass &&
          !selectedEntityIds.has(entity.entity_id)
        );
      };
    }
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    if (this._subElementEditorConfig) {
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          .schema=${SUB_SCHEMA}
          @go-back=${this._goBack}
          @config-changed=${this._handleSubElementChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    const schema = this._schema();
    const entityFilter = this._entityFilter(this._configEntities, this.hass);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-entity-editor
        .hass=${this.hass}
        can-edit
        .entities=${this._configEntities}
        .entityFilter=${entityFilter}
        @entities-changed=${this._entitiesChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-entity-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _entitiesChanged(ev: CustomEvent): void {
    const config = { ...this._config!, entities: ev.detail.entities };
    this._configEntities = processEditorEntities(config.entities);
    fireEvent(this, "config-changed", { config });
  }

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _handleSubElementChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const index = this._subElementEditorConfig!.index!;

    const newEntities = this._configEntities!.concat();
    const newConfig = ev.detail.config as EntityConfig;
    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: newConfig,
    };
    newEntities[index] = newConfig;
    let config = this._config!;
    config = { ...config, entities: newEntities };
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "title":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.title"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-distribution-card-editor": HuiDistributionCardEditor;
  }
}
