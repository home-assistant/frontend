import { mdiDelete } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../components/ha-form/types";
import "../../../components/ha-icon-button";
import type { HaIconButton } from "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
import "../../../components/ha-svg-icon";
import "../../../components/progress/ha-progress-bar";
import type { HomeAssistant } from "../../../types";
import { MarketplaceDispatchEvent } from "../data/common";
import {
  getRepositories,
  repositoryAdd,
  repositoryDelete,
  websocketSubscription,
} from "../data/websocket";
import { marketplaceStyleVariables } from "../styles/variables";
import type { MarketplaceCustomRepositoriesDialogParams } from "./show-dialog-marketplace";

@customElement("dialog-marketplace-custom-repositories")
export class DialogMarketplaceCustomRepositories extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: MarketplaceCustomRepositoriesDialogParams;

  @state() private _waiting?: boolean;

  @state() private _errors?: Record<string, string>;

  @state() private _data?: { repository: string; category: string };

  private _errorSubscription?: UnsubscribeFunc;

  public async showDialog(
    dialogParams: MarketplaceCustomRepositoriesDialogParams
  ): Promise<void> {
    this._dialogParams = dialogParams;
    this._errorSubscription = await websocketSubscription(
      this.hass,
      (data) => {
        this._errors = { base: data?.message || data };
      },
      MarketplaceDispatchEvent.ERROR
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
        .headerTitle=${this.hass.localize(
          "ui.panel.marketplace.dialog_custom_repositories.title"
        )}
        @closed=${this.closeDialog}
      >
        <div>
          <div class="list">
            ${this._dialogParams.marketplace.repositories
              .filter((repository) => repository.custom)
              ?.filter((repository) =>
                this._dialogParams!.marketplace.info.categories.includes(
                  repository.category
                )
              )
              .map(
                (repository) =>
                  html` <ha-settings-row>
                    <span slot="heading">${repository.name}</span>
                    <span slot="description"
                      >${repository.full_name} (${repository.category})</span
                    >

                    <ha-icon-button
                      .label=${this.hass.localize(
                        "ui.panel.marketplace.common.remove"
                      )}
                      .repositoryId=${String(repository.id)}
                      @click=${this._handleRemoveClick}
                    >
                      <ha-svg-icon
                        class="delete"
                        .path=${mdiDelete}
                      ></ha-svg-icon>
                    </ha-icon-button>
                  </ha-settings-row>`
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
                    options: this._dialogParams.marketplace.info.categories.map(
                      (category) => ({
                        value: category,
                        label: this.hass.localize(
                          `ui.panel.marketplace.common.type.${category}`
                        ),
                      })
                    ),
                  },
                },
              },
            ]}
            .error=${this._errors}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
            autofocus
          ></ha-form>
          ${
            this._waiting
              ? html`<ha-progress-bar indeterminate></ha-progress-bar>`
              : nothing
          }
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.panel.marketplace.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            appearance="filled"
            .disabled=${
              this._waiting ||
              !this._data ||
              !this._data.repository ||
              !this._data.category
            }
            @click=${this._addRepository}
          >
            ${this.hass.localize("ui.panel.marketplace.common.add")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _computeLabel = (schema: HaFormSchema): string =>
    schema.name === "category"
      ? this.hass.localize(
          "ui.panel.marketplace.dialog_custom_repositories.type"
        )
      : this.hass.localize("ui.panel.marketplace.common.repository");

  private _valueChanged(ev: CustomEvent) {
    this._data = { ...this._data, ...ev.detail.value };
  }

  private _handleRemoveClick(
    ev: HASSDomCurrentTargetEvent<HaIconButton & { repositoryId: string }>
  ) {
    ev.preventDefault();
    this._removeRepository(ev.currentTarget.repositoryId);
  }

  private async _addRepository() {
    this._errors = {};

    if (!this._data?.category) {
      this._errors = {
        base: this.hass.localize(
          "ui.panel.marketplace.dialog_custom_repositories.no_type"
        ),
      };
      return;
    }
    if (!this._data?.repository) {
      this._errors = {
        base: this.hass.localize(
          "ui.panel.marketplace.dialog_custom_repositories.no_repository"
        ),
      };
      return;
    }
    this._waiting = true;
    try {
      const errors = await repositoryAdd(
        this.hass,
        this._data.repository,
        this._data.category
      );
      if (errors) {
        this._errors = errors;
        return;
      }

      await this._updateRepositories();
    } catch (err: any) {
      this._errors = { base: this._errorMessage(err) };
    } finally {
      this._waiting = false;
    }
  }

  private async _removeRepository(repository: string) {
    this._waiting = true;
    try {
      await repositoryDelete(this.hass, repository);
      await this._updateRepositories();
    } catch (err: any) {
      this._errors = { base: this._errorMessage(err) };
    } finally {
      this._waiting = false;
    }
  }

  private _errorMessage(err: { message?: string }): string {
    return (
      err?.message ||
      this.hass.localize("ui.panel.marketplace.common.unknown_error")
    );
  }

  private async _updateRepositories() {
    const repositories = await getRepositories(this.hass);
    fireEvent(this, "marketplace-refresh");
    this._dialogParams = {
      ...this._dialogParams,
      marketplace: { ...this._dialogParams!.marketplace, repositories },
    };
  }

  static get styles() {
    return [
      marketplaceStyleVariables,
      css`
        ha-progress-bar {
          margin-bottom: -8px;
          margin-top: 4px;
        }
        ha-settings-row {
          padding: 0;
        }
        .delete {
          color: var(--marketplace-color-error);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-marketplace-custom-repositories": DialogMarketplaceCustomRepositories;
  }
}
