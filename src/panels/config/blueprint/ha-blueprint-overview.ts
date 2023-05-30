import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import {
  mdiDelete,
  mdiDownload,
  mdiEye,
  mdiHelpCircle,
  mdiPlus,
  mdiShareVariant,
} from "@mdi/js";
import {
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { extractSearchParam } from "../../../common/url/search-params";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-svg-icon";
import { showAutomationEditor } from "../../../data/automation";
import {
  BlueprintDomain,
  BlueprintMetaData,
  Blueprints,
  deleteBlueprint,
} from "../../../data/blueprint";
import { showScriptEditor } from "../../../data/script";
import { findRelated } from "../../../data/search";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { configSections } from "../ha-panel-config";
import { showAddBlueprintDialog } from "./show-dialog-import-blueprint";

interface BlueprintMetaDataPath extends BlueprintMetaData {
  path: string;
  error: boolean;
}

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

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public blueprints!: Record<
    "automation" | "script",
    Blueprints
  >;

  private _processedBlueprints = memoizeOne(
    (blueprints: Record<string, Blueprints>) => {
      const result: any[] = [];
      Object.entries(blueprints).forEach(([type, typeBlueprints]) =>
        Object.entries(typeBlueprints).forEach(([path, blueprint]) => {
          if ("error" in blueprint) {
            result.push({
              name: blueprint.error,
              type,
              error: true,
              path,
            });
          } else {
            result.push({
              ...blueprint.metadata,
              type,
              error: false,
              path,
            });
          }
        })
      );
      return result;
    }
  );

  private _columns = memoizeOne(
    (narrow, _language): DataTableColumnContainer<BlueprintMetaDataPath> => ({
      name: {
        title: this.hass.localize(
          "ui.panel.config.blueprint.overview.headers.name"
        ),
        main: true,
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        template: narrow
          ? (name, entity: any) =>
              html`
                ${name}<br />
                <div class="secondary">${entity.path}</div>
              `
          : undefined,
      },
      type: {
        title: this.hass.localize(
          "ui.panel.config.blueprint.overview.headers.type"
        ),
        template: (type: BlueprintDomain) =>
          html`${this.hass.localize(
            `ui.panel.config.blueprint.overview.types.${type}`
          )}`,
        sortable: true,
        filterable: true,
        hidden: narrow,
        direction: "asc",
        width: "10%",
      },
      path: {
        title: this.hass.localize(
          "ui.panel.config.blueprint.overview.headers.file_name"
        ),
        sortable: true,
        filterable: true,
        hidden: narrow,
        direction: "asc",
        width: "25%",
      },
      actions: {
        title: "",
        width: this.narrow ? undefined : "10%",
        type: "overflow-menu",
        template: (_: string, blueprint) =>
          blueprint.error
            ? ""
            : html`
                <ha-icon-overflow-menu
                  .hass=${this.hass}
                  narrow
                  .items=${[
                    {
                      path: mdiPlus,
                      label: this.hass.localize(
                        `ui.panel.config.blueprint.overview.create_${blueprint.domain}`
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
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._processedBlueprints(this.blueprints)}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.blueprint.overview.no_blueprints"
        )}
        hasFab
        .appendRow=${html` <div
          class="mdc-data-table__cell"
          style="width: 100%; text-align: center;"
          role="cell"
        >
          <a
            href="https://www.home-assistant.io/get-blueprints"
            target="_blank"
            rel="noreferrer noopener"
          >
            <mwc-button
              >${this.hass.localize(
                "ui.panel.config.blueprint.overview.discover_more"
              )}</mwc-button
            >
          </a>
        </div>`}
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
          <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
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
                  const state = this.hass.states[item];
                  return html`<li>
                    ${state ? `${computeStateName(state)} (${item})` : item}
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

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-overview": HaBlueprintOverview;
  }
}
