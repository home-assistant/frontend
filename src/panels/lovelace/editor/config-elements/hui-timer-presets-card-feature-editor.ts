import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  TimerPresetsCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-timer-presets-card-feature-editor")
export class HuiTimerPresetsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TimerPresetsCardFeatureConfig;

  public setConfig(config: TimerPresetsCardFeatureConfig): void {
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
      <ha-alert alert-type="info">
        ${this.hass.localize(
          "ui.panel.lovelace.editor.features.types.timer-presets.description"
        )}
      </ha-alert>
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

  static styles = css`
    ha-form {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-presets-card-feature-editor": HuiTimerPresetsCardFeatureEditor;
  }
}
