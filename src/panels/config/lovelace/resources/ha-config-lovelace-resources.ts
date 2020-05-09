import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-tooltip/paper-tooltip";
import "@material/mwc-fab";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import memoize from "memoize-one";
import { compare } from "../../../../common/string/compare";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/ha-icon";
import {
  createResource,
  deleteResource,
  fetchResources,
  LovelaceResource,
  updateResource,
} from "../../../../data/lovelace";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-loading-screen";
import "../../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../../types";
import { loadLovelaceResources } from "../../../lovelace/common/load-resources";
import { lovelaceTabs } from "../ha-config-lovelace";
import { showResourceDetailDialog } from "./show-dialog-lovelace-resource-detail";
import "../../../../components/ha-svg-icon";
import { mdiPlus } from "@mdi/js";

@customElement("ha-config-lovelace-resources")
export class HaConfigLovelaceRescources extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @property() private _resources: LovelaceResource[] = [];

  private _columns = memoize(
    (_language): DataTableColumnContainer => {
      return {
        url: {
          title: this.hass.localize(
            "ui.panel.config.lovelace.resources.picker.headers.url"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
        },
        type: {
          title: this.hass.localize(
            "ui.panel.config.lovelace.resources.picker.headers.type"
          ),
          sortable: true,
          filterable: true,
          width: "30%",
          template: (type) =>
            html`
              ${this.hass.localize(
                `ui.panel.config.lovelace.resources.types.${type}`
              ) || type}
            `,
        },
      };
    }
  );

  protected render(): TemplateResult {
    if (!this.hass || this._resources === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${lovelaceTabs}
        .columns=${this._columns(this.hass.language)}
        .data=${this._resources}
        .noDataText=${this.hass.localize(
          "ui.panel.config.lovelace.resources.picker.no_resources"
        )}
        @row-click=${this._editResource}
        hasFab
      >
      </hass-tabs-subpage-data-table>
      <mwc-fab
        ?is-wide=${this.isWide}
        ?narrow=${this.narrow}
        title=${this.hass.localize(
          "ui.panel.config.lovelace.resources.picker.add_resource"
        )}
        @click=${this._addResource}
      >
        <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
      </mwc-fab>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getResources();
  }

  private async _getResources() {
    this._resources = await fetchResources(this.hass.connection);
  }

  private _editResource(ev: CustomEvent) {
    if ((this.hass.panels.lovelace?.config as any)?.mode !== "storage") {
      showAlertDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.lovelace.resources.cant_edit_yaml"
        ),
      });
      return;
    }
    const id = (ev.detail as RowClickedEvent).id;
    const resource = this._resources.find((res) => res.id === id);
    this._openDialog(resource);
  }

  private _addResource() {
    if ((this.hass.panels.lovelace?.config as any)?.mode !== "storage") {
      showAlertDialog(this, {
        text: this.hass!.localize(
          "ui.panel.config.lovelace.resources.cant_edit_yaml"
        ),
      });
      return;
    }
    this._openDialog();
  }

  private async _openDialog(resource?: LovelaceResource): Promise<void> {
    showResourceDetailDialog(this, {
      resource,
      createResource: async (values) => {
        const created = await createResource(this.hass!, values);
        this._resources = this._resources!.concat(created).sort((res1, res2) =>
          compare(res1.url, res2.url)
        );
        loadLovelaceResources([created], this.hass!.auth.data.hassUrl);
      },
      updateResource: async (values) => {
        const updated = await updateResource(this.hass!, resource!.id, values);
        this._resources = this._resources!.map((res) =>
          res === resource ? updated : res
        );
        loadLovelaceResources([updated], this.hass!.auth.data.hassUrl);
      },
      removeResource: async () => {
        if (
          !(await showConfirmationDialog(this, {
            text: this.hass!.localize(
              "ui.panel.config.lovelace.resources.confirm_delete"
            ),
          }))
        ) {
          return false;
        }

        try {
          await deleteResource(this.hass!, resource!.id);
          this._resources = this._resources!.filter((res) => res !== resource);
          showConfirmationDialog(this, {
            title: this.hass!.localize(
              "ui.panel.config.lovelace.resources.refresh_header"
            ),
            text: this.hass!.localize(
              "ui.panel.config.lovelace.resources.refresh_body"
            ),
            confirm: () => location.reload(),
          });
          return true;
        } catch (err) {
          return false;
        }
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      mwc-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }
      mwc-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
      mwc-fab[narrow] {
        bottom: 84px;
      }
    `;
  }
}
