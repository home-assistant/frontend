import "../../../../components/ha-form/ha-form";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { PlantStatusCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    theme: optional(string()),
  })
);

const SCHEMA: HaFormSchema[] = [
  { name: "entity", required: true, selector: { entity: { domain: "plant" } } },
  { name: "name", selector: { text: {} } },
  { name: "theme", selector: { theme: {} } },
];

@customElement("hui-plant-status-card-editor")
export class HuiPlantStatusCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PlantStatusCardConfig;

  public setConfig(config: PlantStatusCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
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
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: HaFormSchema) => {
    if (schema.name === "entity") {
      return `${this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.entity"
      )} (${this.hass!.localize(
        "ui.panel.lovelace.editor.card.config.required"
      )})`;
    }

    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-plant-status-card-editor": HuiPlantStatusCardEditor;
  }
}
