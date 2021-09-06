import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiDelete } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-circular-progress";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-svg-icon";
import {
  fetchHassioAddonsInfo,
  HassioAddonRepository,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { setSupervisorOption } from "../../../../src/data/hassio/supervisor";
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
      .filter((repo) => repo.slug !== "core" && repo.slug !== "local")
      .sort((a, b) => (a.name < b.name ? -1 : 1))
  );

  protected render(): TemplateResult {
    if (!this._dialogParams?.supervisor || this._repositories === undefined) {
      return html``;
    }
    const repositories = this._filteredRepositories(this._repositories);
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
                    <mwc-icon-button
                      .slug=${repo.slug}
                      .title=${this._dialogParams!.supervisor.localize(
                        "dialog.repositories.remove"
                      )}
                      @click=${this._removeRepository}
                    >
                      <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                    </mwc-icon-button>
                  </paper-item>
                `
              )
            : html` <paper-item> No repositories </paper-item> `}
          <div class="layout horizontal bottom">
            <paper-input
              class="flex-auto"
              id="repository_input"
              .value=${this._dialogParams!.url || ""}
              .label=${this._dialogParams!.supervisor.localize(
                "dialog.repositories.add"
              )}
              @keydown=${this._handleKeyAdd}
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
    if (ev.keyCode !== 13) {
      return;
    }
    this._addRepository();
  }

  private async _loadData(): Promise<void> {
    try {
      const addonsinfo = await fetchHassioAddonsInfo(this.hass);

      this._repositories = addonsinfo.repositories;

      fireEvent(this, "supervisor-collection-refresh", { collection: "addon" });
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
  }

  private async _addRepository() {
    const input = this._optionInput;
    if (!input || !input.value) {
      return;
    }
    this._processing = true;
    const repositories = this._filteredRepositories(this._repositories!);
    const newRepositories = repositories.map((repo) => repo.source);
    newRepositories.push(input.value);

    try {
      await setSupervisorOption(this.hass, {
        addons_repositories: newRepositories,
      });
      await this._loadData();

      input.value = "";
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
    this._processing = false;
  }

  private async _removeRepository(ev: Event) {
    const slug = (ev.currentTarget as any).slug;
    const repositories = this._filteredRepositories(this._repositories!);
    const repository = repositories.find((repo) => repo.slug === slug);
    if (!repository) {
      return;
    }
    const newRepositories = repositories
      .map((repo) => repo.source)
      .filter((repo) => repo !== repository.source);

    try {
      await setSupervisorOption(this.hass, {
        addons_repositories: newRepositories,
      });
      await this._loadData();
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
