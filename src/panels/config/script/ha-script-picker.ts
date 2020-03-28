import {
  LitElement,
  html,
  CSSResultArray,
  css,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import { HassEntity } from "home-assistant-js-websocket";

import "../../../layouts/hass-tabs-subpage";

import { computeRTL } from "../../../common/util/compute_rtl";

import "../../../components/ha-card";
import "../../../components/ha-fab";

import "../ha-config-section";

import { computeStateName } from "../../../common/entity/compute_state_name";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { triggerScript } from "../../../data/script";
import { showToast } from "../../../util/toast";
import { configSections } from "../ha-panel-config";
import { navigate } from "../../../common/navigate";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import {
  RowClickedEvent,
  DataTableColumnContainer,
} from "../../../components/data-table/ha-data-table";
import memoizeOne from "memoize-one";
import { formatDateTime } from "../../../common/datetime/format_date_time";

@customElement("ha-script-picker")
class HaScriptPicker extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public scripts!: HassEntity[];
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;

  private _scripts = memoizeOne((scripts: HassEntity[]) => {
    return scripts.map((script) => {
      return {
        ...script,
        name: computeStateName(script),
      };
    });
  });

  private _columns = memoizeOne(
    (_language): DataTableColumnContainer => {
      return {
        activate: {
          title: "",
          type: "icon-button",
          template: (_toggle, script) =>
            html`
              <paper-icon-button
                .script=${script}
                icon="hass:play"
                title="${this.hass.localize(
                  "ui.panel.config.script.picker.activate_script"
                )}"
                @click=${(ev: Event) => this._runScript(ev)}
              ></paper-icon-button>
            `,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.script.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: (name, script: any) => html`
            ${name}
            <div class="secondary">
              ${this.hass.localize("ui.card.automation.last_triggered")}:
              ${script.attributes.last_triggered
                ? formatDateTime(
                    new Date(script.attributes.last_triggered),
                    this.hass.language
                  )
                : this.hass.localize("ui.components.relative_time.never")}
            </div>
          `,
        },
        info: {
          title: "",
          type: "icon-button",
          template: (_info, script) => html`
            <paper-icon-button
              .script=${script}
              @click=${this._showInfo}
              icon="hass:information-outline"
              title="${this.hass.localize(
                "ui.panel.config.script.picker.show_info"
              )}"
            ></paper-icon-button>
          `,
        },
        edit: {
          title: "",
          type: "icon-button",
          template: (_info) => html`
            <paper-icon-button
              icon="hass:pencil"
              title="${this.hass.localize(
                "ui.panel.config.script.picker.edit_script"
              )}"
            ></paper-icon-button>
          `,
        },
      };
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
        .columns=${this._columns(this.hass.language)}
        .data=${this._scripts(this.scripts)}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.script.picker.no_scripts"
        )}
        @row-click=${this._editScript}
      >
      </hass-tabs-subpage-data-table>
      <a href="/config/script/new">
        <ha-fab
          ?is-wide=${this.isWide}
          ?narrow=${this.narrow}
          icon="hass:plus"
          title="${this.hass.localize(
            "ui.panel.config.script.picker.add_script"
          )}"
          ?rtl=${computeRTL(this.hass)}
        ></ha-fab>
      </a>
    `;
  }

  private async _runScript(ev) {
    ev.stopPropagation();
    const script = ev.currentTarget.script as HassEntity;
    await triggerScript(this.hass, script.entity_id);
    showToast(this, {
      message: this.hass.localize(
        "ui.notification_toast.triggered",
        "name",
        computeStateName(script)
      ),
    });
  }

  private _showInfo(ev) {
    ev.stopPropagation();
    const entityId = ev.currentTarget.script.entity_id;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _editScript(ev: HASSDomEvent<RowClickedEvent>) {
    const entityId = ev.detail.id;
    const state = this.hass.states[entityId];
    navigate(this, `/config/script/edit/${state.entity_id}`);
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        ha-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-picker": HaScriptPicker;
  }
}
