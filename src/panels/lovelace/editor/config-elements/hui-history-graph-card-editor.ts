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
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { HistoryGraphCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import "../hui-sub-element-editor";
import type { EditDetailElementEvent, SubElementEditorConfig } from "../types";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import type { EntityConfig } from "../../entity-rows/types";
import type { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { DEFAULT_HOURS_TO_SHOW } from "../../cards/hui-history-graph-card";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entities: array(entitiesConfigStruct),
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

const SUB_SCHEMA = [
  { name: "entity", selector: { entity: {} }, required: true },
  { name: "name", selector: { text: {} } },
] as const;

@customElement("hui-history-graph-card-editor")
export class HuiHistoryGraphCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HistoryGraphCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  @state() private _configEntities?: EntityConfig[];

  public setConfig(config: HistoryGraphCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
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
          @config-changed=${this._handleSubEntityChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    const schema = this._schema(
      this._config!.min_y_axis !== undefined ||
        this._config!.max_y_axis !== undefined
    );

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
        .entities=${this._configEntities}
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

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _entitiesChanged(ev: CustomEvent): void {
    let config = this._config!;

    config = { ...config, entities: ev.detail.entities };
    this._configEntities = processEditorEntities(config.entities);

    fireEvent(this, "config-changed", { config });
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
