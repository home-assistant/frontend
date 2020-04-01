import "@polymer/paper-icon-button/paper-icon-button";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTL } from "../../../common/util/compute_rtl";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import { triggerScript } from "../../../data/script";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import { configSections } from "../ha-panel-config";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";

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
          template: (_info, script: any) => html`
            <a href="/config/script/edit/${script.entity_id}">
              <paper-icon-button
                icon="hass:pencil"
                title="${this.hass.localize(
                  "ui.panel.config.script.picker.edit_script"
                )}"
              ></paper-icon-button>
            </a>
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
      >
        <paper-icon-button
          slot="toolbar-icon"
          icon="hass:help-circle"
          @click=${this._showHelp}
        ></paper-icon-button>
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

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.script.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.script.picker.introduction")}
        <p>
          <a
            href="https://home-assistant.io/docs/scripts/editor/"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.script.picker.learn_more")}
          </a>
        </p>
      `,
    });
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
