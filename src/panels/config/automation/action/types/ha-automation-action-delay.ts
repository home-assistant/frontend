import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import type { HaDurationData } from "../../../../../components/ha-duration-input";
import "../../../../../components/ha-duration-input";
import type { DelayAction } from "../../../../../data/script";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { HomeAssistant } from "../../../../../types";
import type { ActionElement } from "../ha-automation-action-row";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";

@customElement("ha-automation-action-delay")
export class HaDelayAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: DelayAction;

  @state() private _timeData?: HaDurationData;

  public static get defaultConfig(): DelayAction {
    return { delay: "" };
  }

  public static checkUiSupport(
    localize: LocalizeFunc,
    action: DelayAction
  ): Error | undefined {
    // Check for templates in action. If found, revert to YAML mode.
    if (hasTemplate(action)) {
      return Error(localize("ui.errors.config.no_template_editor_support"));
    }
    return undefined;
  }

  public willUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has("action")) {
      return;
    }
    const err = this.action
      ? HaDelayAction.checkUiSupport(this.hass.localize, this.action)
      : undefined;
    if (err) {
      fireEvent(this, "ui-mode-not-available", err);
      return;
    }

    this._timeData = createDurationData(this.action.delay);
  }

  protected render() {
    return html`<ha-duration-input
      .label=${this.hass.localize(
        `ui.panel.config.automation.editor.actions.type.delay.delay`
      )}
      .disabled=${this.disabled}
      .data=${this._timeData}
      enable-millisecond
      required
      @value-changed=${this._valueChanged}
    ></ha-duration-input>`;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.action, delay: value },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-delay": HaDelayAction;
  }
}
