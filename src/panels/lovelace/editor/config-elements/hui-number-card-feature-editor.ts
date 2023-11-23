import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  NumberCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import { LocalizeFunc } from "../../../../common/translations/localize";

@customElement("hui-number-card-feature-editor")
export class HuiNumberCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: NumberCardFeatureConfig;

  public setConfig(config: NumberCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
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
                  `ui.panel.lovelace.editor.card.tile.features.types.number.style_list.${mode}`
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

    const data: NumberCardFeatureConfig = {
      style: "buttons",
      ...this._config,
    };

    const schema = this._schema(this.hass.localize);

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
      `ui.panel.lovelace.editor.card.tile.features.types.number.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-number-card-feature-editor": HuiNumberCardFeatureEditor;
  }
}
