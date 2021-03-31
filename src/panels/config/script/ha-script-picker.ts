import "@material/mwc-icon-button";
import {
  mdiHelpCircle,
  mdiInformationOutline,
  mdiPencil,
  mdiPlay,
  mdiPlus,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateIcon } from "../../../common/entity/state_icon";
import { computeRTL } from "../../../common/util/compute_rtl";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-related-filter-menu";
import "../../../components/ha-fab";
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

  @internalProperty() private _filteredScripts?: string[] | null;

  @internalProperty() private _filterValue?;

  private _scripts = memoizeOne(
    (scripts: HassEntity[], filteredScripts?: string[] | null) => {
      return (filteredScripts
        ? scripts.filter((script) =>
            filteredScripts!.includes(script.entity_id)
          )
        : scripts
      ).map((script) => {
        return {
          ...script,
          name: computeStateName(script),
          icon: stateIcon(script),
        };
      });
    }
  );

  private _columns = memoizeOne(
    (_language): DataTableColumnContainer => {
      return {
        activate: {
          title: "",
          type: "icon-button",
          template: (_toggle, script) =>
            html`
              <mwc-icon-button
                .script=${script}
                title="${this.hass.localize(
                  "ui.panel.config.script.picker.run_script"
                )}"
                @click=${(ev: Event) => this._runScript(ev)}
              >
                <ha-svg-icon .path=${mdiPlay}></ha-svg-icon>
              </mwc-icon-button>
            `,
        },
        icon: {
          title: "",
          type: "icon",
          template: (icon) => html` <ha-icon .icon=${icon}></ha-icon> `,
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
                    this.hass.locale
                  )
                : this.hass.localize("ui.components.relative_time.never")}
            </div>
          `,
        },
        info: {
          title: "",
          type: "icon-button",
          template: (_info, script) => html`
            <mwc-icon-button
              .script=${script}
              @click=${this._showInfo}
              title="${this.hass.localize(
                "ui.panel.config.script.picker.show_info"
              )}"
            >
              <ha-svg-icon .path=${mdiInformationOutline}></ha-svg-icon>
            </mwc-icon-button>
          `,
        },
        edit: {
          title: "",
          type: "icon-button",
          template: (_info, script: any) => html`
            <a href="/config/script/edit/${script.entity_id}">
              <mwc-icon-button
                title="${this.hass.localize(
                  "ui.panel.config.script.picker.edit_script"
                )}"
              >
                <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
              </mwc-icon-button>
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
        .data=${this._scripts(this.scripts, this._filteredScripts)}
        .activeFilters=${this._activeFilters}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.script.picker.no_scripts"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
      >
        <mwc-icon-button slot="toolbar-icon" @click=${this._showHelp}>
          <ha-svg-icon .path=${mdiHelpCircle}></ha-svg-icon>
        </mwc-icon-button>
        <ha-button-related-filter-menu
          slot="filter-menu"
          corner="BOTTOM_START"
          .narrow=${this.narrow}
          .hass=${this.hass}
          .value=${this._filterValue}
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
            href="${documentationUrl(this.hass, "/docs/scripts/editor/")}"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.script.picker.learn_more")}
          </a>
        </p>
      `,
    });
  }

  static get styles(): CSSResult[] {
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
