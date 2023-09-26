import {
  mdiCancel,
  mdiContentDuplicate,
  mdiDelete,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiPlay,
  mdiPlayCircleOutline,
  mdiPlus,
  mdiStopCircleOutline,
  mdiTransitConnection,
} from "@mdi/js";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { differenceInDays } from "date-fns/esm";
import { styleMap } from "lit/directives/style-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatShortDateTime } from "../../../common/datetime/format_date_time";
import { relativeTime } from "../../../common/datetime/relative_time";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-related-filter-menu";
import "../../../components/ha-chip";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-svg-icon";
import {
  AutomationEntity,
  deleteAutomation,
  duplicateAutomation,
  fetchAutomationFileConfig,
  getAutomationStateConfig,
  showAutomationEditor,
  triggerAutomationActions,
} from "../../../data/automation";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { configSections } from "../ha-panel-config";
import { showNewAutomationDialog } from "./show-dialog-new-automation";
import { findRelated } from "../../../data/search";
import { fetchBlueprints } from "../../../data/blueprint";
import { UNAVAILABLE } from "../../../data/entity";

type AutomationItem = AutomationEntity & {
  name: string;
  last_triggered?: string | undefined;
  disabled: boolean;
};

@customElement("ha-automation-picker")
class HaAutomationPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public route!: Route;

  @property() public automations!: AutomationEntity[];

  @property() private _activeFilters?: string[];

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _filteredAutomations?: string[] | null;

  @state() private _filterValue?;

  private _automations = memoizeOne(
    (
      automations: AutomationEntity[],
      filteredAutomations?: string[] | null
    ): AutomationItem[] => {
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
        disabled: automation.state === "off",
      }));
    }
  );

  private _columns = memoizeOne(
    (narrow: boolean, _locale): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<AutomationItem> = {
        icon: {
          title: "",
          label: this.hass.localize(
            "ui.panel.config.automation.picker.headers.state"
          ),
          type: "icon",
          template: (automation) =>
            html`<ha-state-icon
              .state=${automation}
              style=${styleMap({
                color:
                  automation.state === UNAVAILABLE
                    ? "var(--error-color)"
                    : "unset",
              })}
            ></ha-state-icon>`,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.automation.picker.headers.name"
          ),
          main: true,
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: narrow
            ? (automation) => {
                const date = new Date(automation.attributes.last_triggered);
                const now = new Date();
                const dayDifference = differenceInDays(now, date);
                return html`
                  ${automation.name}
                  <div class="secondary">
                    ${this.hass.localize("ui.card.automation.last_triggered")}:
                    ${automation.attributes.last_triggered
                      ? dayDifference > 3
                        ? formatShortDateTime(
                            date,
                            this.hass.locale,
                            this.hass.config
                          )
                        : relativeTime(date, this.hass.locale)
                      : this.hass.localize("ui.components.relative_time.never")}
                  </div>
                `;
              }
            : undefined,
        },
      };
      if (!narrow) {
        columns.last_triggered = {
          sortable: true,
          width: "20%",
          title: this.hass.localize("ui.card.automation.last_triggered"),
          template: (automation) => {
            if (!automation.last_triggered) {
              return this.hass.localize("ui.components.relative_time.never");
            }
            const date = new Date(automation.last_triggered);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            return html`
              ${dayDifference > 3
                ? formatShortDateTime(date, this.hass.locale, this.hass.config)
                : relativeTime(date, this.hass.locale)}
            `;
          },
        };
      }

      columns.disabled = this.narrow
        ? {
            title: "",
            template: (automation) =>
              automation.disabled
                ? html`
                    <simple-tooltip animation-delay="0" position="left">
                      ${this.hass.localize(
                        "ui.panel.config.automation.picker.disabled"
                      )}
                    </simple-tooltip>
                    <ha-svg-icon
                      .path=${mdiCancel}
                      style="color: var(--secondary-text-color)"
                    ></ha-svg-icon>
                  `
                : "",
          }
        : {
            width: "20%",
            title: "",
            template: (automation) =>
              automation.disabled
                ? html`
                    <ha-chip>
                      ${this.hass.localize(
                        "ui.panel.config.automation.picker.disabled"
                      )}
                    </ha-chip>
                  `
                : "",
          };

      columns.actions = {
        title: "",
        width: this.narrow ? undefined : "10%",
        type: "overflow-menu",
        template: (automation) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
              {
                path: mdiInformationOutline,
                label: this.hass.localize(
                  "ui.panel.config.automation.editor.show_info"
                ),
                action: () => this._showInfo(automation),
              },
              {
                path: mdiPlay,
                label: this.hass.localize(
                  "ui.panel.config.automation.editor.run"
                ),
                action: () => this._runActions(automation),
              },
              {
                path: mdiTransitConnection,
                label: this.hass.localize(
                  "ui.panel.config.automation.editor.show_trace"
                ),
                action: () => this._showTrace(automation),
              },
              {
                divider: true,
              },
              {
                path: mdiContentDuplicate,
                label: this.hass.localize(
                  "ui.panel.config.automation.picker.duplicate"
                ),
                action: () => this.duplicate(automation),
              },
              {
                path:
                  automation.state === "off"
                    ? mdiPlayCircleOutline
                    : mdiStopCircleOutline,
                label:
                  automation.state === "off"
                    ? this.hass.localize(
                        "ui.panel.config.automation.editor.enable"
                      )
                    : this.hass.localize(
                        "ui.panel.config.automation.editor.disable"
                      ),
                action: () => this._toggle(automation),
              },
              {
                label: this.hass.localize(
                  "ui.panel.config.automation.picker.delete"
                ),
                path: mdiDelete,
                action: () => this._deleteConfirm(automation),
                warning: true,
              },
            ]}
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

  firstUpdated() {
    if (this._searchParms.has("blueprint")) {
      this._filterBlueprint();
    }
  }

  private async _filterBlueprint() {
    const blueprint = this._searchParms.get("blueprint");
    if (!blueprint) {
      return;
    }
    const [related, blueprints] = await Promise.all([
      findRelated(this.hass, "automation_blueprint", blueprint),
      fetchBlueprints(this.hass, "automation"),
    ]);
    this._filteredAutomations = related.automation || [];
    const blueprintMeta = blueprints[blueprint];
    this._activeFilters = [
      this.hass.localize(
        "ui.panel.config.automation.picker.filtered_by_blueprint",
        "name",
        !blueprintMeta || "error" in blueprintMeta
          ? blueprint
          : blueprintMeta.metadata.name || blueprint
      ),
    ];
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

  private _showInfo(automation: any) {
    fireEvent(this, "hass-more-info", { entityId: automation.entity_id });
  }

  private _runActions(automation: any) {
    triggerAutomationActions(this.hass, automation.entity_id);
  }

  private _showTrace(automation: any) {
    if (!automation.attributes.id) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.automation.picker.traces_not_available"
        ),
      });
      return;
    }
    navigate(`/config/automation/trace/${automation.attributes.id}`);
  }

  private async _toggle(automation): Promise<void> {
    const service = automation.state === "off" ? "turn_on" : "turn_off";
    await this.hass.callService("automation", service, {
      entity_id: automation.entity_id,
    });
  }

  private async _deleteConfirm(automation) {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.picker.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.picker.delete_confirm_text",
        { name: automation.name }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(automation),
      destructive: true,
    });
  }

  private async _delete(automation) {
    try {
      await deleteAutomation(this.hass, automation.attributes.id);
    } catch (err: any) {
      await showAlertDialog(this, {
        text:
          err.status_code === 400
            ? this.hass.localize(
                "ui.panel.config.automation.editor.load_error_not_deletable"
              )
            : this.hass.localize(
                "ui.panel.config.automation.editor.load_error_unknown",
                "err_no",
                err.status_code
              ),
      });
    }
  }

  private async duplicate(automation) {
    try {
      const config = await fetchAutomationFileConfig(
        this.hass,
        automation.attributes.id
      );
      duplicateAutomation(config);
    } catch (err: any) {
      if (err.status_code === 404) {
        const response = await getAutomationStateConfig(
          this.hass,
          automation.entity_id
        );
        showAutomationEditor({ ...response.config, id: undefined });
        return;
      }
      await showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.automation.editor.load_error_unknown",
          "err_no",
          err.status_code
        ),
      });
    }
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
      navigate(`/config/automation/edit/${automation.attributes.id}`);
    } else {
      navigate(`/config/automation/show/${ev.detail.id}`);
    }
  }

  private _createNew() {
    if (isComponentLoaded(this.hass, "blueprint")) {
      showNewAutomationDialog(this, { mode: "automation" });
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
