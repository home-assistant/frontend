import "@material/mwc-button/mwc-button";
import { mdiDelete, mdiDeleteOff } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../../src/common/string/compare";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-circular-progress";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-icon-button";
import {
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
import { HassioRepositoryDialogParams } from "./show-dialog-repositories";

@customElement("dialog-hassio-repositories")
class HassioRepositoriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @query("#repository_input", true) private _optionInput?: PaperInputElement;

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
          repo.slug !== "5c53de3b" // The ESPHome repository
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
          ${repositories.length
            ? repositories.map(
                (repo) => html`
                  <paper-item class="option">
                    <paper-item-body three-line>
                      <div>${repo.name}</div>
                      <div secondary>${repo.maintainer}</div>
                      <div secondary>${repo.url}</div>
                    </paper-item-body>
                    <div class="delete">
                      <ha-icon-button
                        .label=${this._dialogParams!.supervisor.localize(
                          "dialog.repositories.remove"
                        )}
                        .disabled=${usedRepositories.includes(repo.slug)}
                        .slug=${repo.slug}
                        .path=${usedRepositories.includes(repo.slug)
                          ? mdiDeleteOff
                          : mdiDelete}
                        @click=${this._removeRepository}
                      >
                      </ha-icon-button>
                      <simple-tooltip
                        animation-delay="0"
                        position="bottom"
                        offset="1"
                      >
                        ${this._dialogParams!.supervisor.localize(
                          usedRepositories.includes(repo.slug)
                            ? "dialog.repositories.used"
                            : "dialog.repositories.remove"
                        )}
                      </simple-tooltip>
                    </div>
                  </paper-item>
                `
              )
            : html`<paper-item> No repositories </paper-item>`}
          <div class="layout horizontal bottom">
            <paper-input
              class="flex-auto"
              id="repository_input"
              .value=${this._dialogParams!.url || ""}
              .label=${this._dialogParams!.supervisor.localize(
                "dialog.repositories.add"
              )}
              @keydown=${this._handleKeyAdd}
              dialogInitialFocus
            ></paper-input>
            <mwc-button @click=${this._addRepository}>
              ${this._processing
                ? html`<ha-circular-progress
                    active
                    size="small"
                  ></ha-circular-progress>`
                : this._dialogParams!.supervisor.localize(
                    "dialog.repositories.add"
                  )}
            </mwc-button>
          </div>
        </div>
        <mwc-button slot="primaryAction" @click=${this.closeDialog}>
          ${this._dialogParams?.supervisor.localize("common.close")}
        </mwc-button>
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
        paper-icon-item {
          cursor: pointer;
        }
        .form {
          color: var(--primary-text-color);
        }
        .option {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
        }
        mwc-button {
          margin-left: 8px;
        }
        ha-circular-progress {
          display: block;
          margin: 32px;
          text-align: center;
        }
        div.delete ha-icon-button {
          color: var(--error-color);
        }
      `,
    ];
  }

  public focus() {
    this.updateComplete.then(
      () =>
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
