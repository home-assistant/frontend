import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeEntityState } from "../../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { FormatEntityAttributeNameFunc } from "../../../../common/translations/entity-state";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-input-helper-text";
import "../../../../components/ha-select";
import "../../../../components/input/ha-input";
import { HIDDEN_STATE_CONTENT_ATTRIBUTES } from "../../../../components/entity/hidden-state-content-attributes";
import {
  internationalizationContext,
  registriesContext,
} from "../../../../data/context";
import type { HaSelectSelectEvent } from "../../../../components/ha-select";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import {
  STATE_DISPLAY_SPECIAL_CONTENT,
  STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS,
} from "../../../../state-display/state-display";
import type { HaInput } from "../../../../components/input/ha-input";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  StateCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

const FONT_SIZE_PRESETS: {
  value: number;
  tokenKey: "s" | "m" | "l" | "xl" | "2xl" | "3xl";
}[] = [
  { value: 12, tokenKey: "s" },
  { value: 14, tokenKey: "m" },
  { value: 16, tokenKey: "l" },
  { value: 20, tokenKey: "xl" },
  { value: 24, tokenKey: "2xl" },
  { value: 28, tokenKey: "3xl" },
];

const DEFAULT_TARGET_FONT_SIZE = 24;
const MIN_TARGET_FONT_SIZE = 12;
const MAX_TARGET_FONT_SIZE = 28;

type FontSizeMode = "preset" | "custom";

