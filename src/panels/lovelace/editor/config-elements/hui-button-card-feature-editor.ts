import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../../../types";
import type { ButtonCardFeatureConfig } from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../types";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";

@customElement("hui-button-card-feature-editor")
export class HuiButtonCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: ButtonCardFeatureConfig;

  public setConfig(config: ButtonCardFeatureConfig): void {
    this._config = config;
  }

  private _schema: HaFormSchema[] = [
    {
      name: "action_name",
      selector: {
        text: {},
      },
    },
  ];

  protected render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: ev.detail.value },
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card-feature-editor": HuiButtonCardFeatureEditor;
  }
}

