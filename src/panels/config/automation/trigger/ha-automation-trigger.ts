import { repeat } from "lit/directives/repeat";
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

  private _triggerKeys = new WeakMap<Trigger, string>();

  protected render() {
    return html`
      ${repeat(
        this.triggers,
        (trigger) => this._getKey(trigger),
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
          ([opt, label, icon]) => html`
            <mwc-list-item .value=${opt} aria-label=${label} graphic="icon">
              ${label}<ha-svg-icon slot="graphic" .path=${icon}></ha-svg-icon
            ></mwc-list-item>
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
      row.updateComplete.then(() => {
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  private _getKey(action: Trigger) {
    if (!this._triggerKeys.has(action)) {
      this._triggerKeys.set(action, Math.random().toString());
    }

    return this._triggerKeys.get(action)!;
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
      // Store key on new value.
      const key = this._getKey(triggers[index]);
      this._triggerKeys.set(newValue, key);

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
    (localize: LocalizeFunc): [string, string, string][] =>
      Object.entries(TRIGGER_TYPES)
        .map(
          ([action, icon]) =>
            [
              action,
              localize(
                `ui.panel.config.automation.editor.triggers.type.${action}.label`
              ),
              icon,
            ] as [string, string, string]
        )
        .sort((a, b) => stringCompare(a[1], b[1]))
  );

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-trigger-row {
        display: block;
        margin-bottom: 16px;
        scroll-margin-top: 48px;
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
