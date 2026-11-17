import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { FanEntity, FanSpeedStyle } from "../../../../data/fan";
import {
  computeFanSpeeds,
  resolveFanSpeedStyle,
  supportsFanSpeedStyleChoice,
} from "../../../../data/fan";
import type { ValueChangedEvent } from "../../../../types";
import type {
  FanSpeedCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

// Speed buttons are a row of segments, not the numeric input stepper.
const FAN_SPEED_STYLE_IMAGES: Record<FanSpeedStyle, string> = {
  buttons: "segments",
  slider: "slider",
};

@customElement("hui-fan-speed-card-feature-editor")
export class HuiFanSpeedCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: FanEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state() private _config?: FanSpeedCardFeatureConfig;

  public setConfig(config: FanSpeedCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, disabled: boolean) =>
      [
        {
          name: "style",
          disabled,
          selector: {
            select: {
              multiple: false,
              mode: "box",
              options: (["buttons", "slider"] as const).map((mode) => ({
                value: mode,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.fan-speed.style_list.${mode}`
                ),
                description: localize(
                  `ui.panel.lovelace.editor.features.types.fan-speed.style_list.${mode}_description`
                ),
                image: {
                  src: `/static/images/form/feature_style_${FAN_SPEED_STYLE_IMAGES[mode]}.svg`,
                  src_dark: `/static/images/form/feature_style_${FAN_SPEED_STYLE_IMAGES[mode]}_dark.svg`,
                  flip_rtl: true,
                },
              })),
            },
          },
        },
      ] as const
  );

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const stateObj = this._stateObj;

    const disabled = !!stateObj && !supportsFanSpeedStyleChoice(stateObj);

    const tooManySpeeds = !!stateObj && !computeFanSpeeds(stateObj);

    const data: FanSpeedCardFeatureConfig = {
      ...this._config,
      style: stateObj
        ? resolveFanSpeedStyle(stateObj, this._config.style)
        : (this._config.style ?? "buttons"),
    };

    return html`
      ${
        tooManySpeeds
          ? html`
              <ha-alert alert-type="info">
                ${this._localize(
                  "ui.panel.lovelace.editor.features.types.fan-speed.style_unavailable"
                )}
              </ha-alert>
            `
          : nothing
      }
      <ha-form
        .data=${data}
        .schema=${this._schema(this._localize, disabled)}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<FanSpeedCardFeatureConfig>) {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this._localize(
      `ui.panel.lovelace.editor.features.types.fan-speed.${schema.name}`
    );

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    schema.disabled
      ? undefined
      : this._localize(
          `ui.panel.lovelace.editor.features.types.fan-speed.${schema.name}_helper`
        );

  static styles = css`
    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-fan-speed-card-feature-editor": HuiFanSpeedCardFeatureEditor;
  }
}
