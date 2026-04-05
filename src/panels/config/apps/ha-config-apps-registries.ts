import { mdiDelete, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  fetchHassioDockerRegistries,
  removeHassioDockerRegistry,
} from "../../../data/hassio/docker";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { showAddRegistryDialog } from "./dialogs/registries/show-dialog-registries";

interface RegistryRowData {
  registry: string;
  username: string;
}

@customElement("ha-config-apps-registries")
export class HaConfigAppsRegistries extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _registries?: RegistryRowData[];

  @state() private _error?: string;

  protected firstUpdated() {
    this._loadData();
  }

  private _columns = memoizeOne(
    (
      localize: HomeAssistant["localize"]
    ): DataTableColumnContainer<RegistryRowData> => ({
      registry: {
        title: localize("ui.panel.config.apps.registries.registry"),
        main: true,
        sortable: true,
        filterable: true,
        direction: "asc" as const,
        flex: 2,
      },
      username: {
        title: localize("ui.panel.config.apps.registries.username"),
        sortable: true,
        filterable: true,
        flex: 2,
      },
      actions: {
        title: "",
        label: localize("ui.panel.config.apps.registries.remove"),
        type: "icon-button",
        showNarrow: true,
        lastFixed: true,
        template: (row) => html`
          <ha-icon-button
            .registry=${row.registry}
            .path=${mdiDelete}
            @click=${this._removeRegistry}
            class="delete"
          ></ha-icon-button>
        `,
      },
    })
  );

  protected render() {
    if (this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this._error}
        ></hass-error-screen>
      `;
    }

    if (!this._registries) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config/apps/available"
        .header=${this.hass.localize("ui.panel.config.apps.store.registries")}
      >
        <ha-data-table
          .columns=${this._columns(this.hass.localize)}
          .data=${this._registries}
          .noDataText=${this.hass.localize(
            "ui.panel.config.apps.registries.no_registries"
          )}
          id="registry"
          has-fab
        ></ha-data-table>
        <ha-fab
          .label=${this.hass.localize("ui.panel.config.apps.registries.add")}
          extended
          @click=${this._showAddRegistryDialog}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private _showAddRegistryDialog() {
    showAddRegistryDialog(this, {
      registryAdded: () => this._loadData(),
    });
  }

  private _removeRegistry = async (ev: Event) => {
    const registry = (ev.currentTarget as any).registry;

    showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.apps.registries.remove"),
      text: this.hass.localize(
        "ui.panel.config.apps.registries.confirm_remove",
        { name: registry }
      ),
      destructive: true,
      confirmText: this.hass.localize("ui.panel.config.apps.registries.remove"),
      action: async () => {
        try {
          await removeHassioDockerRegistry(this.hass, registry);
          await this._loadData();
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.apps.registries.failed_to_remove"
            ),
            text: extractApiErrorMessage(err),
          });
          throw err;
        }
      },
    });
  };

  private async _loadData(): Promise<void> {
    try {
      const result = await fetchHassioDockerRegistries(this.hass);
      this._registries = Object.keys(result!.registries).map((key) => ({
        registry: key,
        username: result.registries[key].username,
      }));
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }
    ha-data-table {
      width: 100%;
      height: 100%;
      --data-table-border-width: 0;
    }
    ha-icon-button.delete {
      color: var(--error-color);
    }
    ha-fab {
      position: fixed;
      right: calc(var(--ha-space-4) + var(--safe-area-inset-right));
      bottom: calc(var(--ha-space-4) + var(--safe-area-inset-bottom));
      inset-inline-end: calc(var(--ha-space-4) + var(--safe-area-inset-right));
      inset-inline-start: initial;
      z-index: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps-registries": HaConfigAppsRegistries;
  }
}
