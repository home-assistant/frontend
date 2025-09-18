import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { HomeAssistant } from "../../../../types";
import type { ButtonCardFeatureConfig } from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

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

  private _schema = memoizeOne((localize: LocalizeFunc) => [
    {
      name: "action_name",
      default: localize("ui.card.button.press"),
      selector: {
        text: {},
      },
    },
    {
      name: "data",
      selector: {
        object: {},
      },
    },
  ]);

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "action_name":
        return this.hass!.localize("ui.common.name");
      case "data":
        return this.hass!.localize(
          "ui.components['service-control'].action_data"
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

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
