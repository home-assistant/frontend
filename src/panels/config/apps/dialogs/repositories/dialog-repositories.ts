import { mdiDelete, mdiDeleteOff, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
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

@customElement("dialog-apps-repositories")
class AppsRepositoriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @query("#repository_input", true) private _optionInput?: HaTextField;

  @state() private _repositories?: HassioAddonRepository[];

  @state() private _dialogParams?: RepositoryDialogParams;

  @state() private _addon?: HassioAddonsInfo;

  @state() private _opened = false;

  @state() private _processing = false;

  @state() private _error?: string;

  public async showDialog(dialogParams: RepositoryDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    this._addon = dialogParams.addon;
    this._opened = true;
    await this._loadData();
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams?.closeCallback?.();
    this._dialogParams = undefined;
    this._opened = false;
    this._error = "";
  }

  private _filteredRepositories = memoizeOne((repos: HassioAddonRepository[]) =>
    repos
      .filter(
        (repo) =>
          repo.slug !== "core" && // The core add-ons repository
          repo.slug !== "local" && // Locally managed add-ons
          repo.slug !== "a0d7b954" && // Home Assistant Community Add-ons
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
        .open=${this._opened}
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.apps.dialog.repositories.title")
        )}
      >
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        <div class="form">
          <ha-md-list>
            ${repositories.length
              ? repositories.map(
                  (repo) => html`
                    <ha-md-list-item class="option">
                      ${repo.name}
                      <div slot="supporting-text">
                        <div>${repo.maintainer}</div>
                        <div>${repo.url}</div>
                      </div>
                      <ha-tooltip
                        .for="icon-button-${repo.slug}"
                        class="delete"
                        slot="end"
                      >
                        ${this.hass.localize(
                          usedRepositories.includes(repo.slug)
                            ? "ui.panel.config.apps.dialog.repositories.used"
                            : "ui.panel.config.apps.dialog.repositories.remove"
                        )}
                      </ha-tooltip>
                      <div .id="icon-button-${repo.slug}">
                        <ha-icon-button
                          .disabled=${usedRepositories.includes(repo.slug)}
                          .slug=${repo.slug}
                          .path=${usedRepositories.includes(repo.slug)
                            ? mdiDeleteOff
                            : mdiDelete}
                          @click=${this._removeRepository}
                        >
                        </ha-icon-button>
                      </div>
                    </ha-md-list-item>
                  `
                )
              : html`<ha-md-list-item
                  >${this.hass.localize(
                    "ui.panel.config.apps.dialog.repositories.no_repositories"
                  )}</ha-md-list-item
                >`}
          </ha-md-list>
          <div class="layout horizontal bottom">
            <ha-textfield
              class="flex-auto"
              id="repository_input"
              .value=${this._dialogParams?.url || ""}
              .label=${this.hass.localize(
                "ui.panel.config.apps.dialog.repositories.add"
              )}
              @keydown=${this._handleKeyAdd}
              dialogInitialFocus
            ></ha-textfield>
            <ha-button
              .loading=${this._processing}
              @click=${this._addRepository}
              appearance="filled"
              size="small"
            >
              <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.apps.dialog.repositories.add"
              )}
            </ha-button>
          </div>
        </div>
        <ha-button slot="primaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.close")}
        </ha-button>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog.button-left {
          --justify-action-buttons: flex-start;
        }
        .form {
          color: var(--primary-text-color);
        }
        .option {
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-sm);
          margin-top: 4px;
        }
        ha-button {
          margin-left: var(--ha-space-2);
          margin-inline-start: var(--ha-space-2);
          margin-inline-end: initial;
        }
        div.delete ha-icon-button {
          color: var(--error-color);
        }
        ha-md-list-item {
          position: relative;
          --md-item-overflow: visible;
        }
      `,
    ];
  }

  public focus() {
    this.updateComplete.then(() =>
      (
        this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
      )?.focus()
    );
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
