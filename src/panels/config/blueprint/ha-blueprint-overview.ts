import {
  mdiAlertCircle,
  mdiDelete,
  mdiDownload,
  mdiEye,
  mdiHelpCircle,
  mdiOpenInNew,
  mdiPlus,
  mdiShareVariant,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { extractSearchParam } from "../../../common/url/search-params";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-button";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-svg-icon";
import { showAutomationEditor } from "../../../data/automation";
import type {
  BlueprintImportResult,
  BlueprintMetaData,
  Blueprints,
} from "../../../data/blueprint";
import {
  deleteBlueprint,
  importBlueprint,
  saveBlueprint,
} from "../../../data/blueprint";
import { showScriptEditor } from "../../../data/script";
import { findRelated } from "../../../data/search";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { configSections } from "../ha-panel-config";
import { showAddBlueprintDialog } from "./show-dialog-import-blueprint";

type BlueprintMetaDataPath = BlueprintMetaData & {
  path: string;
  error: boolean;
  type: "automation" | "script";
  fullpath: string;
};

const createNewFunctions = {
  automation: (blueprintMeta: BlueprintMetaDataPath) => {
    showAutomationEditor({
      alias: blueprintMeta.name,
      use_blueprint: { path: blueprintMeta.path },
    });
  },
  script: (blueprintMeta: BlueprintMetaDataPath) => {
    showScriptEditor({
      alias: blueprintMeta.name,
      use_blueprint: { path: blueprintMeta.path },
    });
  },
};

@customElement("ha-blueprint-overview")
class HaBlueprintOverview extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public blueprints!: Record<
    "automation" | "script",
    Blueprints
  >;

  @storage({ key: "blueprint-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;

  @storage({ key: "blueprint-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;

  @storage({
    key: "blueprint-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  @storage({
    key: "blueprint-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "blueprint-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @state()
  @storage({
    storage: "sessionStorage",
    key: "blueprint-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  private _processedBlueprints = memoizeOne(
    (
      blueprints: Record<string, Blueprints>,
      localize: LocalizeFunc
    ): BlueprintMetaDataPath[] => {
      const result: any[] = [];
      Object.entries(blueprints).forEach(([type, typeBlueprints]) =>
        Object.entries(typeBlueprints).forEach(([path, blueprint]) => {
          if ("error" in blueprint) {
            result.push({
              name: blueprint.error,
              type,
              translated_type: localize(
                `ui.panel.config.blueprint.overview.types.${type as "automation" | "script"}`
              ),
              error: true,
              path,
              fullpath: `${type}/${path}`,
            });
          } else {
            result.push({
              ...blueprint.metadata,
              type,
              translated_type: localize(
                `ui.panel.config.blueprint.overview.types.${type as "automation" | "script"}`
              ),
              error: false,
              path,
              fullpath: `${type}/${path}`,
            });
          }
        })
      );
      return result;
    }
  );

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc
    ): DataTableColumnContainer<BlueprintMetaDataPath> => ({
      name: {
        title: localize("ui.panel.config.blueprint.overview.headers.name"),
        main: true,
        sortable: true,
        filterable: true,
        direction: "asc",
        flex: 2,
      },
      translated_type: {
        title: localize("ui.panel.config.blueprint.overview.headers.type"),
        sortable: true,
        filterable: true,
        groupable: true,
        direction: "asc",
      },
      path: {
        title: localize("ui.panel.config.blueprint.overview.headers.file_name"),
        sortable: true,
        filterable: true,
        direction: "asc",
        flex: 2,
      },
      fullpath: {
        title: "fullpath",
        hidden: true,
      },
      actions: {
        title: "",
        label: this.hass.localize("ui.panel.config.generic.headers.actions"),
        type: "overflow-menu",
        showNarrow: true,
        moveable: false,
        hideable: false,
        template: (blueprint) =>
          blueprint.error
            ? html`<ha-svg-icon
                style="color: var(--error-color); display: block; margin-inline-end: 12px; margin-inline-start: auto;"
                .path=${mdiAlertCircle}
              ></ha-svg-icon>`
            : html`
                <ha-icon-overflow-menu
                  .hass=${this.hass}
                  narrow
                  .items=${[
                    {
                      path: mdiPlus,
                      label: this.hass.localize(
                        `ui.panel.config.blueprint.overview.create_${blueprint.type}`
                      ),
                      action: () => this._createNew(blueprint),
                    },
                    {
                      path: mdiEye,
                      label: this.hass.localize(
                        `ui.panel.config.blueprint.overview.view_${blueprint.domain}`
                      ),
                      action: () => this._showUsed(blueprint),
                    },
                    {
                      path: mdiShareVariant,
                      disabled: !blueprint.source_url,
                      label: this.hass.localize(
                        blueprint.source_url
                          ? "ui.panel.config.blueprint.overview.share_blueprint"
                          : "ui.panel.config.blueprint.overview.share_blueprint_no_url"
                      ),
                      action: () => this._share(blueprint),
                    },
                    {
                      path: mdiDownload,
                      disabled: !blueprint.source_url,
                      label: this.hass.localize(
                        blueprint.source_url
                          ? "ui.panel.config.blueprint.overview.re_import_blueprint"
                          : "ui.panel.config.blueprint.overview.re_import_blueprint_no_url"
                      ),
                      action: () => this._reImport(blueprint),
                    },
                    {
                      divider: true,
                    },
                    {
                      label: this.hass.localize(
                        "ui.panel.config.blueprint.overview.delete_blueprint"
                      ),
                      path: mdiDelete,
                      action: () => this._delete(blueprint),
                      warning: true,
                    },
                  ]}
                >
                </ha-icon-overflow-menu>
              `,
      },
    })
  );

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.route.path === "/import") {
      const url = extractSearchParam("blueprint_url");
      navigate("/config/blueprint/dashboard", { replace: true });
      if (url) {
        this._addBlueprint(url);
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automations}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._processedBlueprints(this.blueprints, this.hass.localize)}
        id="fullpath"
        .noDataText=${this.hass.localize(
          "ui.panel.config.blueprint.overview.no_blueprints"
        )}
        has-fab
        clickable
        @row-click=${this._handleRowClicked}
        .appendRow=${html`<div
          class="mdc-data-table__cell"
          style="width: 100%; text-align: center;"
          role="cell"
        >
          <ha-button
            appearance="plain"
            href="https://www.home-assistant.io/get-blueprints"
            target="_blank"
            rel="noreferrer noopener"
            size="small"
          >
            ${this.hass.localize(
              "ui.panel.config.blueprint.overview.discover_more"
            )}
            <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
          </ha-button>
        </div>`}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
          @click=${this._showHelp}
        ></ha-icon-button>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.blueprint.overview.add_blueprint"
          )}
          extended
          @click=${this._addBlueprintClicked}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.blueprint.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.blueprint.overview.introduction")}
        <p>
          <a
            href=${documentationUrl(
              this.hass,
              "/docs/automation/using_blueprints/"
            )}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.blueprint.overview.learn_more"
            )}
          </a>
        </p>
      `,
    });
  }

  private _addBlueprint(url?: string) {
    showAddBlueprintDialog(this, {
      url,
      importedCallback: () => this._reload(),
    });
  }

  private _addBlueprintClicked(): void {
    this._addBlueprint();
  }

  private _reload() {
    fireEvent(this, "reload-blueprints");
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const blueprint = this._processedBlueprints(
      this.blueprints,
      this.hass.localize
    ).find((b) => b.fullpath === ev.detail.id)!;
    if (blueprint.error) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.blueprint.overview.error", {
          path: blueprint.path,
        }),
        text: blueprint.name,
      });
      return;
    }
    navigate(`/config/blueprint/edit/${blueprint.fullpath}`);
  }

  private _showUsed = (blueprint: BlueprintMetaDataPath) => {
    navigate(
      `/config/${blueprint.domain}/dashboard?blueprint=${encodeURIComponent(
        blueprint.path
      )}`
    );
  };

  private _createNew = (blueprint: BlueprintMetaDataPath) => {
    createNewFunctions[blueprint.domain](blueprint);
  };

  private _share = (blueprint: BlueprintMetaDataPath) => {
    const params = new URLSearchParams();
    params.append("redirect", "blueprint_import");
    params.append("blueprint_url", blueprint.source_url!);
    window.open(
      `https://my.home-assistant.io/create-link/?${params.toString()}`
    );
  };

  private _reImport = async (blueprint: BlueprintMetaDataPath) => {
    const result = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.blueprint.overview.re_import_confirm_title"
      ),
      text: html`
        ${this.hass.localize(
          "ui.panel.config.blueprint.overview.re_import_confirm_text"
        )}
      `,
      confirmText: this.hass.localize(
        "ui.panel.config.blueprint.overview.re_import_confirm_action"
      ),
      warning: true,
    });

    if (!result) {
      return;
    }

    let importResult: BlueprintImportResult;
    try {
      importResult = await importBlueprint(this.hass, blueprint.source_url!);
    } catch (err) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.blueprint.overview.re_import_error_source_not_found"
        ),
      });
      throw err;
    }

    try {
      await saveBlueprint(
        this.hass,
        blueprint.domain,
        blueprint.path,
        importResult!.raw_data,
        blueprint.source_url,
        true
      );
    } catch (err: any) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.blueprint.overview.re_import_error_save",
          { error: err.message }
        ),
      });
      throw err;
    }

    fireEvent(this, "reload-blueprints");

    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.blueprint.overview.re_import_success",
        { name: importResult!.blueprint.metadata.name }
      ),
    });
  };

  private _delete = async (blueprint: BlueprintMetaDataPath) => {
    const related = await findRelated(
      this.hass,
      `${blueprint.domain}_blueprint`,
      blueprint.path
    );
    if (related.automation?.length || related.script?.length) {
      const type = this.hass.localize(
        `ui.panel.config.blueprint.overview.types_plural.${blueprint.domain}`
      );
      const result = await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.blueprint.overview.blueprint_in_use_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.blueprint.overview.blueprint_in_use_text",
          {
            type,
            list: html`<ul>
              ${[...(related.automation || []), ...(related.script || [])].map(
                (item) => {
                  const automationState = this.hass.states[item];
                  return html`<li>
                    ${automationState
                      ? `${computeStateName(automationState)} (${item})`
                      : item}
                  </li>`;
                }
              )}
            </ul>`,
          }
        ),
        confirmText: this.hass!.localize(
          "ui.panel.config.blueprint.overview.blueprint_in_use_view",
          { type }
        ),
      });
      if (result) {
        navigate(
          `/config/${blueprint.domain}/dashboard?blueprint=${encodeURIComponent(
            blueprint.path
          )}`
        );
      }
      return;
    }
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.blueprint.overview.confirm_delete_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.blueprint.overview.confirm_delete_text",
          { name: blueprint.name }
        ),
        confirmText: this.hass!.localize("ui.common.delete"),
        dismissText: this.hass!.localize("ui.common.cancel"),
        destructive: true,
      }))
    ) {
      return;
    }
    await deleteBlueprint(this.hass, blueprint.domain, blueprint.path);
    fireEvent(this, "reload-blueprints");
  };

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-overview": HaBlueprintOverview;
  }
}
