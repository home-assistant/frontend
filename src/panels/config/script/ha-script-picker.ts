import {
  mdiHelpCircle,
  mdiHistory,
  mdiInformationOutline,
  mdiPencil,
  mdiPlay,
  mdiPlus,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTL } from "../../../common/util/compute_rtl";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-related-filter-menu";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { triggerScript } from "../../../data/script";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
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
      activate: {
        title: "",
        type: "icon-button",
        template: (_toggle, script) =>
          html`
            <ha-icon-button
              .script=${script}
              .label=${this.hass.localize(
                "ui.panel.config.script.picker.run_script"
              )}
              @click=${this._runScript}
              .path=${mdiPlay}
            ></ha-icon-button>
          `,
      },
      icon: {
        title: "",
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
        width: "20%",
        title: this.hass.localize("ui.card.automation.last_triggered"),
        template: (last_triggered) => html`
          ${last_triggered
            ? formatDateTime(new Date(last_triggered), this.hass.locale)
            : this.hass.localize("ui.components.relative_time.never")}
        `,
      };
    }
    columns.info = {
      title: "",
      type: "icon-button",
      template: (_info, script) => html`
        <ha-icon-button
          .script=${script}
          @click=${this._showInfo}
          .label=${this.hass.localize(
            "ui.panel.config.script.picker.show_info"
          )}
          .path=${mdiInformationOutline}
        ></ha-icon-button>
      `,
    };
    columns.trace = {
      title: "",
      type: "icon-button",
      template: (_info, script: any) => html`
        <a href="/config/script/trace/${script.entity_id}">
          <ha-icon-button
            .label=${this.hass.localize(
              "ui.panel.config.script.picker.dev_script"
            )}
            .path=${mdiHistory}
          ></ha-icon-button>
        </a>
      `,
    };
    columns.edit = {
      title: "",
      type: "icon-button",
      template: (_info, script: any) => html`
        <a href="/config/script/edit/${script.entity_id}">
          <ha-icon-button
            .label=${this.hass.localize(
              "ui.panel.config.script.picker.edit_script"
            )}
            .path=${mdiPencil}
          ></ha-icon-button>
        </a>
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
        .tabs=${configSections.automation}
        .columns=${this._columns(this.narrow, this.hass.locale)}
        .data=${this._scripts(this.scripts, this._filteredScripts)}
        .activeFilters=${this._activeFilters}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.script.picker.no_scripts"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
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

  private _runScript = async (ev) => {
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
  };

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
            href=${documentationUrl(this.hass, "/docs/scripts/editor/")}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.script.picker.learn_more")}
          </a>
        </p>
      `,
    });
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
