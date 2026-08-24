import { mdiDeleteOutline, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isNumericState } from "../../../../common/number/format_number";
import "../../../../components/entity/ha-entity-state-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";
import type { HomeAssistant } from "../../../../types";
import type { EntityStateIconsViewParams } from "./show-view-entity-state-icons";

interface IconRule {
  key: string;
  icon: string;
}

@customElement("ha-more-info-view-entity-state-icons")
export class HaMoreInfoViewEntityStateIcons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params!: EntityStateIconsViewParams;

  @state() private _rules: IconRule[] = [];

  @state() private _defaultIcon = "";

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (!changedProperties.has("params") || !this.params) {
      return;
    }

    const icons = this._numeric
      ? this.params.rangeIcons
      : this.params.stateIcons;
    this._rules = Object.entries(icons || {})
      .sort(([a], [b]) => (this._numeric ? Number(a) - Number(b) : 0))
      .map(([key, icon]) => ({ key, icon }));
    this._defaultIcon = this.params.defaultIcon;
  }

  private get _numeric(): boolean {
    const stateObj = this.hass.states[this.params.entityId];
    return stateObj ? isNumericState(stateObj) : false;
  }

  private _emitChange() {
    const icons: Record<string, string> = {};
    for (const rule of this._rules) {
      if (!rule.icon || rule.key === "") {
        continue;
      }
      if (this._numeric) {
        const threshold = Number(rule.key);
        if (!Number.isFinite(threshold)) {
          continue;
        }
        icons[String(threshold)] = rule.icon;
      } else {
        icons[rule.key] = rule.icon;
      }
    }
    const value = Object.keys(icons).length ? icons : null;

    this.params.onChange({
      stateIcons: this._numeric ? null : value,
      rangeIcons: this._numeric ? value : null,
      defaultIcon: this._defaultIcon,
    });
  }

  private _addRule() {
    this._rules = [...this._rules, { key: "", icon: "" }];
  }

  private _removeRule(ev: Event) {
    const index = (ev.currentTarget as HTMLElement & { index: number }).index;
    this._rules = this._rules.filter((_, i) => i !== index);
    this._emitChange();
  }

  private _updateRule(index: number, rule: Partial<IconRule>) {
    this._rules = this._rules.map((current, i) =>
      i === index ? { ...current, ...rule } : current
    );
    this._emitChange();
  }

  private _thresholdChanged(ev: Event) {
    const target = ev.currentTarget as HTMLInputElement & { index: number };
    this._updateRule(target.index, { key: target.value });
  }

  private _ruleStateChanged(ev: CustomEvent) {
    const target = ev.currentTarget as HTMLElement & { index: number };
    this._updateRule(target.index, { key: ev.detail.value || "" });
  }

  private _ruleIconChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement & { index: number };
    this._updateRule(target.index, { icon: ev.detail.value || "" });
  }

  private _defaultIconChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._defaultIcon = ev.detail.value || "";
    this._emitChange();
  }

  private _renderRule(rule: IconRule, index: number) {
    const stateObj = this.hass.states[this.params.entityId];
    const usedStates = this._rules
      .filter((_, i) => i !== index)
      .map((r) => r.key);

    return html`
      <div class="rule">
        ${
          this._numeric
            ? html`
                <ha-input
                  inset-label
                  type="number"
                  .index=${index}
                  .value=${rule.key}
                  .label=${this.hass.localize(
                    "ui.dialogs.entity_state_icons.from"
                  )}
                  @input=${this._thresholdChanged}
                >
                  ${
                    stateObj?.attributes.unit_of_measurement
                      ? html`<span slot="end"
                          >${stateObj.attributes.unit_of_measurement}</span
                        >`
                      : nothing
                  }
                </ha-input>
              `
            : html`
                <ha-entity-state-picker
                  .hass=${this.hass}
                  .index=${index}
                  .entityId=${this.params.entityId}
                  .value=${rule.key}
                  .label=${this.hass.localize(
                    "ui.dialogs.entity_state_icons.state"
                  )}
                  .hideStates=${usedStates}
                  allow-custom-value
                  @value-changed=${this._ruleStateChanged}
                ></ha-entity-state-picker>
              `
        }
        <ha-icon-picker
          .index=${index}
          .value=${rule.icon}
          .label=${this.hass.localize("ui.dialogs.entity_state_icons.icon")}
          @value-changed=${this._ruleIconChanged}
        ></ha-icon-picker>
        <ha-icon-button
          .index=${index}
          .path=${mdiDeleteOutline}
          .label=${this.hass.localize("ui.common.remove")}
          @click=${this._removeRule}
        ></ha-icon-button>
      </div>
    `;
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`
      <div class="content">
        <p class="description">
          ${this.hass.localize(
            this._numeric
              ? "ui.dialogs.entity_state_icons.description_range"
              : "ui.dialogs.entity_state_icons.description_state"
          )}
        </p>
        ${this._rules.map((rule, index) => this._renderRule(rule, index))}
        <ha-button
          class="add"
          appearance="plain"
          size="s"
          @click=${this._addRule}
        >
          <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
          ${this.hass.localize(
            this._numeric
              ? "ui.dialogs.entity_state_icons.add_range"
              : "ui.dialogs.entity_state_icons.add_state"
          )}
        </ha-button>
        <ha-icon-picker
          class="default-icon"
          .value=${this._defaultIcon}
          .label=${this.hass.localize(
            "ui.dialogs.entity_state_icons.default_icon"
          )}
          .helper=${this.hass.localize(
            "ui.dialogs.entity_state_icons.default_icon_helper"
          )}
          .placeholder=${this.params.placeholderIcon}
          @value-changed=${this._defaultIconChanged}
        ></ha-icon-picker>
      </div>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    .content {
      display: flex;
      flex-direction: column;
      padding: 0 var(--ha-space-6) var(--ha-space-6);
    }

    .description {
      margin: 0 0 var(--ha-space-4);
      color: var(--secondary-text-color);
    }

    .rule {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      margin-bottom: var(--ha-space-2);
    }

    .rule > ha-input,
    .rule > ha-entity-state-picker,
    .rule > ha-icon-picker {
      flex: 1;
      min-width: 0;
    }

    .add {
      align-self: flex-start;
    }

    .default-icon {
      display: block;
      margin-top: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-entity-state-icons": HaMoreInfoViewEntityStateIcons;
  }
}
