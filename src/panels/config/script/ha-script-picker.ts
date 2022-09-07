import {
  mdiContentDuplicate,
  mdiDelete,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiPlay,
  mdiPlus,
  mdiTransitConnection,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { computeRTL } from "../../../common/util/compute_rtl";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-related-filter-menu";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-svg-icon";
import {
  deleteScript,
  getScriptConfig,
  showScriptEditor,
  triggerScript,
} from "../../../data/script";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { configSections } from "../ha-panel-config";

@customElement("ha-script-picker")
class HaScriptPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scripts!: HassEntity[];

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @property() private _activeFilters?: string[];

  @state() private _filteredScripts?: string[] | null;

  @state() private _filterValue?;

  private _scripts = memoizeOne(
    (scripts: HassEntity[], filteredScripts?: string[] | null) => {
      if (filteredScripts === null) {
        return [];
      }
      return (
        filteredScripts
          ? scripts.filter((script) =>
              filteredScripts!.includes(script.entity_id)
            )
          : scripts
      ).map((script) => ({
        ...script,
        name: computeStateName(script),
        last_triggered: script.attributes.last_triggered || undefined,
      }));
    }
  );

  private _columns = memoizeOne((narrow, _locale): DataTableColumnContainer => {
    const columns: DataTableColumnContainer = {
      icon: {
        title: "",
        label: this.hass.localize(
          "ui.panel.config.script.picker.headers.state"
        ),
        type: "icon",
        template: (_icon, script) =>
          html` <ha-state-icon .state=${script}></ha-state-icon>`,
      },
      name: {
        title: this.hass.localize("ui.panel.config.script.picker.headers.name"),
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        template: narrow
          ? (name, script: any) => html`
              ${name}
              <div class="secondary">
                ${this.hass.localize("ui.card.automation.last_triggered")}:
                ${script.attributes.last_triggered
                  ? formatDateTime(
                      new Date(script.attributes.last_triggered),
                      this.hass.locale
                    )
                  : this.hass.localize("ui.components.relative_time.never")}
              </div>
            `
          : undefined,
      },
    };
    if (!narrow) {
      columns.last_triggered = {
        sortable: true,
        width: "40%",
        title: this.hass.localize("ui.card.automation.last_triggered"),
        template: (last_triggered) => html`
          ${last_triggered
            ? formatDateTime(new Date(last_triggered), this.hass.locale)
            : this.hass.localize("ui.components.relative_time.never")}
        `,
      };
    }

    columns.actions = {
      title: "",
      width: this.narrow ? undefined : "10%",
      type: "overflow-menu",
      template: (_: string, script: any) =>
        html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
              {
                path: mdiInformationOutline,
                label: this.hass.localize(
                  "ui.panel.config.script.picker.show_info"
                ),
                action: () => this._showInfo(script),
              },
              {
                path: mdiPlay,
                label: this.hass.localize("ui.panel.config.script.picker.run"),
                action: () => this._runScript(script),
              },
              {
                path: mdiTransitConnection,
                label: this.hass.localize(
                  "ui.panel.config.script.picker.show_trace"
                ),
                action: () => this._showTrace(script),
              },
              {
                divider: true,
              },
              {
                path: mdiContentDuplicate,
                label: this.hass.localize(
                  "ui.panel.config.script.picker.duplicate"
                ),
                action: () => this._duplicate(script),
              },
              {
                label: this.hass.localize(
                  "ui.panel.config.script.picker.delete"
                ),
                path: mdiDelete,
                action: () => this._deleteConfirm(script),
                warning: true,
              },
            ]}
          >
          </ha-icon-overflow-menu>
        `,
    };

    return columns;
  });

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automations}
        .columns=${this._columns(this.narrow, this.hass.locale)}
        .data=${this._scripts(this.scripts, this._filteredScripts)}
        .activeFilters=${this._activeFilters}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.script.picker.no_scripts"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
        clickable
        @row-click=${this._handleRowClicked}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
          @click=${this._showHelp}
        ></ha-icon-button>
        <ha-button-related-filter-menu
          slot="filter-menu"
          corner="BOTTOM_START"
          .narrow=${this.narrow}
          .hass=${this.hass}
          .value=${this._filterValue}
          exclude-domains='["script"]'
          @related-changed=${this._relatedFilterChanged}
        >
        </ha-button-related-filter-menu>
        <a href="/config/script/edit/new" slot="fab">
          <ha-fab
            ?is-wide=${this.isWide}
            ?narrow=${this.narrow}
            .label=${this.hass.localize(
              "ui.panel.config.script.picker.add_script"
            )}
            extended
            ?rtl=${computeRTL(this.hass)}
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _relatedFilterChanged(ev: CustomEvent) {
    this._filterValue = ev.detail.value;
    if (!this._filterValue) {
      this._clearFilter();
      return;
    }
    this._activeFilters = [ev.detail.filter];
    this._filteredScripts = ev.detail.items.script || null;
  }

  private _clearFilter() {
    this._filteredScripts = undefined;
    this._activeFilters = undefined;
    this._filterValue = undefined;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    navigate(`/config/script/edit/${ev.detail.id}`);
  }

  private _runScript = async (script: any) => {
    await triggerScript(this.hass, script.entity_id);
    showToast(this, {
      message: this.hass.localize(
        "ui.notification_toast.triggered",
        "name",
        computeStateName(script)
      ),
    });
  };

  private _showInfo(script: any) {
    fireEvent(this, "hass-more-info", { entityId: script.entity_id });
  }

  private _showTrace(script: any) {
    navigate(`/config/script/trace/${script.entity_id}`);
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.script.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.script.picker.introduction")}
        <p>
          <a
            href=${documentationUrl(this.hass, "/docs/scripts/")}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.script.picker.learn_more")}
          </a>
        </p>
      `,
    });
  }

  private async _duplicate(script: any) {
    try {
      const config = await getScriptConfig(
        this.hass,
        computeObjectId(script.entity_id)
      );
      showScriptEditor({
        ...config,
        alias: `${config?.alias} (${this.hass.localize(
          "ui.panel.config.script.picker.duplicate"
        )})`,
      });
    } catch (err: any) {
      await showAlertDialog(this, {
        text:
          err.status_code === 404
            ? this.hass.localize(
                "ui.panel.config.script.editor.load_error_not_duplicable"
              )
            : this.hass.localize(
                "ui.panel.config.script.editor.load_error_unknown",
                "err_no",
                err.status_code
              ),
      });
    }
  }

  private async _deleteConfirm(script: any) {
    showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.script.editor.delete_confirm"),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(script),
    });
  }

  private async _delete(script: any) {
    try {
      await deleteScript(this.hass, computeObjectId(script.entity_id));
    } catch (err: any) {
      await showAlertDialog(this, {
        text:
          err.status_code === 400
            ? this.hass.localize(
                "ui.panel.config.script.editor.load_error_not_deletable"
              )
            : this.hass.localize(
                "ui.panel.config.script.editor.load_error_unknown",
                "err_no",
                err.status_code
              ),
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        a {
          text-decoration: none;
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
