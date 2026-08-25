import { mdiDelete, mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { createDurationData } from "../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { uid } from "../../../../common/util/uid";
import "../../../../components/ha-button";
import "../../../../components/ha-duration-input";
import type { HaDurationData } from "../../../../components/ha-duration-input";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import {
  durationDataToTimerString,
  normalizeTimerDuration,
} from "../../../../data/timer";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  TimerPresetsCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

const NEW_PRESET = "0:05:00";

@customElement("hui-timer-presets-card-feature-editor")
export class HuiTimerPresetsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TimerPresetsCardFeatureConfig;

  // Stable key per row so rows keep their DOM (and input focus) while other
  // rows are added, removed, or dragged. Presets are plain strings, so keys
  // are tracked in a parallel array, mirroring ha-input-multi.
  @state() private _keys: string[] = [];

  public setConfig(config: TimerPresetsCardFeatureConfig): void {
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("_config")) {
      const length = this._config?.presets?.length ?? 0;
      if (this._keys.length !== length) {
        this._keys = Array.from(
          { length },
          (_, index) => this._keys[index] ?? uid()
        );
      }
    }
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
              options: ["buttons", "dropdown"].map((mode) => ({
                value: mode,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.timer-presets.style_list.${mode}`
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

    const presets = this._config.presets ?? [];

    const data: TimerPresetsCardFeatureConfig = {
      style: "buttons",
      ...this._config,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._formChanged}
      ></ha-form>
      <ha-sortable
        handle-selector=".handle"
        draggable-selector=".preset"
        @item-moved=${this._presetMoved}
      >
        <div class="presets">
          ${repeat(
            presets,
            (_preset, index) => this._keys[index],
            (preset, index) => html`
              <div class="preset">
                <ha-svg-icon
                  class="handle"
                  .path=${mdiDragHorizontalVariant}
                ></ha-svg-icon>
                <ha-duration-input
                  .data=${this._presetDurationData(preset)}
                  .index=${index}
                  required
                  @value-changed=${this._presetChanged}
                ></ha-duration-input>
                <ha-icon-button
                  .path=${mdiDelete}
                  .index=${index}
                  .label=${this.hass!.localize("ui.common.remove")}
                  @click=${this._removePreset}
                ></ha-icon-button>
              </div>
            `
          )}
        </div>
      </ha-sortable>
      <ha-button appearance="plain" @click=${this._addPreset}>
        <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
        ${this.hass.localize("ui.common.add")}
      </ha-button>
    `;
  }

  private _formChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.timer-presets.${schema.name}`
    );

  // Normalize before binding so numeric presets ({seconds: 3600}) show as
  // 1:00:00 instead of overflowing the seconds field, where the input's
  // carry-over logic would corrupt the value on the next edit.
  private _presetDurationData(
    preset: string | number
  ): HaDurationData | undefined {
    const durationData = createDurationData(preset);
    return durationData ? normalizeTimerDuration(durationData) : undefined;
  }

  private _presetChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const index = (ev.currentTarget as any).index as number;
    const value = ev.detail.value as HaDurationData | undefined;
    const presets = [...(this._config!.presets ?? [])];
    presets[index] = durationDataToTimerString(value ?? {});
    this._updatePresets(presets);
  }

  private _presetMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const presets = [...(this._config!.presets ?? [])];
    const [moved] = presets.splice(oldIndex, 1);
    presets.splice(newIndex, 0, moved);
    // Move the row's key with it so its DOM identity is preserved.
    const keys = [...this._keys];
    const [movedKey] = keys.splice(oldIndex, 1);
    keys.splice(newIndex, 0, movedKey);
    this._keys = keys;
    this._updatePresets(presets);
  }

  private _removePreset(ev: Event): void {
    const index = (ev.currentTarget as any).index as number;
    this._keys = this._keys.filter((_, i) => i !== index);
    const presets = [...(this._config!.presets ?? [])];
    presets.splice(index, 1);
    this._updatePresets(presets);
  }

  private _addPreset(): void {
    this._keys = [...this._keys, uid()];
    this._updatePresets([...(this._config!.presets ?? []), NEW_PRESET]);
  }

  private _updatePresets(presets: (string | number)[]): void {
    fireEvent(this, "config-changed", {
      config: { ...this._config!, presets },
    });
  }

  static styles = css`
    ha-form {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
    .preset {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      margin-bottom: var(--ha-space-2);
    }
    .preset ha-duration-input {
      flex: 1;
    }
    .handle {
      cursor: grab;
      padding: var(--ha-space-2);
      margin: calc(var(--ha-space-2) * -1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-presets-card-feature-editor": HuiTimerPresetsCardFeatureEditor;
  }
}
