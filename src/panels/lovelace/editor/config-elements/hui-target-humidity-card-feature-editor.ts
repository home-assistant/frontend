import { html, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  TargetHumidityCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";

@customElement("hui-target-humidity-card-feature-editor")
export class HuiTargetHumidityCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TargetHumidityCardFeatureConfig;

  public setConfig(config: TargetHumidityCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, showStep: boolean) =>
      [
        {
          name: "style",
          selector: {
            select: {
              multiple: false,
              mode: "list",
              options: ["slider", "buttons"].map((mode) => ({
                value: mode,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.target-humidity.style_list.${mode}`
                ),
              })),
            },
          },
        },
        ...(showStep
          ? ([
              {
                name: "step",
                selector: {
                  number: {
                    min: 1,
                    max: 25,
                    step: 1,
                    mode: "box",
                  },
                },
              },
            ] as const)
          : []),
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data: TargetHumidityCardFeatureConfig = {
      style: "slider",
      ...this._config,
    };

    const schema = this._schema(this.hass.localize, data.style === "buttons");

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
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
      `ui.panel.lovelace.editor.features.types.target-humidity.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-target-humidity-card-feature-editor": HuiTargetHumidityCardFeatureEditor;
  }
}
