import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  SelectOptionsTileFeatureConfig,
  LovelaceTileFeatureContext,
} from "../../tile-features/types";
import type { LovelaceTileFeatureEditor } from "../../types";

@customElement("hui-select-options-tile-feature-editor")
export class HuiSelectOptionsTileFeatureEditor
  extends LitElement
  implements LovelaceTileFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceTileFeatureContext;

  @state() private _config?: SelectOptionsTileFeatureConfig;

  public setConfig(config: SelectOptionsTileFeatureConfig): void {
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
              options: ["dropdown", "buttons"].map((mode) => ({
                value: mode,
                label: localize(
                  `ui.panel.lovelace.editor.card.tile.features.types.select-options.style_list.${mode}`
                ),
              })),
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data: SelectOptionsTileFeatureConfig = {
      style: "dropdown",
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
      `ui.panel.lovelace.editor.card.tile.features.types.select-options.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-options-tile-feature-editor": HuiSelectOptionsTileFeatureEditor;
  }
}
