import { repeat } from "lit/directives/repeat";
import { mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import "@material/mwc-button";
import type { ActionDetail } from "@material/mwc-list";
import memoizeOne from "memoize-one";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-button-menu";
import { Action } from "../../../../data/script";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-action-row";
import type HaAutomationActionRow from "./ha-automation-action-row";
import "./types/ha-automation-action-activate_scene";
import "./types/ha-automation-action-choose";
import "./types/ha-automation-action-condition";
import "./types/ha-automation-action-delay";
import "./types/ha-automation-action-device_id";
import "./types/ha-automation-action-event";
import "./types/ha-automation-action-if";
import "./types/ha-automation-action-parallel";
import "./types/ha-automation-action-play_media";
import "./types/ha-automation-action-repeat";
import "./types/ha-automation-action-service";
import "./types/ha-automation-action-stop";
import "./types/ha-automation-action-wait_for_trigger";
import "./types/ha-automation-action-wait_template";
import { ACTION_TYPES } from "../../../../data/action";
import { stringCompare } from "../../../../common/string/compare";
import { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaSelect } from "../../../../components/ha-select";

@customElement("ha-automation-action")
export default class HaAutomationAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public actions!: Action[];

  private _focusLastActionOnChange = false;

  private _actionKeys = new WeakMap<Action, string>();

  protected render() {
    return html`
      ${repeat(
        this.actions,
        (action) => this._getKey(action),
        (action, idx) => html`
          <ha-automation-action-row
            .index=${idx}
            .totalActions=${this.actions.length}
            .action=${action}
            .narrow=${this.narrow}
            @duplicate=${this._duplicateAction}
            @move-action=${this._move}
            @value-changed=${this._actionChanged}
            .hass=${this.hass}
          ></ha-automation-action-row>
        `
      )}
      <ha-button-menu fixed @action=${this._addAction}>
        <mwc-button
          slot="trigger"
          outlined
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.actions.add"
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

    if (changedProps.has("actions") && this._focusLastActionOnChange) {
      this._focusLastActionOnChange = false;

      const row = this.shadowRoot!.querySelector<HaAutomationActionRow>(
        "ha-automation-action-row:last-of-type"
      )!;
      row.expand();
      row.scrollIntoView();
      row.focus();
    }
  }

  private _getKey(action: Action) {
    if (!this._actionKeys.has(action)) {
      this._actionKeys.set(action, Math.random().toString());
    }

    return this._actionKeys.get(action)!;
  }

  private _addAction(ev: CustomEvent<ActionDetail>) {
    const action = (ev.currentTarget as HaSelect).items[ev.detail.index].value;
    const elClass = customElements.get(
      `ha-automation-action-${action}`
    ) as CustomElementConstructor & { defaultConfig: Action };

    const actions = this.actions.concat({
      ...elClass.defaultConfig,
    });
    this._focusLastActionOnChange = true;
    fireEvent(this, "value-changed", { value: actions });
  }

  private _move(ev: CustomEvent) {
    // Prevent possible parent action-row from also moving
    ev.stopPropagation();

    const index = (ev.target as any).index;
    const newIndex = ev.detail.direction === "up" ? index - 1 : index + 1;
    const actions = this.actions.concat();
    const action = actions.splice(index, 1)[0];
    actions.splice(newIndex, 0, action);
    fireEvent(this, "value-changed", { value: actions });
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const actions = [...this.actions];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      actions.splice(index, 1);
    } else {
      // Store key on new value.
      const key = this._getKey(actions[index]);
      this._actionKeys.set(newValue, key);

      actions[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: actions });
  }

  private _duplicateAction(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.actions.concat(deepClone(this.actions[index])),
    });
  }

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string, string][] =>
      Object.entries(ACTION_TYPES)
        .map(
          ([action, icon]) =>
            [
              action,
              localize(
                `ui.panel.config.automation.editor.actions.type.${action}.label`
              ),
              icon,
            ] as [string, string, string]
        )
        .sort((a, b) => stringCompare(a[1], b[1]))
  );

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-action-row {
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
    "ha-automation-action": HaAutomationAction;
  }
}
