import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { TimeChangedEvent } from "../../../../../components/ha-base-time-input";
import "../../../../../components/ha-duration-input";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-switch";
import type { WaitAction } from "../../../../../data/script";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";
import type { ActionElement } from "../ha-automation-action-row";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

const SCHEMA = [
  {
    name: "wait_template",
    selector: {
      template: {},
    },
  },
] as const;

@customElement("ha-automation-action-wait_template")
export class HaWaitAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: WaitAction;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "sidebar" }) public inSidebar = false;

  public static get defaultConfig(): WaitAction {
    return { wait_template: "", continue_on_timeout: true };
  }

  protected render() {
    const timeData = createDurationData(this.action.timeout);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ wait_template: this.action.wait_template }}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
      <ha-duration-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.wait_template.timeout"
        )}
        .data=${timeData}
        .disabled=${this.disabled}
        enable-millisecond
        @value-changed=${this._timeoutChanged}
      ></ha-duration-input>
      <ha-formfield
        .disabled=${this.disabled}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.wait_template.continue_timeout"
        )}
      >
        <ha-switch
          .checked=${this.action.continue_on_timeout ?? true}
          .disabled=${this.disabled}
          @change=${this._continueChanged}
        ></ha-switch>
      </ha-formfield>
    `;
  }

  private _timeoutChanged(ev: ValueChangedEvent<TimeChangedEvent>): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, timeout: value },
    });
  }

  private _continueChanged(ev) {
    fireEvent(this, "value-changed", {
      value: { ...this.action, continue_on_timeout: ev.target.checked },
    });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.actions.type.wait_template.${schema.name}`
    );

  static styles = css`
    ha-duration-input {
      display: block;
      margin-bottom: 24px;
      margin-top: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-wait_template": HaWaitAction;
  }
}
