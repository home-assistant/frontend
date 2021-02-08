import "@material/mwc-icon-button";
import { mdiDelete, mdiDownload, mdiHelpCircle, mdiRobot } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { extractSearchParam } from "../../../common/url/search-params";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-fab";
import "../../../components/ha-svg-icon";
import { showAutomationEditor } from "../../../data/automation";
import {
  BlueprintMetaData,
  Blueprints,
  deleteBlueprint,
} from "../../../data/blueprint";
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
  automation: (
    context: HaBlueprintOverview,
    blueprintMeta: BlueprintMetaDataPath
  ) => {
    showAutomationEditor(context, {
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

  @property() public route!: Route;

  @property() public blueprints!: Blueprints;

  private _processedBlueprints = memoizeOne((blueprints: Blueprints) => {
    const result = Object.entries(blueprints).map(([path, blueprint]) => {
      if ("error" in blueprint) {
        return {
          name: blueprint.error,
          error: true,
          path,
        };
      }
      return {
        ...blueprint.metadata,
        error: false,
        path,
      };
    });
    return result;
  });

  private _columns = memoizeOne(
    (narrow, _language): DataTableColumnContainer => ({
      name: {
        title: this.hass.localize(
          "ui.panel.config.blueprint.overview.headers.name"
        ),
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        template: narrow
          ? (name, entity: any) =>
              html`
                ${name}<br />
                <div class="secondary">
                  ${entity.path}
                </div>
              `
          : undefined,
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
      create: {
        title: "",
        type: narrow ? "icon-button" : undefined,
        template: (_, blueprint: any) =>
          blueprint.error
            ? ""
            : narrow
            ? html`<mwc-icon-button
                .blueprint=${blueprint}
                .label=${this.hass.localize(
                  "ui.panel.config.blueprint.overview.use_blueprint"
                )}
                title=${this.hass.localize(
                  "ui.panel.config.blueprint.overview.use_blueprint"
                )}
                @click=${(ev) => this._createNew(ev)}
              >
                <ha-svg-icon .path=${mdiRobot}></ha-svg-icon>
              </mwc-icon-button>`
            : html`<mwc-button
                .blueprint=${blueprint}
                @click=${(ev) => this._createNew(ev)}
              >
                ${this.hass.localize(
                  "ui.panel.config.blueprint.overview.use_blueprint"
                )}
              </mwc-button>`,
      },
      delete: {
        title: "",
        type: "icon-button",
        template: (_, blueprint: any) =>
          blueprint.error
            ? ""
            : html` <mwc-icon-button
                .blueprint=${blueprint}
                .label=${this.hass.localize(
                  "ui.panel.config.blueprint.overview.delete_blueprint"
                )}
                @click=${(ev) => this._delete(ev)}
                ><ha-svg-icon .path=${mdiDelete}></ha-svg-icon
              ></mwc-icon-button>`,
      },
    })
  );

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.route.path === "/import") {
      const url = extractSearchParam("blueprint_url");
      navigate(this, "/config/blueprint/dashboard", true);
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
        .tabs=${configSections.automation}
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
        <mwc-icon-button slot="toolbar-icon" @click=${this._showHelp}>
          <ha-svg-icon .path=${mdiHelpCircle}></ha-svg-icon>
        </mwc-icon-button>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.blueprint.overview.add_blueprint"
          )}
          extended
          @click=${this._addBlueprint}
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
            href="${documentationUrl(
              this.hass,
              "/docs/automation/using_blueprints/"
            )}"
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

  private _reload() {
    fireEvent(this, "reload-blueprints");
  }

  private _createNew(ev) {
    const blueprint = ev.currentTarget.blueprint as BlueprintMetaDataPath;
    createNewFunctions[blueprint.domain](this, blueprint);
  }

  private async _delete(ev) {
    const blueprint = ev.currentTarget.blueprint;
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.blueprint.overview.confirm_delete_header"
        ),
        text: this.hass.localize(
          "ui.panel.config.blueprint.overview.confirm_delete_text"
        ),
      }))
    ) {
      return;
    }
    await deleteBlueprint(this.hass, blueprint.domain, blueprint.path);
    fireEvent(this, "reload-blueprints");
  }

  static get styles(): CSSResult {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-overview": HaBlueprintOverview;
  }
}
