import "../../../../components/ha-form/ha-form";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  array,
  assert,
  number,
  object,
  optional,
  string,
  assign,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import type { HistoryGraphCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import type { EntityConfig } from "../../entity-rows/types";
import type { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { HaFormSchema } from "../../../../components/ha-form/types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entities: array(entitiesConfigStruct),
    title: optional(string()),
    hours_to_show: optional(number()),
    refresh_interval: optional(number()),
  })
);

const SCHEMA: HaFormSchema[] = [
  { name: "title", selector: { text: {} } },
  {
    name: "",
    type: "grid",
    schema: [
      { name: "hours_to_show", selector: { text: { type: "number" } } },
      { name: "refresh_interval", selector: { text: { type: "number" } } },
    ],
  },
];

@customElement("hui-history-graph-card-editor")
export class HuiHistoryGraphCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HistoryGraphCardConfig;

  @state() private _configEntities?: EntityConfig[];

  public setConfig(config: HistoryGraphCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-entity-editor
        .hass=${this.hass}
        .entities=${this._configEntities}
        @entities-changed=${this._valueChanged}
      ></hui-entity-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    let config = ev.detail.value || this._config!;

    if (ev.detail && ev.detail.entities) {
      config = { ...config, entities: ev.detail.entities };
      this._configEntities = processEditorEntities(config.entities);
    }

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: HaFormSchema) =>
    this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);

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
