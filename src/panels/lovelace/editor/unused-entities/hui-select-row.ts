import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import { Checkbox } from "@material/mwc-checkbox";
import { HomeAssistant } from "../../../../types";
import computeStateName from "../../../../common/entity/compute_state_name";
import computeDomain from "../../../../common/entity/compute_domain";

import "../../../../components/ha-checkbox";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-relative-time";
import "../../../../components/ha-icon";

import { fireEvent } from "../../../../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "entity-selection-changed": EntitySelectionChangedEvent;
  }
}

export interface EntitySelectionChangedEvent {
  entity: string;
  selected: boolean;
}

@customElement("hui-select-row")
class HuiSelectRow extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public entity?: string;

  @property() public selectable = true;

  protected render(): TemplateResult | void {
    if (!this.entity) {
      return html``;
    }

    const stateObj = this.entity ? this.hass.states[this.entity] : undefined;

    if (!stateObj) {
      return html``;
    }

    return html`
      <div class="flex-row" role="rowgroup">
        <div class="flex-cell" role="cell">
          ${this.selectable
            ? html`
                <ha-checkbox @change=${this._handleSelect}></ha-checkbox>
              `
            : ""}
          <state-badge .hass=${this.hass} .stateObj=${stateObj}></state-badge>
          ${computeStateName(stateObj)}
        </div>
        <div class="flex-cell" role="cell">${stateObj.entity_id}</div>
        <div class="flex-cell" role="cell">
          ${computeDomain(stateObj.entity_id)}
        </div>
        <div class="flex-cell" role="cell">
          <ha-relative-time
            .hass=${this.hass}
            .datetime=${stateObj.last_changed}
          ></ha-relative-time>
        </div>
      </div>
    `;
  }

  private _handleSelect(ev: Event): void {
    const checkbox = ev.currentTarget as Checkbox;
    fireEvent(this, "entity-selection-changed", {
      entity: this.entity!,
      selected: checkbox.checked as boolean,
    });
  }

  static get styles(): CSSResult {
    return css`
      div {
        box-sizing: border-box;
      }

      .flex-row {
        display: flex;
        flex-flow: row wrap;
      }

      .flex-row:hover {
        background: var(--table-row-alternative-background-color, #eee);
      }

      .flex-cell {
        width: calc(100% / 4);
        padding: 12px 24px;
        border-bottom: 1px solid #e0e0e0;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 40px;
      }

      @media all and (max-width: 767px) {
        .flex-cell {
          width: calc(100% / 3);
          padding-top: 0;
        }
        .flex-cell:first-child {
          width: 100%;
          padding-top: 12px;
          padding-bottom: 0;
          border-bottom: 0;
        }
      }

      @media all and (max-width: 430px) {
        .flex-cell {
          border-bottom: 0;
          padding: 0 24px;
        }

        .flex-cell:first-child {
          padding-top: 12px;
        }

        .flex-cell:last-child {
          padding-bottom: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .flex-cell {
          width: 100%;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-row": HuiSelectRow;
  }
}
