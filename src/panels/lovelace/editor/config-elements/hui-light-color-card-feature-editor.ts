import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  LightColorCardFeatureConfig,
  LightColorCardFeatureControls,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

const CONTROLS: LightColorCardFeatureControls[] = [
  "hue",
  "saturation",
  "hue_saturation",
];

@customElement("hui-light-color-card-feature-editor")
export class HuiLightColorCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: LightColorCardFeatureConfig;

  public setConfig(config: LightColorCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "controls",
          selector: {
            select: {
              multiple: false,
              mode: "list",
              options: CONTROLS.map((controls) => ({
                value: controls,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.light-color.controls_list.${controls}`
                ),
              })),
            },
          },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data: LightColorCardFeatureConfig = {
      controls: "hue",
      ...this._config,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(this.hass.localize)}
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
      `ui.panel.lovelace.editor.features.types.light-color.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-color-card-feature-editor": HuiLightColorCardFeatureEditor;
  }
}
