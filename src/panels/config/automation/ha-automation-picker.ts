import {
  mdiHelpCircle,
  mdiHistory,
  mdiInformationOutline,
  mdiPencil,
  mdiPencilOff,
  mdiPlayCircleOutline,
  mdiPlus,
} from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-button-related-filter-menu";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-icon-overflow-menu";
import {
  AutomationEntity,
  triggerAutomationActions,
} from "../../../data/automation";
import { UNAVAILABLE_STATES } from "../../../data/entity";
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
        toggle: {
          title: "",
          label: this.hass.localize(
            "ui.panel.config.automation.picker.headers.toggle"
          ),
          type: "icon",
          template: (_toggle, automation: any) =>
            html`
              <ha-entity-toggle
                .hass=${this.hass}
                .stateObj=${automation}
              ></ha-entity-toggle>
            `,
        },
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
                      ? formatDateTime(
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
              ? formatDateTime(new Date(last_triggered), this.hass.locale)
              : this.hass.localize("ui.components.relative_time.never")}
          `,
        };
        columns.trigger = {
          label: this.hass.localize(
            "ui.panel.config.automation.picker.headers.trigger"
          ),
          title: html`
            <mwc-button style="visibility: hidden">
              ${this.hass.localize("ui.card.automation.trigger")}
            </mwc-button>
          `,
          width: "20%",
          template: (_info, automation: any) => html`
            <mwc-button
              .automation=${automation}
              @click=${this._triggerRunActions}
              .disabled=${UNAVAILABLE_STATES.includes(automation.state)}
            >
              ${this.hass.localize("ui.card.automation.trigger")}
            </mwc-button>
          `,
        };
      }
      columns.actions = {
        title: "",
        label: this.hass.localize(
          "ui.panel.config.automation.picker.headers.actions"
        ),
        type: "overflow-menu",
        template: (_info, automation: any) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            .narrow=${this.narrow}
            .items=${[
              // Info Button
              {
                path: mdiInformationOutline,
                label: this.hass.localize(
                  "ui.panel.config.automation.picker.show_info_automation"
                ),
                action: () => this._showInfo(automation),
              },
              // Trigger Button
              {
                path: mdiPlayCircleOutline,
                label: this.hass.localize("ui.card.automation.trigger"),
                narrowOnly: true,
                action: () => this._runActions(automation),
              },
              // Trace Button
              {
                path: mdiHistory,
                disabled: !automation.attributes.id,
                label: this.hass.localize(
                  "ui.panel.config.automation.picker.dev_automation"
                ),
                tooltip: !automation.attributes.id
                  ? this.hass.localize(
                      "ui.panel.config.automation.picker.dev_only_editable"
                    )
                  : "",
                action: () => {
                  if (automation.attributes.id) {
                    navigate(
                      `/config/automation/trace/${automation.attributes.id}`
                    );
                  }
                },
              },
              // Edit Button
              {
                path: automation.attributes.id ? mdiPencil : mdiPencilOff,
                disabled: !automation.attributes.id,
                label: this.hass.localize(
                  "ui.panel.config.automation.picker.edit_automation"
                ),
                tooltip: !automation.attributes.id
                  ? this.hass.localize(
                      "ui.panel.config.automation.picker.dev_only_editable"
                    )
                  : "",
                action: () => {
                  if (automation.attributes.id) {
                    navigate(
                      `/config/automation/edit/${automation.attributes.id}`
                    );
                  }
                },
              },
            ]}
            style="color: var(--secondary-text-color)"
          >
          </ha-icon-overflow-menu>
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
        .noDataText=${this.hass.localize(
          "ui.panel.config.automation.picker.no_automations"
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

  private _showInfo(automation: AutomationEntity) {
    const entityId = automation.entity_id;
    fireEvent(this, "hass-more-info", { entityId });
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

  private _triggerRunActions = (ev) => {
    this._runActions(ev.currentTarget.automation);
  };

  private _runActions = (automation: AutomationEntity) => {
    triggerAutomationActions(this.hass, automation.entity_id);
  };

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
