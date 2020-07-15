import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";
import { HistoryGraphCardConfig } from "../../cards/types";
import { struct } from "../../common/structs/struct";
import "../../components/hui-entity-editor";
import { EntityConfig } from "../../entity-rows/types";
import { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { EditorTarget, EntitiesEditorEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const entitiesConfigStruct = struct.union([
  {
    entity: "entity-id",
    name: "string?",
  },
  "entity-id",
]);

const cardConfigStruct = struct({
  type: "string",
  entities: [entitiesConfigStruct],
  title: "string?",
  hours_to_show: "number?",
  refresh_interval: "number?",
});

@customElement("hui-history-graph-card-editor")
export class HuiHistoryGraphCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: HistoryGraphCardConfig;

  @internalProperty() private _configEntities?: EntityConfig[];

  public setConfig(config: HistoryGraphCardConfig): void {
    config = cardConfigStruct(config);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  get _entity(): string {
    return this._config!.entity || "";
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _hours_to_show(): number {
    return this._config!.hours_to_show || 24;
  }

  get _refresh_interval(): number {
    return this._config!.refresh_interval || 0;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.title"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value="${this._title}"
          .configValue="${"title"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <div class="side-by-side">
          <paper-input
            type="number"
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.hours_to_show"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._hours_to_show}"
            .configValue=${"hours_to_show"}
            @value-changed="${this._valueChanged}"
          ></paper-input>
          <paper-input
            type="number"
            .label="${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.refresh_interval"
            )} (${this.hass.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            )})"
            .value="${this._refresh_interval}"
            .configValue=${"refresh_interval"}
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <hui-entity-editor
          .hass=${this.hass}
          .entities="${this._configEntities}"
          @entities-changed="${this._valueChanged}"
        ></hui-entity-editor>
      </div>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (!ev.detail && this[`_${target.configValue}`] === target.value) {
      return;
    }

    if (ev.detail && ev.detail.entities) {
      this._config.entities = ev.detail.entities;
      this._configEntities = processEditorEntities(this._config.entities);
    } else if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue!];
      } else {
        let value: any = target.value;
        if (target.type === "number") {
          value = Number(value);
        }
        this._config = {
          ...this._config,
          [target.configValue!]: value,
        };
      }
    }

    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-history-graph-card-editor": HuiHistoryGraphCardEditor;
  }
}
