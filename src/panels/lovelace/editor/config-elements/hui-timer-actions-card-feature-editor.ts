import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-form/ha-form";
import type { HomeAssistant } from "../../../../types";
import type {
  TimerActionsCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import {
  DEFAULT_TIMER_ACTIONS,
  TIMER_ACTIONS,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import {
  customizableListData,
  customizableListSchema,
  processCustomizableListValue,
} from "./customizable-list-feature";

@customElement("hui-timer-actions-card-feature-editor")
export class HuiTimerActionsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TimerActionsCardFeatureConfig;

  public setConfig(config: TimerActionsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne((localize: LocalizeFunc) =>
    customizableListSchema({
      field: "actions",
      options: TIMER_ACTIONS.map((action) => ({
        value: action,
        label: localize(
          `ui.panel.lovelace.editor.features.types.timer-actions.actions_list.${action}`
        ),
      })),
    })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = customizableListData(this._config, "actions");
    const schema = this._schema(this.hass.localize);

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
    const config = processCustomizableListValue<TimerActionsCardFeatureConfig>(
      ev.detail.value,
      "actions",
      DEFAULT_TIMER_ACTIONS
    );
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.timer-actions.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-actions-card-feature-editor": HuiTimerActionsCardFeatureEditor;
  }
}
