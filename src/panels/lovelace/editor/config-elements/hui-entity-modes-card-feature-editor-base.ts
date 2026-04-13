import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

export interface EntityModesCardFeatureEditorDescriptor<
  TConfig extends LovelaceCardFeatureConfig,
> {
  /** Matches `config.type` from the parent feature; used to narrow `setConfig` without assertions. */
  featureType: TConfig["type"];
  /** Used for `ui.panel.lovelace.editor.features.types.<id>.*` label keys. */
  i18nFeatureId: string;
  /**
   * Optional override for style list keys only (defaults to `i18nFeatureId`).
   * climate-hvac-modes intentionally uses climate-preset-modes for style_list.
   */
  styleListI18nFeatureId?: string;
  /** Config key for the reorderable multiselect (for example `fan_modes`). */
  modeField: keyof TConfig & string;
  defaultStyle: "dropdown" | "icons";
  /** Modes shown in the multiselect and used when enabling customize without a prior selection. */
  getAvailableModesOrdered: (stateObj: HassEntity | undefined) => string[];
  getModeLabel: (
    hass: HomeAssistant,
    stateObj: HassEntity | undefined,
    mode: string
  ) => string;
}

type EntityModesFormData<TConfig extends LovelaceCardFeatureConfig> =
  TConfig & {
    customize_modes: boolean;
  };

function stripCustomizeModes<TConfig extends LovelaceCardFeatureConfig>(
  value: EntityModesFormData<TConfig>
): TConfig {
  const { customize_modes: _customizeModes, ...config } = value;
  return config as LovelaceCardFeatureConfig as TConfig;
}

export abstract class HuiEntityModesCardFeatureEditorBase<
  TConfig extends LovelaceCardFeatureConfig,
>
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  protected abstract readonly descriptor: EntityModesCardFeatureEditorDescriptor<TConfig>;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TConfig;

  public setConfig(config: LovelaceCardFeatureConfig): void {
    if (config.type !== this.descriptor.featureType) {
      return;
    }
    this._config = config as TConfig;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      hass: HomeAssistant,
      stateObj: HassEntity | undefined,
      customizeModes: boolean
    ) => {
      const d = this.descriptor;
      const styleListId = d.styleListI18nFeatureId ?? d.i18nFeatureId;
      return [
        {
          name: "style",
          selector: {
            select: {
              multiple: false,
              mode: "list",
              options: ["dropdown", "icons"].map((mode) => ({
                value: mode,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.${styleListId}.style_list.${mode}`
                ),
              })),
            },
          },
        },
        {
          name: "customize_modes",
          selector: {
            boolean: {},
          },
        },
        ...(customizeModes
          ? ([
              {
                name: d.modeField,
                selector: {
                  select: {
                    reorder: true,
                    multiple: true,
                    options: d
                      .getAvailableModesOrdered(stateObj)
                      .map((mode) => ({
                        value: mode,
                        label: d.getModeLabel(hass, stateObj, mode),
                      })),
                  },
                },
              },
            ] as const satisfies readonly HaFormSchema[])
          : []),
      ] as const satisfies readonly HaFormSchema[];
    }
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context.entity_id]
      : undefined;

    const { modeField, defaultStyle } = this.descriptor;

    const data: EntityModesFormData<TConfig> = {
      style: defaultStyle,
      ...this._config,
      customize_modes: this._config[modeField as keyof TConfig] !== undefined,
    };

    const schema = this._schema(
      this.hass.localize,
      this.hass,
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
    const value = ev.detail.value as EntityModesFormData<TConfig>;
    const customize_modes = value.customize_modes;
    let cfg = stripCustomizeModes(value);

    const stateObj = this.context?.entity_id
      ? this.hass!.states[this.context.entity_id]
      : undefined;

    const { modeField, getAvailableModesOrdered } = this.descriptor;
    const modeKey = modeField as keyof TConfig;

    if (customize_modes && !cfg[modeKey]) {
      cfg = {
        ...cfg,
        [modeField]: getAvailableModesOrdered(stateObj),
      } as TConfig;
    }
    if (!customize_modes && cfg[modeKey] !== undefined) {
      delete cfg[modeKey];
    }

    fireEvent(this, "config-changed", { config: cfg });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    const id = this.descriptor.i18nFeatureId;
    const { modeField } = this.descriptor;
    if (
      schema.name === "style" ||
      schema.name === "customize_modes" ||
      schema.name === modeField
    ) {
      return this.hass!.localize(
        `ui.panel.lovelace.editor.features.types.${id}.${schema.name}`
      );
    }
    return "";
  };
}
