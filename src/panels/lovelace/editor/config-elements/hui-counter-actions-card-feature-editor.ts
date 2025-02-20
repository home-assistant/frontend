import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-form/ha-form";
import type { HomeAssistant } from "../../../../types";
import {
  COUNTER_ACTIONS,
  type LovelaceCardFeatureContext,
  type CounterActionsCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

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

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "actions",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              reorder: true,
              options: COUNTER_ACTIONS.map((action) => ({
                value: action,
                label: `${localize(
                  `ui.panel.lovelace.editor.features.types.counter-actions.actions.${action}`
                )}`,
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

    const schema = this._schema(this.hass.localize);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-counter-actions-card-feature-editor": HuiCounterActionsCardFeatureEditor;
  }
}
