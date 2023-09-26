import {
  mdiContentDuplicate,
  mdiDelete,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiPlay,
  mdiPlus,
  mdiTransitConnection,
} from "@mdi/js";
import { differenceInDays } from "date-fns/esm";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatShortDateTime } from "../../../common/datetime/format_date_time";
import { relativeTime } from "../../../common/datetime/relative_time";
import { HASSDomEvent, fireEvent } from "../../../common/dom/fire_event";
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
import { fetchBlueprints } from "../../../data/blueprint";
import { UNAVAILABLE } from "../../../data/entity";
import { EntityRegistryEntry } from "../../../data/entity_registry";
import {
  ScriptEntity,
  deleteScript,
  fetchScriptFileConfig,
  getScriptStateConfig,
  showScriptEditor,
  triggerScript,
} from "../../../data/script";
import { findRelated } from "../../../data/search";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { showNewAutomationDialog } from "../automation/show-dialog-new-automation";
import { configSections } from "../ha-panel-config";

type ScriptItem = ScriptEntity & {
  name: string;
};

@customElement("ha-script-picker")
class HaScriptPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scripts!: ScriptEntity[];

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @property({ attribute: false }) public entityRegistry!: EntityRegistryEntry[];

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _activeFilters?: string[];

  @state() private _filteredScripts?: string[] | null;

  @state() private _filterValue?;

  private _scripts = memoizeOne(
    (
      scripts: ScriptEntity[],
      filteredScripts?: string[] | null
    ): ScriptItem[] => {
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

  private _columns = memoizeOne(
    (narrow, _locale): DataTableColumnContainer<ScriptItem> => {
      const columns: DataTableColumnContainer = {
        icon: {
          title: "",
          label: this.hass.localize(
            "ui.panel.config.script.picker.headers.state"
          ),
          type: "icon",
          template: (script) =>
            html`<ha-state-icon
              .state=${script}
              style=${styleMap({
                color:
                  script.state === UNAVAILABLE ? "var(--error-color)" : "unset",
              })}
            ></ha-state-icon>`,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.script.picker.headers.name"
          ),
          main: true,
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: narrow
            ? (script) => {
                const date = new Date(script.last_triggered);
                const now = new Date();
                const dayDifference = differenceInDays(now, date);
                return html`
                  ${script.name}
                  <div class="secondary">
                    ${this.hass.localize("ui.card.automation.last_triggered")}:
                    ${script.last_triggered
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
          width: "40%",
          title: this.hass.localize("ui.card.automation.last_triggered"),
          template: (script) => {
            const date = new Date(script.last_triggered);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            return html`
              ${script.last_triggered
                ? dayDifference > 3
                  ? formatShortDateTime(
                      date,
                      this.hass.locale,
                      this.hass.config
                    )
                  : relativeTime(date, this.hass.locale)
                : this.hass.localize("ui.components.relative_time.never")}
            `;
          },
        };
      }

      columns.actions = {
        title: "",
        width: this.narrow ? undefined : "10%",
        type: "overflow-menu",
        template: (script) => html`
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
    }
  );

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
          .narrow=${this.narrow}
          .hass=${this.hass}
          .value=${this._filterValue}
          exclude-domains='["script"]'
          @related-changed=${this._relatedFilterChanged}
        >
        </ha-button-related-filter-menu>
        <ha-fab
          slot="fab"
          ?is-wide=${this.isWide}
          ?narrow=${this.narrow}
          .label=${this.hass.localize(
            "ui.panel.config.script.picker.add_script"
          )}
          extended
          ?rtl=${computeRTL(this.hass)}
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
      findRelated(this.hass, "script_blueprint", blueprint),
      fetchBlueprints(this.hass, "script"),
    ]);
    this._filteredScripts = related.script || [];
    const blueprintMeta = blueprints[blueprint];
    this._activeFilters = [
      this.hass.localize(
        "ui.panel.config.script.picker.filtered_by_blueprint",
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
    this._filteredScripts = ev.detail.items.script || null;
  }

  private _clearFilter() {
    this._filteredScripts = undefined;
    this._activeFilters = undefined;
    this._filterValue = undefined;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const entry = this.entityRegistry.find((e) => e.entity_id === ev.detail.id);
    if (entry) {
      navigate(`/config/script/edit/${entry.unique_id}`);
    } else {
      navigate(`/config/script/show/${ev.detail.id}`);
    }
  }

  private _createNew() {
    if (isComponentLoaded(this.hass, "blueprint")) {
      showNewAutomationDialog(this, { mode: "script" });
    } else {
      navigate("/config/script/edit/new");
    }
  }

  private _runScript = async (script: any) => {
    const entry = this.entityRegistry.find(
      (e) => e.entity_id === script.entity_id
    );
    if (!entry) {
      return;
    }
    await triggerScript(this.hass, entry.unique_id);
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
    const entry = this.entityRegistry.find(
      (e) => e.entity_id === script.entity_id
    );
    if (entry) {
      navigate(`/config/script/trace/${entry.unique_id}`);
    }
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
      const entry = this.entityRegistry.find(
        (e) => e.entity_id === script.entity_id
      );
      if (!entry) {
        return;
      }
      const config = await fetchScriptFileConfig(this.hass, entry.unique_id);
      showScriptEditor({
        ...config,
        alias: `${config?.alias} (${this.hass.localize(
          "ui.panel.config.script.picker.duplicate"
        )})`,
      });
    } catch (err: any) {
      if (err.status_code === 404) {
        const response = await getScriptStateConfig(
          this.hass,
          script.entity_id
        );
        showScriptEditor(response.config);
        return;
      }
      await showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.script.editor.load_error_unknown",
          "err_no",
          err.status_code
        ),
      });
    }
  }

  private async _deleteConfirm(script: any) {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.script.editor.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.script.editor.delete_confirm_text",
        { name: script.name }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(script),
      destructive: true,
    });
  }

  private async _delete(script: any) {
    try {
      const entry = this.entityRegistry.find(
        (e) => e.entity_id === script.entity_id
      );
      if (entry) {
        await deleteScript(this.hass, entry.unique_id);
      }
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
