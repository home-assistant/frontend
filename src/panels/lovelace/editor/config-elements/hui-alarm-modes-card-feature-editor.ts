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
import { supportedAlarmModes } from "../../../../data/alarm_control_panel";
import type { HomeAssistant } from "../../../../types";
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
    (
      localize: LocalizeFunc,
      stateObj: HassEntity | undefined,
      customizeModes: boolean
    ) =>
      [
        {
          name: "customize_modes",
          selector: {
            boolean: {},
          },
        },
        ...(customizeModes
          ? ([
              {
                name: "modes",
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
            ] as const satisfies readonly HaFormSchema[])
          : []),
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data: AlarmModesCardFeatureData = {
      ...this._config,
      customize_modes: this._config.modes !== undefined,
    };

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context?.entity_id]
      : undefined;

    const schema = this._schema(
      this.hass.localize,
      stateObj,
      data.customize_modes
    );

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

    fireEvent(this, "config-changed", { config: config });
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
