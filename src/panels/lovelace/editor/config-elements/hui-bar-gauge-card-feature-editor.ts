import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  BarGaugeCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-bar-gauge-card-feature-editor")
export class HuiBarGaugeCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: BarGaugeCardFeatureConfig;

  public setConfig(config: BarGaugeCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "min",
          default: 0,
          selector: {
            number: {
              mode: "box",
            },
          },
        },
        {
          name: "max",
          default: 100,
          selector: {
            number: {
              mode: "box",
            },
          },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema();

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.bar-gauge.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-bar-gauge-card-feature-editor": HuiBarGaugeCardFeatureEditor;
  }
}
