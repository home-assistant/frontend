import { mdiDelete, mdiDeleteOff, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../../src/common/string/compare";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-tooltip";
import "../../../../src/components/ha-svg-icon";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-icon-button";
import type {
  HassioAddonInfo,
  HassioAddonRepository,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  addStoreRepository,
  fetchStoreRepositories,
  removeStoreRepository,
} from "../../../../src/data/supervisor/store";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import type { HassioRepositoryDialogParams } from "./show-dialog-repositories";
import type { HaTextField } from "../../../../src/components/ha-textfield";
import "../../../../src/components/ha-textfield";
import "../../../../src/components/ha-md-list";
import "../../../../src/components/ha-md-list-item";

@customElement("dialog-hassio-repositories")
class HassioRepositoriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @query("#repository_input", true) private _optionInput?: HaTextField;

  @state() private _repositories?: HassioAddonRepository[];

  @state() private _dialogParams?: HassioRepositoryDialogParams;

  @state() private _opened = false;

  @state() private _processing = false;

  @state() private _error?: string;

  public async showDialog(
    dialogParams: HassioRepositoryDialogParams
  ): Promise<void> {
    this._dialogParams = dialogParams;
    this._opened = true;
    await this._loadData();
    await this.updateComplete;
  }

  public closeDialog(): void {
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
    if (!this._dialogParams?.supervisor || this._repositories === undefined) {
      return nothing;
    }
    const repositories = this._filteredRepositories(this._repositories);
    const usedRepositories = this._filteredUsedRepositories(
      repositories,
      this._dialogParams.supervisor.addon.addons
    );
    return html`
      <ha-dialog
        .open=${this._opened}
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._dialogParams!.supervisor.localize("dialog.repositories.title")
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
                        ${this._dialogParams!.supervisor.localize(
                          usedRepositories.includes(repo.slug)
                            ? "dialog.repositories.used"
                            : "dialog.repositories.remove"
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
                  >${this._dialogParams!.supervisor.localize(
                    "dialog.repositories.no_repositories"
                  )}</ha-md-list-item
                >`}
          </ha-md-list>
          <div class="layout horizontal bottom">
            <ha-textfield
              class="flex-auto"
              id="repository_input"
              .value=${this._dialogParams!.url || ""}
              .label=${this._dialogParams!.supervisor.localize(
                "dialog.repositories.add"
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
              ${this._dialogParams!.supervisor.localize(
                "dialog.repositories.add"
              )}
            </ha-button>
          </div>
        </div>
        <ha-button slot="primaryAction" @click=${this.closeDialog}>
          ${this._dialogParams?.supervisor.localize("common.close")}
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
          border-radius: 4px;
          margin-top: 4px;
        }
        ha-button {
          margin-left: 8px;
          margin-inline-start: 8px;
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

      fireEvent(this, "supervisor-collection-refresh", { collection: "addon" });
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

      fireEvent(this, "supervisor-collection-refresh", { collection: "store" });

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

      fireEvent(this, "supervisor-collection-refresh", { collection: "store" });
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-repositories": HassioRepositoriesDialog;
  }
}
