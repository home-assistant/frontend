import memoize from "memoize-one";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { computeStateName } from "../../../../common/entity/compute_state_name";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import { fireEvent } from "../../../../common/dom/fire_event";

import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import type {
  DataTableRowData,
  SelectionChangedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/data-table/ha-data-table";

import "../../../../components/entity/state-badge";

@customElement("hui-entity-picker")
export class HuiEntityPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <ha-data-table
          auto-height
          selectable
          .id=${"entity_id"}
          .columns=${this._columns()}
          .data=${this._allEntities(this.hass).map((entity) => {
            const stateObj = this.hass.states[entity];
            return {
              icon: "",
              entity_id: entity,
              stateObj,
              name: computeStateName(stateObj),
              domain: computeDomain(entity),
              last_changed: stateObj!.last_changed,
            };
          }) as DataTableRowData[]}
          .dir=${computeRTLDirection(this.hass)}
          .searchLabel=${this.hass.localize(
            "ui.panel.lovelace.unused_entities.search"
          )}
          @selection-changed=${this._handleSelectionChanged}
        ></ha-data-table>
      </div>
    `;
  }

  private _columns() {
    return {
      icon: {
        title: "",
        type: "icon",
        template: (_icon, entity: any) => html`
          <state-badge
            .hass=${this.hass}
            .stateObj=${entity.stateObj}
          ></state-badge>
        `,
      },
      name: {
        title: this.hass!.localize(
          "ui.panel.lovelace.editor.cardpicker.entity"
        ),
        sortable: true,
        filterable: true,
        grows: true,
        direction: "asc",
        template: (name, entity: any) => html`
          <div style="cursor: pointer;">
            ${name}
            <div class="secondary">
              ${entity.stateObj.entity_id}
            </div>
          </div>
        `,
      },
      domain: {
        title: this.hass!.localize(
          "ui.panel.lovelace.editor.cardpicker.domain"
        ),
        sortable: true,
        filterable: true,
        width: "25%",
      },
    };
  }

  private _allEntities = memoize((hass) => Object.keys(hass.states));

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    const selectedEntities = ev.detail.value;

    fireEvent(this, "selected-changed", { selectedEntities });
  }

  static get styles(): CSSResult {
    return css`
      ha-data-table {
        --data-table-border-width: 0;
        flex-grow: 1;
        margin-top: -20px;
      }

      .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: calc(100vh - 112px);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-picker": HuiEntityPicker;
  }
}
