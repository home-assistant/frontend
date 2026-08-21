import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { AlarmMode } from "../../../../data/alarm_control_panel";
import { supportedAlarmModes } from "../../../../data/alarm_control_panel";
import type { HomeAssistant } from "../../../../types";
import { normalizeAlarmModeItem } from "../../card-features/common/filter-modes";
import type {
  AlarmModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

type AlarmModesCardFeatureData = AlarmModesCardFeatureConfig & {
  customize_modes: boolean;
};

@customElement("hui-alarm-modes-card-feature-editor")
export class HuiAlarmModesCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: AlarmModesCardFeatureConfig;

  public setConfig(config: AlarmModesCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, stateObj: HassEntity | undefined) =>
      [
        {
          name: "customize_modes",
          selector: {
            boolean: {},
          },
        },
        {
          name: "modes",
          visible: { field: "customize_modes", value: true },
          selector: {
            select: {
              multiple: true,
              reorder: true,
              options: stateObj
                ? supportedAlarmModes(stateObj).map((mode) => ({
                    value: mode,
                    label: `${localize(
                      `ui.panel.lovelace.editor.features.types.alarm-modes.modes_list.${mode}`
                    )}`,
                  }))
                : [],
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data: AlarmModesCardFeatureData = {
      ...this._formData(this._config),
      customize_modes: this._config.modes !== undefined,
    };

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context?.entity_id]
      : undefined;

    const schema = this._schema(this.hass.localize, stateObj);

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

  /*
   * The `modes` select-multiple can only represent plain mode strings, so
   * the advanced `{ mode, icon }` form (YAML-only) is flattened to strings
   * for display. There is deliberately no per-mode icon picker in the
   * visual editor yet — the goal here is only to make the existing picker
   * non-destructive for configs that use icon overrides.
   */
  private _formData = memoizeOne(
    (config: AlarmModesCardFeatureConfig): AlarmModesCardFeatureConfig =>
      config.modes?.some((item) => typeof item !== "string")
        ? {
            ...config,
            modes: config.modes.map(
              (item) => normalizeAlarmModeItem(item).mode
            ),
          }
        : config
  );

  private _valueChanged(ev: CustomEvent): void {
    const { customize_modes, ...config } = ev.detail
      .value as AlarmModesCardFeatureData;

    const stateObj = this.context?.entity_id
      ? this.hass!.states[this.context?.entity_id]
      : undefined;

    if (customize_modes && !config.modes) {
      config.modes = stateObj ? supportedAlarmModes(stateObj).reverse() : [];
    }
    if (!customize_modes && config.modes) {
      delete config.modes;
    }

    // Re-attach the icon overrides that `_formData` stripped, so editing
    // any field (or toggling modes) doesn't silently drop them.
    const icons = new Map<AlarmMode, string>();
    for (const item of this._config?.modes ?? []) {
      const { mode, icon } = normalizeAlarmModeItem(item);
      if (icon != null) {
        icons.set(mode, icon);
      }
    }

    if (icons.size === 0 || !config.modes) {
      fireEvent(this, "config-changed", { config });
      return;
    }

    const modes = config.modes.map((item) => {
      const { mode } = normalizeAlarmModeItem(item);
      const icon = icons.get(mode);
      return icon != null ? { mode, icon } : item;
    });

    fireEvent(this, "config-changed", { config: { ...config, modes } });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "modes":
      case "customize_modes":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.alarm-modes.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-alarm-modes-card-feature-editor": HuiAlarmModesCardFeatureEditor;
  }
}
