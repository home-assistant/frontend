import "@material/mwc-icon-button/mwc-icon-button";
import { mdiCheck } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { ComboBoxLitRenderer } from "lit-vaadin-helpers";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateName } from "../../common/entity/compute_state_name";
import { compare } from "../../common/string/compare";
import { getStatisticIds, StatisticsMetaData } from "../../data/history";
import { PolymerChangedEvent } from "../../polymer-types";
import { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-svg-icon";
import "./state-badge";

@customElement("ha-statistic-picker")
export class HaStatisticPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property({ attribute: "statistic-types" })
  public statisticTypes?: "mean" | "sum";

  @property({ type: Array }) public statisticIds?: StatisticsMetaData[];

  @property({ type: Boolean }) public disabled?: boolean;

  /**
   * Show only statistics with these unit of measuments.
   * @type {Array}
   * @attr include-unit-of-measurement
   */
  @property({ type: Array, attribute: "include-unit-of-measurement" })
  public includeUnitOfMeasurement?: string[];

  /**
   * Show only statistics on entities.
   * @type {Boolean}
   * @attr entities-only
   */
  @property({ type: Boolean, attribute: "entities-only" })
  public entitiesOnly = false;

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _init = false;

  private _rowRenderer: ComboBoxLitRenderer<{
    id: string;
    name: string;
    state?: HassEntity;
  }> = (item) => html`<style>
      paper-icon-item {
        padding: 0;
        margin: -8px;
      }
      #content {
        display: flex;
        align-items: center;
      }
      ha-svg-icon {
        padding-left: 2px;
        color: var(--secondary-text-color);
      }
      :host(:not([selected])) ha-svg-icon {
        display: none;
      }
      :host([selected]) paper-icon-item {
        margin-left: 0;
      }
      a {
        color: var(--primary-color);
      }
    </style>
    <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
    <paper-icon-item>
      <state-badge slot="item-icon" .stateObj=${item.state}></state-badge>
      <paper-item-body two-line="">
        ${item.name}
        <span secondary
          >${item.id === "" || item.id === "__missing"
            ? html`<a
                target="_blank"
                rel="noopener noreferrer"
                href="${documentationUrl(this.hass, "/more-info/statistics/")}"
                >${this.hass.localize(
                  "ui.components.statistic-picker.learn_more"
                )}</a
              >`
            : item.id}</span
        >
      </paper-item-body>
    </paper-icon-item>`;

  private _getStatistics = memoizeOne(
    (
      statisticIds: StatisticsMetaData[],
      includeUnitOfMeasurement?: string[],
      entitiesOnly?: boolean
    ): Array<{ id: string; name: string; state?: HassEntity }> => {
      if (!statisticIds.length) {
        return [
          {
            id: "",
            name: this.hass.localize(
              "ui.components.statistic-picker.no_statistics"
            ),
          },
        ];
      }

      if (includeUnitOfMeasurement) {
        statisticIds = statisticIds.filter((meta) =>
          includeUnitOfMeasurement.includes(meta.unit_of_measurement)
        );
      }

      const output: Array<{
        id: string;
        name: string;
        state?: HassEntity;
      }> = [];
      statisticIds.forEach((meta) => {
        const entityState = this.hass.states[meta.statistic_id];
        if (!entityState) {
          if (!entitiesOnly) {
            output.push({ id: meta.statistic_id, name: meta.statistic_id });
          }
          return;
        }
        output.push({
          id: meta.statistic_id,
          name: computeStateName(entityState),
          state: entityState,
        });
      });

      if (!output.length) {
        return [
          {
            id: "",
            name: this.hass.localize("ui.components.statistic-picker.no_match"),
          },
        ];
      }

      if (output.length > 1) {
        output.sort((a, b) => compare(a.name || "", b.name || ""));
      }

      output.push({
        id: "__missing",
        name: this.hass.localize(
          "ui.components.statistic-picker.missing_entity"
        ),
      });

      return output;
    }
  );

  public open() {
    this.comboBox?.open();
  }

  public focus() {
    this.comboBox?.focus();
  }

  public willUpdate(changedProps: PropertyValues) {
    if (
      (!this.hasUpdated && !this.statisticIds) ||
      changedProps.has("statisticTypes")
    ) {
      this._getStatisticIds();
    }
    if (
      (!this._init && this.statisticIds) ||
      (changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      if (this.hasUpdated) {
        (this.comboBox as any).items = this._getStatistics(
          this.statisticIds!,
          this.includeUnitOfMeasurement,
          this.entitiesOnly
        );
      } else {
        this.updateComplete.then(() => {
          (this.comboBox as any).items = this._getStatistics(
            this.statisticIds!,
            this.includeUnitOfMeasurement,
            this.entitiesOnly
          );
        });
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.statistic-picker.statistic")
          : this.label}
        .value=${this._value}
        .renderer=${this._rowRenderer}
        .disabled=${this.disabled}
        item-value-path="id"
        item-id-path="id"
        item-label-path="name"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._statisticChanged}
      ></ha-combo-box>
    `;
  }

  private async _getStatisticIds() {
    this.statisticIds = await getStatisticIds(this.hass, this.statisticTypes);
  }

  private get _value() {
    return this.value || "";
  }

  private _statisticChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;
    if (newValue === "__missing") {
      newValue = "";
    }

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResultGroup {
    return css`
      paper-input > mwc-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
      [hidden] {
        display: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-statistic-picker": HaStatisticPicker;
  }
}
