import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { MediaPlayerEntity } from "../../../../data/media-player";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerSourceCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import {
  customizableListData,
  customizableListSchema,
  processCustomizableListValue,
} from "./customizable-list-feature";

@customElement("hui-media-player-source-card-feature-editor")
export class HuiMediaPlayerSourceCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerSourceCardFeatureConfig;

  public setConfig(config: MediaPlayerSourceCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne((stateObj: MediaPlayerEntity | undefined) =>
    customizableListSchema({
      field: "sources",
      options:
        stateObj?.attributes.source_list?.map((source) => ({
          value: source,
          label: this.hass!.formatEntityAttributeValue(
            stateObj,
            "source",
            source
          ),
        })) ?? [],
    })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? (this.hass.states[this.context.entity_id] as
          MediaPlayerEntity | undefined)
      : undefined;

    const data = customizableListData(this._config, "sources");
    const schema = this._schema(stateObj);

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

  private _valueChanged(
    ev: ValueChangedEvent<MediaPlayerSourceCardFeatureConfig>
  ): void {
    const stateObj = this.context?.entity_id
      ? (this.hass!.states[this.context.entity_id] as
          MediaPlayerEntity | undefined)
      : undefined;
    const defaults = stateObj?.attributes.source_list ?? [];
    const config =
      processCustomizableListValue<MediaPlayerSourceCardFeatureConfig>(
        ev.detail.value,
        "sources",
        defaults
      );
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.media-player-source.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-source-card-feature-editor": HuiMediaPlayerSourceCardFeatureEditor;
  }
}
