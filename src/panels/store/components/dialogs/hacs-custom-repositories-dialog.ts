import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiDelete } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import { createCloseHeading } from "../../../homeassistant-frontend/src/components/ha-dialog";
import "../../../homeassistant-frontend/src/components/ha-form/ha-form";
import type { HaFormSchema } from "../../../homeassistant-frontend/src/components/ha-form/types";
import "../../../homeassistant-frontend/src/components/ha-settings-row";
import "../../../homeassistant-frontend/src/components/ha-svg-icon";
import type { HomeAssistant } from "../../../homeassistant-frontend/src/types";
import { HacsDispatchEvent } from "../../data/common";
import {
  getRepositories,
  repositoryAdd,
  repositoryDelete,
  websocketSubscription,
} from "../../data/websocket";
import type { HacsCustomRepositoriesDialogParams } from "./show-hacs-dialog";

@customElement("hacs-custom-repositories-dialog")
export class HacsCustomRepositoriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() _dialogParams?: HacsCustomRepositoriesDialogParams;

  @state() _waiting?: boolean;

  @state() _errors?: Record<string, string>;

  @state() _data?: { repository: string; category: string };

  _errorSubscription: any;

  public async showDialog(dialogParams: HacsCustomRepositoriesDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    this._errorSubscription = await websocketSubscription(
      this.hass,
      (data) => {
        console.log(data);
        this._errors = { base: data?.message || data };
      },
      HacsDispatchEvent.ERROR,
    );
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._waiting = undefined;
    this._errors = undefined;
    if (this._errorSubscription) {
      this._errorSubscription();
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._dialogParams.hacs.localize("dialog_custom_repositories.title"),
        )}
        @closed=${this.closeDialog}
      >
        <div>
          <div class="list">
            ${this._dialogParams.hacs.repositories
              .filter((repository) => repository.custom)
              ?.filter((repository) =>
                this._dialogParams!.hacs.info.categories.includes(repository.category),
              )
              .map(
                (repository) =>
                  html` <ha-settings-row>
                    <span slot="heading">${repository.name}</span>
                    <span slot="description">${repository.full_name} (${repository.category})</span>

                    <mwc-icon-button
                      @click=${(ev: Event) => {
                        ev.preventDefault();
                        this._removeRepository(String(repository.id));
                        this.dispatchEvent(
                          new CustomEvent("closed", {
                            bubbles: true,
                            composed: true,
                          }),
                        );
                      }}
                    >
                      <ha-svg-icon class="delete" .path=${mdiDelete}></ha-svg-icon>
                    </mwc-icon-button>
                  </ha-settings-row>`,
              )}
          </div>
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${[
              {
                name: "repository",
                selector: { text: {} },
              },
              {
                name: "category",
                selector: {
                  select: {
                    mode: "dropdown",
                    options: this._dialogParams.hacs.info.categories.map((category) => ({
                      value: category,
                      label: this._dialogParams!.hacs.localize(`common.type.${category}`),
                    })),
                  },
                },
              },
            ]}
            .error=${this._errors}
            .computeLabel=${(schema: HaFormSchema) =>
              schema.name === "category"
                ? this._dialogParams!.hacs.localize("dialog_custom_repositories.type")
                : this._dialogParams!.hacs.localize("common.repository")}
            @value-changed=${this._valueChanged}
            dialogInitialFocus
          ></ha-form>
          ${this._waiting
            ? html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
            : nothing}
        </div>
        <mwc-button slot="secondaryAction" @click=${this.closeDialog} dialogInitialFocus>
          ${this._dialogParams.hacs.localize("common.cancel")}
        </mwc-button>
        <mwc-button
          .disabled=${this._waiting ||
          !this._data ||
          !this._data.repository ||
          !this._data.category}
          slot="primaryAction"
          @click=${this._addRepository}
        >
          ${this._dialogParams.hacs.localize("common.add")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    this._data = { ...this._data, ...ev.detail.value };
  }

  private async _addRepository() {
    this._errors = {};

    if (!this._data?.category) {
      this._errors = {
        base: this._dialogParams!.hacs.localize("dialog_custom_repositories.no_type"),
      };
      return;
    }
    if (!this._data?.repository) {
      this._errors = {
        base: this._dialogParams!.hacs.localize("dialog_custom_repositories.no_repository"),
      };
      return;
    }
    this._waiting = false;
    await repositoryAdd(this.hass, this._data.repository, this._data.category);
    await this._updateRepositories();
  }

  private async _removeRepository(repository: string) {
    this._waiting = true;
    await repositoryDelete(this.hass, repository);
    await this._updateRepositories();
    this._waiting = false;
  }
  private async _updateRepositories() {
    const repositories = await getRepositories(this.hass);
    this.dispatchEvent(
      new CustomEvent("update-hacs", {
        detail: { repositories },
        bubbles: true,
        composed: true,
      }),
    );
    this._dialogParams = {
      ...this._dialogParams,
      hacs: { ...this._dialogParams!.hacs, repositories },
    };
  }

  static get styles() {
    return [
      css`
        .list {
          position: relative;
          max-height: calc(100vh - 500px);
          overflow: auto;
        }
        a {
          all: unset;
        }
        mwc-linear-progress {
          margin-bottom: -8px;
          margin-top: 4px;
        }
        ha-svg-icon {
          --mdc-icon-size: 36px;
        }
        ha-svg-icon:not(.delete) {
          margin-right: 4px;
        }
        ha-settings-row {
          cursor: pointer;
          padding: 0;
        }
        .delete {
          color: var(--hcv-color-error);
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          .list {
            max-height: calc(100vh - 162px);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hacs-custom-repositories-dialog": HacsCustomRepositoriesDialog;
  }
}
