import { mdiHelpCircle, mdiInformationOutline, mdiPlus } from "@mdi/js";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { relativeTime } from "../../../common/datetime/relative_time";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-related-filter-menu";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import type { AutomationEntity } from "../../../data/automation";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { configSections } from "../ha-panel-config";
import { showNewAutomationDialog } from "./show-dialog-new-automation";

@customElement("ha-automation-picker")
class HaAutomationPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public route!: Route;

  @property() public automations!: AutomationEntity[];

  @property() private _activeFilters?: string[];

  @state() private _filteredAutomations?: string[] | null;

  @state() private _filterValue?;

  private _automations = memoizeOne(
    (
      automations: AutomationEntity[],
      filteredAutomations?: string[] | null
    ) => {
      if (filteredAutomations === null) {
        return [];
      }
      return (
        filteredAutomations
          ? automations.filter((automation) =>
              filteredAutomations!.includes(automation.entity_id)
            )
          : automations
      ).map((automation) => ({
        ...automation,
        name: computeStateName(automation),
        last_triggered: automation.attributes.last_triggered || undefined,
      }));
    }
  );

  private _columns = memoizeOne(
    (narrow: boolean, _locale): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        name: {
          title: this.hass.localize(
            "ui.panel.config.automation.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: narrow
            ? (name, automation: any) =>
                html`
                  ${name}
                  <div class="secondary">
                    ${this.hass.localize("ui.card.automation.last_triggered")}:
                    ${automation.attributes.last_triggered
                      ? relativeTime(
                          new Date(automation.attributes.last_triggered),
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
              ? relativeTime(new Date(last_triggered), this.hass.locale)
              : this.hass.localize("ui.components.relative_time.never")}
          `,
        };
      }
      columns.actions = {
        title: "",
        label: this.hass.localize(
          "ui.panel.config.automation.picker.headers.actions"
        ),
        type: "icon-button",
        template: (_info, automation: any) => html`
          <ha-icon-button
            .automation=${automation}
            .label=${this.hass.localize(
              "ui.panel.config.automation.picker.headers.actions"
            )}
            .path=${mdiInformationOutline}
            @click=${this._showInfo}
          ></ha-icon-button>
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
        id="entity_id"
        .route=${this.route}
        .tabs=${configSections.automations}
        .activeFilters=${this._activeFilters}
        .columns=${this._columns(this.narrow, this.hass.locale)}
        .data=${this._automations(this.automations, this._filteredAutomations)}
        @row-click=${this._handleRowClicked}
        .noDataText=${this.hass.localize(
          "ui.panel.config.automation.picker.no_automations"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
        clickable
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
          exclude-domains='["automation"]'
          @related-changed=${this._relatedFilterChanged}
        >
        </ha-button-related-filter-menu>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.automation.picker.add_automation"
          )}
          extended
          @click=${this._createNew}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
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
    this._filteredAutomations = ev.detail.items.automation || null;
  }

  private _clearFilter() {
    this._filteredAutomations = undefined;
    this._activeFilters = undefined;
    this._filterValue = undefined;
  }

  private _showInfo(ev) {
    ev.stopPropagation();
    const automation = ev.currentTarget.automation;
    fireEvent(this, "hass-more-info", { entityId: automation.entity_id });
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.automation.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.automation.picker.introduction")}
        <p>
          <a
            href=${documentationUrl(this.hass, "/docs/automation/editor/")}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.automation.picker.learn_more"
            )}
          </a>
        </p>
      `,
    });
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const automation = this.automations.find(
      (a) => a.entity_id === ev.detail.id
    );

    if (automation?.attributes.id) {
      navigate(`/config/automation/edit/${automation?.attributes.id}`);
    }
  }

  private _createNew() {
    if (isComponentLoaded(this.hass, "blueprint")) {
      showNewAutomationDialog(this);
    } else {
      navigate("/config/automation/edit/new");
    }
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-picker": HaAutomationPicker;
  }
}
