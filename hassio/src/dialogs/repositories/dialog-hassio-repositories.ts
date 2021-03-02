import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiDelete } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import "../../../../src/components/ha-circular-progress";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-svg-icon";
import {
  fetchHassioAddonsInfo,
  HassioAddonRepository,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { setSupervisorOption } from "../../../../src/data/hassio/supervisor";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { HassioRepositoryDialogParams } from "./show-dialog-repositories";

@customElement("dialog-hassio-repositories")
class HassioRepositoriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) private _repos: HassioAddonRepository[] = [];

  @property({ attribute: false })
  private _dialogParams?: HassioRepositoryDialogParams;

  @query("#repository_input", true) private _optionInput?: PaperInputElement;

  @internalProperty() private _opened = false;

  @internalProperty() private _prosessing = false;

  @internalProperty() private _error?: string;

  public async showDialog(
    dialogParams: HassioRepositoryDialogParams
  ): Promise<void> {
    this._dialogParams = dialogParams;
    this.supervisor = dialogParams.supervisor;
    this._opened = true;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._opened = false;
    this._error = "";
  }

  private _filteredRepositories = memoizeOne((repos: HassioAddonRepository[]) =>
    repos
      .filter((repo) => repo.slug !== "core" && repo.slug !== "local")
      .sort((a, b) => (a.name < b.name ? -1 : 1))
  );

  protected render(): TemplateResult {
    const repositories = this._filteredRepositories(
      this.supervisor.addon.repositories
    );
    return html`
      <ha-dialog
        .open=${this._opened}
        @closing=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.supervisor.localize("dialog.repositories.title")
        )}
      >
        ${this._error ? html`<div class="error">${this._error}</div>` : ""}
        <div class="form">
          ${repositories.length
            ? repositories.map((repo) => {
                return html`
                  <paper-item class="option">
                    <paper-item-body three-line>
                      <div>${repo.name}</div>
                      <div secondary>${repo.maintainer}</div>
                      <div secondary>${repo.url}</div>
                    </paper-item-body>
                    <mwc-icon-button
                      .slug=${repo.slug}
                      .title=${this.supervisor.localize(
                        "dialog.repositories.remove"
                      )}
                      @click=${this._removeRepository}
                    >
                      <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                    </mwc-icon-button>
                  </paper-item>
                `;
              })
            : html`
                <paper-item>
                  No repositories
                </paper-item>
              `}
          <div class="layout horizontal bottom">
            <paper-input
              class="flex-auto"
              id="repository_input"
              .label=${this.supervisor.localize("dialog.repositories.add")}
              @keydown=${this._handleKeyAdd}
            ></paper-input>
            <mwc-button @click=${this._addRepository}>
              ${this._prosessing
                ? html`<ha-circular-progress active></ha-circular-progress>`
                : this.supervisor.localize("dialog.repositories.add")}
            </mwc-button>
          </div>
        </div>
        <mwc-button slot="primaryAction" @click="${this.closeDialog}">
          Close
        </mwc-button>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResult[] {
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
        ha-paper-dropdown-menu {
          display: block;
        }
      `,
    ];
  }

  public focus() {
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement)?.focus()
    );
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.keyCode !== 13) {
      return;
    }
    this._addRepository();
  }

  private async _addRepository() {
    const input = this._optionInput;
    if (!input || !input.value) {
      return;
    }
    this._prosessing = true;
    const repositories = this._filteredRepositories(this._repos);
    const newRepositories = repositories.map((repo) => {
      return repo.source;
    });
    newRepositories.push(input.value);

    try {
      await setSupervisorOption(this.hass, {
        addons_repositories: newRepositories,
      });

      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      this._repos = addonsInfo.repositories;

      await this._dialogParams!.loadData();

      input.value = "";
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
    this._prosessing = false;
  }

  private async _removeRepository(ev: Event) {
    const slug = (ev.currentTarget as any).slug;
    const repositories = this._filteredRepositories(this._repos);
    const repository = repositories.find((repo) => {
      return repo.slug === slug;
    });
    if (!repository) {
      return;
    }
    const newRepositories = repositories
      .map((repo) => {
        return repo.source;
      })
      .filter((repo) => {
        return repo !== repository.source;
      });

    try {
      await setSupervisorOption(this.hass, {
        addons_repositories: newRepositories,
      });

      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      this._repos = addonsInfo.repositories;

      await this._dialogParams!.loadData();
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-repositories": HassioRepositoriesDialog;
  }
}
