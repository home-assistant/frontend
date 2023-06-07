import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceGenericElementEditor } from "../../types";
import { configElementStyle } from "./config-elements-style";

@customElement("hui-generic-editor")
export class HuiGenericEditor
  extends LitElement
  implements LovelaceGenericElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public schema!: HaFormSchema[];

  @property({ attribute: false }) public translationKey?: string;

  @state() private _config?: LovelaceCardConfig;

  public assertConfig(_config: LovelaceCardConfig): void {
    return undefined;
  }

  public setConfig(config: LovelaceCardConfig): void {
    this.assertConfig(config);
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
        .schema=${this.schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabelCallback = (schema: HaFormSchema) =>
    (this.translationKey &&
      this.hass?.localize(
        `ui.panel.lovelace.editor.card.${this.translationKey}.${schema.name}`
      )) ||
    this.hass?.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    ) ||
    capitalizeFirstLetter(schema.name.split("_").join(" "));

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    fireEvent(this, "config-changed", { config });
  }

  static styles: CSSResultGroup = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-generic-editor": HuiGenericEditor;
  }
}
