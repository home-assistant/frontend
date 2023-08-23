import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import {
  LovelaceTileFeatureContext,
  CoverPositionTileFeatureConfig,
} from "../../tile-features/types";
import type { LovelaceTileFeatureEditor } from "../../types";

@customElement("hui-cover-position-tile-feature-editor")
export class HuiCoverPositionTileFeatureEditor
  extends LitElement
  implements LovelaceTileFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceTileFeatureContext;

  @state() private _config?: CoverPositionTileFeatureConfig;

  public setConfig(config: CoverPositionTileFeatureConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = [
      {
        name: "inverted_direction",
        selector: {
          boolean: {
            mode: "toggle",
            value: false,
          },
        },
      },
    ];

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

  private _computeLabelCallback = (schema: any) => {
    switch (schema.name) {
      case "inverted_direction":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.features.types.cover-position.inverted_direction`
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
    "hui-cover-position-tile-feature-editor": HuiCoverPositionTileFeatureEditor;
  }
}
