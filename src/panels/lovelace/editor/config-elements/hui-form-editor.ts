import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceGenericElementEditor } from "../../types";
import { configElementStyle } from "./config-elements-style";

@customElement("hui-form-editor")
export class HuiFormEditor
  extends LitElement
  implements LovelaceGenericElementEditor
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public schema!: HaFormSchema[];

  @state() private _config?: LovelaceCardConfig;

  public assertConfig(_config: LovelaceCardConfig): void {
    return undefined;
  }

  public setConfig(config: LovelaceCardConfig): void {
    this.assertConfig(config);
    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this.schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  public computeLabel = (
    _schema: HaFormSchema,
    _localize: LocalizeFunc
  ): string | undefined => undefined;

  public computeHelper = (
    _schema: HaFormSchema,
    _localize: LocalizeFunc
  ): string | undefined => undefined;

  private _computeLabelCallback = (schema: HaFormSchema) =>
    this.computeLabel(schema, this.hass.localize) ||
    this.hass.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    ) ||
    capitalizeFirstLetter(schema.name.split("_").join(" "));

  private _computeHelperCallback = (schema: HaFormSchema) =>
    this.computeHelper(schema, this.hass.localize);

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    fireEvent(this, "config-changed", { config });
  }

  static styles: CSSResultGroup = configElementStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-form-editor": HuiFormEditor;
  }
}
