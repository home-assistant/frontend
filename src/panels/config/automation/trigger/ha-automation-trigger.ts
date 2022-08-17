import { mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import memoizeOne from "memoize-one";
import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import type { ActionDetail } from "@material/mwc-list";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-button-menu";
import { Trigger } from "../../../../data/automation";
import { TRIGGER_TYPES } from "../../../../data/trigger";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-trigger-row";
import type HaAutomationTriggerRow from "./ha-automation-trigger-row";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { stringCompare } from "../../../../common/string/compare";
import type { HaSelect } from "../../../../components/ha-select";
import "./types/ha-automation-trigger-calendar";
import "./types/ha-automation-trigger-device";
import "./types/ha-automation-trigger-event";
import "./types/ha-automation-trigger-geo_location";
import "./types/ha-automation-trigger-homeassistant";
import "./types/ha-automation-trigger-mqtt";
import "./types/ha-automation-trigger-numeric_state";
import "./types/ha-automation-trigger-state";
import "./types/ha-automation-trigger-sun";
import "./types/ha-automation-trigger-tag";
import "./types/ha-automation-trigger-template";
import "./types/ha-automation-trigger-time";
import "./types/ha-automation-trigger-time_pattern";
import "./types/ha-automation-trigger-webhook";
import "./types/ha-automation-trigger-zone";

@customElement("ha-automation-trigger")
export default class HaAutomationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public triggers!: Trigger[];

  private _focusLastTriggerOnChange = false;

  protected render() {
    return html`
      ${this.triggers.map(
        (trg, idx) => html`
          <ha-automation-trigger-row
            .index=${idx}
            .trigger=${trg}
            @duplicate=${this._duplicateTrigger}
            @value-changed=${this._triggerChanged}
            .hass=${this.hass}
          ></ha-automation-trigger-row>
        `
      )}
      <ha-button-menu @action=${this._addTrigger}>
        <mwc-button
          slot="trigger"
          outlined
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.add"
          )}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </mwc-button>
        ${this._processedTypes(this.hass.localize).map(
          ([opt, label]) => html`
            <mwc-list-item .value=${opt}>${label}</mwc-list-item>
          `
        )}
      </ha-button-menu>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("triggers") && this._focusLastTriggerOnChange) {
      this._focusLastTriggerOnChange = false;

      const row = this.shadowRoot!.querySelector<HaAutomationTriggerRow>(
        "ha-automation-trigger-row:last-of-type"
      )!;
      row.expand();
      row.focus();
    }
  }

  private _addTrigger(ev: CustomEvent<ActionDetail>) {
    const platform = (ev.currentTarget as HaSelect).items[ev.detail.index]
      .value as Trigger["platform"];

    const elClass = customElements.get(
      `ha-automation-trigger-${platform}`
    ) as CustomElementConstructor & {
      defaultConfig: Omit<Trigger, "platform">;
    };

    const triggers = this.triggers.concat({
      platform: platform as any,
      ...elClass.defaultConfig,
    });
    this._focusLastTriggerOnChange = true;
    fireEvent(this, "value-changed", { value: triggers });
  }

  private _triggerChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const triggers = [...this.triggers];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      triggers.splice(index, 1);
    } else {
      triggers[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: triggers });
  }

  private _duplicateTrigger(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.triggers.concat(deepClone(this.triggers[index])),
    });
  }

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string][] =>
      TRIGGER_TYPES.map(
        (action) =>
          [
            action,
            localize(
              `ui.panel.config.automation.editor.triggers.type.${action}.label`
            ),
          ] as [string, string]
      ).sort((a, b) => stringCompare(a[1], b[1]))
  );

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-trigger-row {
        display: block;
        margin-bottom: 16px;
      }
      ha-svg-icon {
        height: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger": HaAutomationTrigger;
  }
}
