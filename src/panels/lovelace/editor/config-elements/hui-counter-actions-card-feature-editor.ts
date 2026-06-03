import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-form/ha-form";
import type { HomeAssistant } from "../../../../types";
import type {
  CounterActionsCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import { COUNTER_ACTIONS } from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import {
  customizableListData,
  customizableListSchema,
  processCustomizableListValue,
} from "./customizable-list-feature";

@customElement("hui-counter-actions-card-feature-editor")
export class HuiCounterActionsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: CounterActionsCardFeatureConfig;

  public setConfig(config: CounterActionsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne((customize: boolean) =>
    customizableListSchema({
      field: "actions",
      customize,
      options: COUNTER_ACTIONS.map((action) => ({
        value: action,
        label: this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.counter-actions.actions_list.${action}`
        ),
      })),
    })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = customizableListData(this._config, "actions");
    const schema = this._schema(data.customize);

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
    const config =
      processCustomizableListValue<CounterActionsCardFeatureConfig>(
        ev.detail.value,
        "actions",
        COUNTER_ACTIONS
      );
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.counter-actions.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-counter-actions-card-feature-editor": HuiCounterActionsCardFeatureEditor;
  }
}