@customElement("hui-state-card-feature-editor")
export class HuiStateCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @consume({ context: registriesContext, subscribe: true })
  private _registries?: ContextType<typeof registriesContext>;

  @state() private _config?: StateCardFeatureConfig;

  @state() private _fontSizeMode?: FontSizeMode;

  public setConfig(config: StateCardFeatureConfig): void {
    this._config = config;
    if (this._fontSizeMode === undefined) {
      this._fontSizeMode = this._detectMode(config.target_font_size);
    }
  }

  private _detectMode(size: number | undefined): FontSizeMode {
    if (size === undefined) return "preset";
    return FONT_SIZE_PRESETS.some((preset) => preset.value === size)
      ? "preset"
      : "custom";
  }

  private _getOptions = memoizeOne(
    (
      localize: LocalizeFunc,
      formatEntityAttributeName: FormatEntityAttributeNameFunc,
      stateObj: HassEntity | undefined,
      entityId: string | undefined
    ) => {
      const domain = entityId ? computeDomain(entityId) : undefined;

      const options: { value: string; label: string }[] = [
        {
          value: "state",
          label: localize("ui.components.state-content-picker.state"),
        },
        {
          value: "last_changed",
          label: localize("ui.components.state-content-picker.last_changed"),
        },
        {
          value: "last_updated",
          label: localize("ui.components.state-content-picker.last_updated"),
        },
      ];

      if (stateObj && this._registries) {
        const entityContext = getEntityContext(
          stateObj,
          this._registries.entities,
          this._registries.devices,
          this._registries.areas,
          this._registries.floors
        );
        if (entityContext.device) {
          options.push({
            value: "device_name",
            label: localize("ui.components.state-content-picker.device_name"),
          });
        }
        if (entityContext.area) {
          options.push({
            value: "area_name",
            label: localize("ui.components.state-content-picker.area_name"),
          });
        }
        if (entityContext.floor) {
          options.push({
            value: "floor_name",
            label: localize("ui.components.state-content-picker.floor_name"),
          });
        }
      }

      if (domain) {
        STATE_DISPLAY_SPECIAL_CONTENT.filter((content) =>
          STATE_DISPLAY_SPECIAL_CONTENT_DOMAINS[domain]?.includes(content)
        ).forEach((content) => {
          options.push({
            value: content,
            label: localize(`ui.components.state-content-picker.${content}`),
          });
        });
      }

      if (stateObj) {
        Object.keys(stateObj.attributes)
          .filter((a) => !HIDDEN_STATE_CONTENT_ATTRIBUTES.includes(a))
          .forEach((attribute) => {
            options.push({
              value: attribute,
              label: formatEntityAttributeName(stateObj, attribute),
            });
          });
      }

      return options;
    }
  );

  private _getSchema = memoizeOne(
    (options: { value: string; label: string }[]) =>
      [
        {
          name: "state_content",
          selector: {
            select: {
              mode: "dropdown",
              options,
            },
          },
        },
      ] as const satisfies HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config || !this._i18n) {
      return nothing;
    }

    const options = this._getOptions(
      this._i18n.localize,
      this.hass.formatEntityAttributeName,
      this._stateObj,
      this.context?.entity_id
    );
    const schema = this._getSchema(options);

    // Normalize array to first value for display
    const value = Array.isArray(this._config.state_content)
      ? this._config.state_content[0]
      : this._config.state_content;

    const data = { ...this._config, state_content: value };

    const mode = this._fontSizeMode ?? "preset";
    const targetFontSize = this._config.target_font_size;

    const modeButtons = [
      {
        label: this._i18n.localize(
          "ui.panel.lovelace.editor.features.types.state.target_font_size_mode_preset"
        ),
        value: "preset",
      },
      {
        label: this._i18n.localize(
          "ui.panel.lovelace.editor.features.types.state.target_font_size_mode_custom"
        ),
        value: "custom",
      },
    ];

    const presetValue =
      targetFontSize !== undefined &&
      FONT_SIZE_PRESETS.some((preset) => preset.value === targetFontSize)
        ? String(targetFontSize)
        : String(DEFAULT_TARGET_FONT_SIZE);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <div class="font-size">
        <div class="header">
          <label>
            ${this._i18n.localize(
              "ui.panel.lovelace.editor.features.types.state.target_font_size"
            )}
          </label>
          <ha-button-toggle-group
            size="small"
            .buttons=${modeButtons}
            .active=${mode}
            @value-changed=${this._fontSizeModeChanged}
          ></ha-button-toggle-group>
        </div>
        ${mode === "preset"
          ? html`
              <ha-select
                naturalMenuWidth
                .value=${presetValue}
                .options=${FONT_SIZE_PRESETS.map((preset) => ({
                  value: String(preset.value),
                  label: this._i18n!.localize(
                    `ui.panel.lovelace.editor.features.types.state.target_font_size_presets.${preset.tokenKey}`
                  ),
                }))}
                @closed=${this._stopPropagation}
                @selected=${this._presetChanged}
              ></ha-select>
            `
          : html`
              <ha-input
                type="number"
                min=${String(MIN_TARGET_FONT_SIZE)}
                max=${String(MAX_TARGET_FONT_SIZE)}
                step="1"
                .value=${targetFontSize !== undefined
                  ? String(targetFontSize)
                  : String(DEFAULT_TARGET_FONT_SIZE)}
                @input=${this._customChanged}
              >
                <span slot="end">px</span>
              </ha-input>
            `}
        <ha-input-helper-text>
          ${this._i18n.localize(
            "ui.panel.lovelace.editor.features.types.state.target_font_size_helper"
          )}
        </ha-input-helper-text>
      </div>
    `;
  }

  private _stopPropagation(ev: Event) {
    ev.stopPropagation();
  }

  private _fontSizeModeChanged(ev: ValueChangedEvent<FontSizeMode>) {
    ev.stopPropagation();
    if (!ev.detail.value || ev.detail.value === this._fontSizeMode) {
      return;
    }
    this._fontSizeMode = ev.detail.value;
  }

  private _presetChanged(ev: HaSelectSelectEvent<string | number>) {
    ev.stopPropagation();
    const value = Number(ev.detail.value);
    if (!Number.isFinite(value)) return;
    this._updateTargetFontSize(value);
  }

  private _customChanged(ev: Event) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaInput | null;
    if (!target) {
      return;
    }
    const raw = target.value;
    if (raw === "") {
      this._updateTargetFontSize(undefined);
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    this._updateTargetFontSize(value);
  }

  private _updateTargetFontSize(value: number | undefined) {
    if (!this._config) return;
    const normalizedValue =
      value === undefined
        ? undefined
        : Math.max(MIN_TARGET_FONT_SIZE, Math.min(MAX_TARGET_FONT_SIZE, value));

    const newConfig = { ...this._config };
    if (
      normalizedValue === undefined ||
      normalizedValue === DEFAULT_TARGET_FONT_SIZE
    ) {
      delete newConfig.target_font_size;
    } else {
      newConfig.target_font_size = normalizedValue;
    }
    fireEvent(this, "config-changed", { config: newConfig });
  }

  private _valueChanged(ev: ValueChangedEvent<StateCardFeatureConfig>): void {
    const config = ev.detail.value;
    if (!config.state_content) {
      delete config.state_content;
    }
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._getSchema>>
  ) => {
    switch (schema.name) {
      case "state_content":
        return this._i18n?.localize(
          "ui.panel.lovelace.editor.card.tile.state_content"
        );
      default:
        return "";
    }
  };

  static styles = css`
    .font-size {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
      margin-top: var(--ha-space-4);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    label {
      font-weight: var(--ha-font-weight-medium);
    }
    ha-select,
    ha-input {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-card-feature-editor": HuiStateCardFeatureEditor;
  }
}
