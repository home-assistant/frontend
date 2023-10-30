import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  MediaControlsTileFeatureConfig,
  LovelaceTileFeatureContext,
} from "../../tile-features/types";
import type { LovelaceTileFeatureEditor } from "../../types";
import { MEDIA_CONTROLS } from "../../tile-features/hui-media-controls-tile-feature";

@customElement("hui-media-controls-tile-feature-editor")
export class HuiMediaControlsTileFeatureEditor
  extends LitElement
  implements LovelaceTileFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceTileFeatureContext;

  @state() private _config?: MediaControlsTileFeatureConfig;

  public setConfig(config: MediaControlsTileFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "controls",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options: MEDIA_CONTROLS.map((control) => ({
                value: control,
                label: this.hass!.localize(
                  `ui.panel.lovelace.editor.card.tile.features.types.media-controls.control.${control}`
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
  ) => {
    switch (schema.name) {
      case "controls":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.features.types.media-controls.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-controls-tile-feature-editor": HuiMediaControlsTileFeatureEditor;
  }
}
