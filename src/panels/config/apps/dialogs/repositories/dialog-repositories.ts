import { mdiDelete, mdiDeleteOff, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";
import "../../../../../components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-textfield";
import type { HaTextField } from "../../../../../components/ha-textfield";
import "../../../../../components/ha-tooltip";
import type {
  HassioAddonInfo,
  HassioAddonsInfo,
  HassioAddonRepository,
} from "../../../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import {
  addStoreRepository,
  fetchStoreRepositories,
  removeStoreRepository,
} from "../../../../../data/supervisor/store";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { RepositoryDialogParams } from "./show-dialog-repositories";

interface RepositoryRowData {
  slug: string;
  name: string;
  maintainer: string;
  url: string;
}

@customElement("dialog-apps-repositories")
class AppsRepositoriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @query("#repository_input") private _optionInput?: HaTextField;

  @state() private _repositories?: HassioAddonRepository[];

  @state() private _dialogParams?: RepositoryDialogParams;

  @state() private _addon?: HassioAddonsInfo;

  @state() private _open = false;

  @state() private _processing = false;

  @state() private _error?: string;

  public async showDialog(dialogParams: RepositoryDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    this._addon = dialogParams.addon;
    this._open = true;
    await this._loadData();
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._dialogParams?.closeCallback?.();
    this._dialogParams = undefined;
    this._addon = undefined;
    this._open = false;
    this._error = "";
    fireEvent(this, "dialog-closed");
  }

  private _columns = memoizeOne(
    (
      usedRepositories: string[]
    ): DataTableColumnContainer<RepositoryRowData> => ({
      name: {
        title: this.hass.localize("ui.panel.config.apps.store.repositories"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
        template: (row) => html`
          <div>${row.name}</div>
          <div class="secondary">${row.maintainer} &middot; ${row.url}</div>
        `,
      },
      actions: {
        title: "",
        label: this.hass.localize(
          "ui.panel.config.apps.dialog.repositories.remove"
        ),
        type: "icon-button",
        showNarrow: true,
        lastFixed: true,
        template: (row) => {
          const used = usedRepositories.includes(row.slug);
          return html`
            <ha-tooltip .for="delete-btn-${row.slug}">
              ${this.hass.localize(
                used
                  ? "ui.panel.config.apps.dialog.repositories.used"
                  : "ui.panel.config.apps.dialog.repositories.remove"
              )}
            </ha-tooltip>
            <ha-icon-button
              .id="delete-btn-${row.slug}"
              .disabled=${used}
              .slug=${row.slug}
              .path=${used ? mdiDeleteOff : mdiDelete}
              @click=${this._removeRepository}
              class="delete"
            ></ha-icon-button>
          `;
        },
      },
    })
  );

  private _filteredRepositories = memoizeOne((repos: HassioAddonRepository[]) =>
    repos
      .filter(
        (repo) =>
          repo.slug !== "core" && // The core apps repository
          repo.slug !== "local" && // Locally managed apps
          repo.slug !== "a0d7b954" && // Home Assistant Community Apps
          repo.slug !== "5c53de3b" && // The ESPHome repository
          repo.slug !== "d5369777" // Music Assistant repository
      )
      .sort((a, b) =>
        caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language)
      )
  );

  private _filteredUsedRepositories = memoizeOne(
    (repos: HassioAddonRepository[], addons: HassioAddonInfo[]) =>
      repos
        .filter((repo) =>
          addons.some((addon) => addon.repository === repo.slug)
        )
        .map((repo) => repo.slug)
  );

  private _data = memoizeOne(
    (repos: HassioAddonRepository[]): RepositoryRowData[] =>
      repos.map((repo) => ({
        slug: repo.slug,
        name: repo.name,
        maintainer: repo.maintainer,
        url: repo.url,
      }))
  );

  protected render() {
    if (!this._addon || this._repositories === undefined) {
      return nothing;
    }
    const repositories = this._filteredRepositories(this._repositories);
    const usedRepositories = this._filteredUsedRepositories(
      repositories,
      this._addon.addons
    );
    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
        header-title=${this.hass.localize(
          "ui.panel.config.apps.dialog.repositories.title"
        )}
      >
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        <div class="form">
          <ha-data-table
            .hass=${this.hass}
            .columns=${this._columns(usedRepositories)}
            .data=${this._data(repositories)}
            .noDataText=${this.hass.localize(
              "ui.panel.config.apps.dialog.repositories.no_repositories"
            )}
            id="slug"
            auto-height
          ></ha-data-table>
          <div class="layout horizontal center">
            <ha-textfield
              class="flex-auto"
              id="repository_input"
              .value=${this._dialogParams?.url || ""}
              .label=${this.hass.localize(
                "ui.panel.config.apps.dialog.repositories.add"
              )}
              @keydown=${this._handleKeyAdd}
              autofocus
            ></ha-textfield>
            <ha-button
              .loading=${this._processing}
              @click=${this._addRepository}
            >
              <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.apps.dialog.repositories.add"
              )}
            </ha-button>
          </div>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        .form {
          color: var(--primary-text-color);
        }
        ha-data-table {
          --data-table-border-width: 0;
        }
        ha-icon-button.delete {
          color: var(--error-color);
        }
        ha-button {
          margin-left: var(--ha-space-2);
          margin-inline-start: var(--ha-space-2);
          margin-inline-end: initial;
        }
      `,
    ];
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.key !== "Enter") {
      return;
    }
    this._addRepository();
  }

  private async _loadData(): Promise<void> {
    try {
      this._repositories = await fetchStoreRepositories(this.hass);

      fireEvent(this, "apps-collection-refresh", { collection: "addon" });
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
  }

  private async _addRepository() {
    const input = this._optionInput;
    if (!input || !input.value) {
      return;
    }
    this._processing = true;

    try {
      await addStoreRepository(this.hass, input.value);
      await this._loadData();

      fireEvent(this, "apps-collection-refresh", { collection: "store" });

      input.value = "";
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
    this._processing = false;
  }

  private async _removeRepository(ev: Event) {
    const slug = (ev.currentTarget as any).slug;
    try {
      await removeStoreRepository(this.hass, slug);
      await this._loadData();

      fireEvent(this, "apps-collection-refresh", { collection: "store" });
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-apps-repositories": AppsRepositoriesDialog;
  }
}
