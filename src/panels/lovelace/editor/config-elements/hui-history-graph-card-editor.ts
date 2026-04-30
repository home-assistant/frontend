import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  boolean,
  number,
  object,
  optional,
  string,
} from "superstruct";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { isNumericFromAttributes } from "../../../../common/number/format_number";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { orderProperties } from "../../../../common/util/order-properties";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { DEFAULT_HOURS_TO_SHOW } from "../../cards/hui-history-graph-card";
import type {
  GraphEntityConfig,
  HistoryGraphCardConfig,
} from "../../cards/types";
import "../../components/hui-entity-editor";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { processEditorEntities } from "../process-editor-entities";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { graphEntitiesConfigStruct } from "../structs/entities-struct";
import type { EditDetailElementEvent, SubElementEditorConfig } from "../types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entities: array(graphEntitiesConfigStruct),
    title: optional(string()),
    hours_to_show: optional(number()),
    refresh_interval: optional(number()), // deprecated
    show_names: optional(boolean()),
    logarithmic_scale: optional(boolean()),
    min_y_axis: optional(number()),
    max_y_axis: optional(number()),
    fit_y_data: optional(boolean()),
  })
);

@customElement("hui-history-graph-card-editor")
export class HuiHistoryGraphCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HistoryGraphCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: HistoryGraphCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne(
    (showFitOption: boolean) =>
      [
        { name: "title", selector: { text: {} } },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "hours_to_show",
              default: DEFAULT_HOURS_TO_SHOW,
              selector: { number: { min: 0, step: "any", mode: "box" } },
            },
          ],
        },
        {
          name: "logarithmic_scale",
          required: false,
          selector: { boolean: {} },
        },
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "min_y_axis",
              required: false,
              selector: { number: { mode: "box", step: "any" } },
            },
            {
              name: "max_y_axis",
              required: false,
              selector: { number: { mode: "box", step: "any" } },
            },
          ],
        },
        ...(showFitOption
          ? [
              {
                name: "fit_y_data",
                required: false,
                selector: { boolean: {} },
              },
            ]
          : []),
      ] as const
  );

  private _subForm = memoizeOne((localize: LocalizeFunc, entityId: string) => ({
    schema: [
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
        disabled: this._shouldDisableColorOption(entityId),
        selector: { ui_color: {} },
      },
    ] as const,
    computeLabel: (item: HaFormSchema) => {
      switch (item.name) {
        case "color":
          return localize(`ui.panel.lovelace.editor.card.generic.${item.name}`);
        default:
          return undefined;
      }
    },
  }));

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    if (this._subElementEditorConfig) {
      const entityId = (
        this._subElementEditorConfig.elementConfig! as { entity: string }
      ).entity;
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          .form=${this._subForm(this.hass.localize, entityId)}
          @go-back=${this._goBack}
          @config-changed=${this._handleSubEntityChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    const schema = this._schema(
      this._config!.min_y_axis !== undefined ||
        this._config!.max_y_axis !== undefined
    );

    const configEntities = this._config.entities
      ? (processEditorEntities(this._config.entities) as GraphEntityConfig[])
      : [];
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
        .entities=${configEntities}
        can-edit
        @entities-changed=${this._entitiesChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-entity-editor>
    `;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _handleSubEntityChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    // get updated entity config
    let newEntityConfig = ev.detail.config as GraphEntityConfig;
    const entityId = newEntityConfig.entity;
    if (this._shouldDisableColorOption(entityId)) {
      // remove unused "color" option
      newEntityConfig = this._deleteColorOption(newEntityConfig);
    }

    // update card config with updated entity config
    const index = this._subElementEditorConfig!.index!;
    const newEntities = [...this._config!.entities];
    newEntities[index] = newEntityConfig;
    let config = this._config!;
    config = { ...config, entities: newEntities };
    config = this._orderProperties(config);
    this._config = config;

    // update sub-element editor config
    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: {
        ...(this._config!.entities[index] as GraphEntityConfig),
      },
    };

    fireEvent(this, "config-changed", { config });
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = this._orderProperties(ev.detail.value);
    fireEvent(this, "config-changed", { config });
  }

  private _entitiesChanged(ev: CustomEvent): void {
    let config = this._config!;
    config = { ...config, entities: ev.detail.entities };

    config = this._orderProperties(config);
    fireEvent(this, "config-changed", { config });
  }

  // a rough assumption about a numerical entity
  // which may use state-history-chart-line
  // where "color" option may be used
  private _shouldDisableColorOption = (entityId: string) => {
    const domain = computeDomain(entityId);
    const is_number_domain =
      domain === "counter" || domain === "number" || domain === "input_number";
    const stateObj = this.hass!.states[entityId];
    const attributes = stateObj?.attributes;
    return !isNumericFromAttributes(attributes) && !is_number_domain;
  };

  // remove "color" option when needed
  private _deleteColorOption(config: GraphEntityConfig): GraphEntityConfig {
    const { color, ...rest } = config;
    return rest as GraphEntityConfig;
  }

  // normalize a generated yaml code by placing lines in a consistent order
  private _orderProperties(
    config: HistoryGraphCardConfig
  ): HistoryGraphCardConfig {
    const fieldOrderCard = Object.keys(cardConfigStruct.schema);
    const fieldOrderEntity = [
      // ideally should be taken from a schema
      "entity",
      "name",
      "color",
    ];
    // normalize card's options
    let orderedConfig = { ...orderProperties(config, fieldOrderCard) };
    // normalize entities' options
    const entitiesOrderedCfg = config.entities.map(
      (entry: GraphEntityConfig | string) =>
        typeof entry !== "string"
          ? orderProperties(entry, fieldOrderEntity)
          : entry
    );
    // merge normalized config
    orderedConfig = { ...orderedConfig, ...{ entities: entitiesOrderedCfg } };
    return orderedConfig;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "logarithmic_scale":
      case "min_y_axis":
      case "max_y_axis":
      case "fit_y_data":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.history-graph.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  static styles: CSSResultGroup = css`
    ha-form {
      margin-bottom: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-history-graph-card-editor": HuiHistoryGraphCardEditor;
  }
}
