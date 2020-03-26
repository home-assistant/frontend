import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  property,
  customElement,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-tooltip/paper-tooltip";
import "../../../layouts/hass-tabs-subpage";

import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/entity/ha-entity-toggle";

import "../ha-config-section";

import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTL } from "../../../common/util/compute_rtl";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import {
  AutomationEntity,
  showAutomationEditor,
  AutomationConfig,
  triggerAutomation,
} from "../../../data/automation";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { showThingtalkDialog } from "./show-dialog-thingtalk";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { configSections } from "../ha-panel-config";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import memoizeOne from "memoize-one";
import { navigate } from "../../../common/navigate";

@customElement("ha-automation-picker")
class HaAutomationPicker extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() public automations!: AutomationEntity[];

  private _automations = memoizeOne((automations: AutomationEntity[]) => {
    return automations.map((automation) => {
      return {
        ...automation,
        name: computeStateName(automation),
      };
    });
  });

  private _columns = memoizeOne(
    (narrow: boolean, _language): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        toggle: {
          title: "",
          type: "icon",
          template: (_toggle, automation) =>
            html`
              <ha-entity-toggle
                .hass=${this.hass}
                .stateObj=${automation}
              ></ha-entity-toggle>
            `,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.picker.headers.title"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: (name, automation: any) => html`
            ${name}
            <div class="secondary">
              ${this.hass.localize("ui.card.automation.last_triggered")}:
              ${automation.attributes.last_triggered
                ? formatDateTime(
                    new Date(automation.attributes.last_triggered),
                    this.hass.language
                  )
                : this.hass.localize("ui.components.relative_time.never")}
            </div>
          `,
        },
      };
      if (!narrow) {
        columns.excecute = {
          title: "",
          template: (_info, automation) => html`
            <mwc-button .automation=${automation} @click=${this._excecute}>
              ${this.hass.localize("ui.card.automation.trigger")}
            </mwc-button>
          `,
        };
      }
      columns.info = {
        title: "",
        template: (_info, automation) => html`
          <paper-icon-button
            .automation=${automation}
            @click=${this._showInfo}
            icon="hass:information-outline"
            title="${this.hass.localize(
              "ui.panel.config.automation.picker.show_info_automation"
            )}"
          ></paper-icon-button>
        `,
      };
      return columns;
    }
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automation}
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._automations(this.automations)}
        id="entity_id"
        @row-click=${this._editAutomation}
      >
      </hass-tabs-subpage-data-table>
      <ha-fab
        slot="fab"
        ?is-wide=${this.isWide}
        ?narrow=${this.narrow}
        icon="hass:plus"
        title=${this.hass.localize(
          "ui.panel.config.automation.picker.add_automation"
        )}
        ?rtl=${computeRTL(this.hass)}
        @click=${this._createNew}
      ></ha-fab>
    `;
  }

  private _showInfo(ev) {
    ev.stopPropagation();
    const entityId = ev.currentTarget.automation.entity_id;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _excecute(ev) {
    const entityId = ev.currentTarget.automation.entity_id;
    triggerAutomation(this.hass, entityId);
  }

  private _editAutomation(ev: HASSDomEvent<RowClickedEvent>) {
    const entityId = ev.detail.id;
    const state = this.hass.states[entityId];
    if (state?.attributes.id) {
      navigate(this, `/config/automation/edit/${state.attributes.id}`);
    }
  }

  private _createNew() {
    if (!isComponentLoaded(this.hass, "cloud")) {
      showAutomationEditor(this);
      return;
    }
    showThingtalkDialog(this, {
      callback: (config: Partial<AutomationConfig> | undefined) =>
        showAutomationEditor(this, config),
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        ha-card {
          margin-bottom: 56px;
        }

        .automation {
          display: flex;
          flex-direction: horizontal;
          align-items: center;
          padding: 0 8px 0 16px;
        }

        .automation a[href] {
          color: var(--primary-text-color);
        }

        ha-entity-toggle {
          margin-right: 16px;
        }

        .actions {
          display: flex;
        }

        ha-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
          cursor: pointer;
        }

        ha-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        ha-fab[narrow] {
          bottom: 84px;
        }
        ha-fab[rtl] {
          right: auto;
          left: 16px;
        }

        ha-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }

        a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-picker": HaAutomationPicker;
  }
}
