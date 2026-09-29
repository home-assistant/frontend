import type { ContextType } from "@lit/context";
import { mdiDelete, mdiDeleteOff } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../components/ha-form/types";
import "../../../components/ha-icon-button";
import type { HaIconButton } from "../../../components/ha-icon-button";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-tooltip";
import "../../../components/ha-svg-icon";
import "../../../components/progress/ha-progress-bar";
import {
  apiContext,
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import type {
  RepositoryBase,
  RepositoryType,
} from "../../../data/marketplace/repository";
import {
  ERROR_GITHUB_NOT_CONNECTED,
  getRepositories,
  handleWarningNotAccepted,
  isWebSocketError,
  repositoryAdd,
  repositoryDelete,
  websocketErrorMessage,
} from "../../../data/marketplace/websocket";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { MarketplaceHass } from "../tools/connect-github";
import { showConnectGitHubFlow } from "../tools/connect-github";
import type { MarketplaceCustomRepositoriesDialogParams } from "./show-dialog-marketplace-custom-repositories";

@customElement("dialog-marketplace-custom-repositories")
export class DialogMarketplaceCustomRepositories extends DialogMixin<MarketplaceCustomRepositoriesDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _repositories: RepositoryBase[] = [];

  @state() private _waiting?: boolean;

  @state() private _errors?: Record<string, string>;

  @state() private _data?: { repository: string; category: string };

  @state() private _githubConnected = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this.params) {
      return;
    }

    this._repositories = this.params.marketplace.repositories;
    this._githubConnected = this.params.marketplace.info.github_connected;
  }

  // The Marketplace helpers take a hass object, dialogs only get contexts.
  private get _hass(): MarketplaceHass {
    return {
      callApi: this._api.callApi,
      connection: this._connection.connection,
      localize: this._i18n.localize,
    };
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        .headerTitle=${this._i18n.localize(
          "ui.panel.marketplace.dialog_custom_repositories.title"
        )}
      >
        <div>
          <ha-md-list>
            ${this._repositories
              .filter((repository) => repository.custom)
              .filter((repository) =>
                this.params!.marketplace.info.categories.includes(
                  repository.category
                )
              )
              .map(
                (repository) =>
                  html`<ha-md-list-item>
                    <span slot="headline">${repository.name}</span>
                    <span slot="supporting-text"
                      >${repository.full_name}
                      (${this._i18n.localize(
                        `ui.panel.marketplace.common.type.${repository.category}`
                      )})</span
                    >
                    <ha-icon-button
                      slot="end"
                      id="remove-${repository.id}"
                      class="delete"
                      .label=${this._i18n.localize("ui.common.remove")}
                      .path=${repository.installed ? mdiDeleteOff : mdiDelete}
                      .disabled=${repository.installed}
                      data-repository-id=${repository.id}
                      @click=${this._handleRemoveClick}
                    ></ha-icon-button>
                    <ha-tooltip slot="end" .for=${`remove-${repository.id}`}>
                      ${this._i18n.localize(
                        // Forgetting a download would leave its files running
                        repository.installed
                          ? "ui.panel.marketplace.dialog_custom_repositories.remove_downloaded"
                          : "ui.common.remove"
                      )}
                    </ha-tooltip>
                  </ha-md-list-item>`
              )}
          </ha-md-list>
          ${
            this._githubConnected
              ? nothing
              : html`<ha-alert alert-type="info">
                  ${this._i18n.localize(
                    "ui.panel.marketplace.dialog_custom_repositories.github_needed"
                  )}
                </ha-alert>`
          }
          <ha-form
            .data=${this._data ?? {}}
            .schema=${this._schema(this.params.marketplace.info.categories)}
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
            ${this._i18n.localize("ui.common.cancel")}
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
            ${this._i18n.localize("ui.common.add")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _schema = memoizeOne(
    (categories: RepositoryType[]): HaFormSchema[] => [
      {
        name: "repository",
        selector: { text: {} },
      },
      {
        name: "category",
        selector: {
          select: {
            mode: "dropdown",
            options: categories.map((category) => ({
              value: category,
              label: this._i18n.localize(
                `ui.panel.marketplace.common.type.${category}`
              ),
            })),
          },
        },
      },
    ]
  );

  private _computeLabel = (schema: HaFormSchema): string =>
    schema.name === "category"
      ? this._i18n.localize(
          "ui.panel.marketplace.dialog_custom_repositories.type"
        )
      : this._i18n.localize("ui.panel.marketplace.common.repository");

  private _valueChanged(ev: CustomEvent) {
    this._data = { ...this._data, ...ev.detail.value };
  }

  private _handleRemoveClick(ev: HASSDomCurrentTargetEvent<HaIconButton>) {
    ev.preventDefault();
    const repositoryId = ev.currentTarget.dataset.repositoryId!;
    const repository = this._repositories.find(
      (item) => String(item.id) === repositoryId
    );

    // Like removing an app repository, and it can be added again later
    showConfirmationDialog(this, {
      title: this._i18n.localize(
        "ui.panel.marketplace.dialog_custom_repositories.remove_title",
        { name: repository?.name ?? repositoryId }
      ),
      text: this._i18n.localize(
        "ui.panel.marketplace.dialog_custom_repositories.remove_text"
      ),
      confirmText: this._i18n.localize("ui.common.remove"),
      destructive: true,
      action: () => this._removeRepository(repositoryId),
    });
  }

  private async _addRepository() {
    this._errors = {};

    if (!this._data?.category) {
      this._errors = {
        base: this._i18n.localize(
          "ui.panel.marketplace.dialog_custom_repositories.no_type"
        ),
      };
      return;
    }
    if (!this._data?.repository) {
      this._errors = {
        base: this._i18n.localize(
          "ui.panel.marketplace.dialog_custom_repositories.no_repository"
        ),
      };
      return;
    }

    // Connect first and then add what was typed, so one press is enough.
    if (!this._githubConnected) {
      this._githubConnected = await showConnectGitHubFlow(this, this._hass);
      if (!this._githubConnected || !this.isConnected) {
        return;
      }
    }

    this._waiting = true;
    try {
      await repositoryAdd(
        this._hass,
        this._data.repository,
        this._data.category
      );
      await this._updateRepositories();
    } catch (err: unknown) {
      if (handleWarningNotAccepted(err)) {
        this.closeDialog();
        return;
      }

      // The dialog can be closed while waiting for the backend.
      if (!this.isConnected) {
        return;
      }

      // GitHub got disconnected after the dialog opened, the hint comes back
      // and the next press connects again.
      if (isWebSocketError(err, ERROR_GITHUB_NOT_CONNECTED)) {
        this._githubConnected = false;
        return;
      }

      this._errors = { base: this._errorMessage(err) };
    } finally {
      this._waiting = false;
    }
  }

  private async _removeRepository(repository: string) {
    this._waiting = true;
    try {
      await repositoryDelete(this._hass, repository);
      await this._updateRepositories();
    } catch (err: unknown) {
      if (this.isConnected) {
        this._errors = { base: this._errorMessage(err) };
      }
    } finally {
      this._waiting = false;
    }
  }

  private _errorMessage(err: unknown): string {
    return (
      websocketErrorMessage(err) ||
      this._i18n.localize("ui.panel.marketplace.common.unknown_error")
    );
  }

  private async _updateRepositories() {
    const repositories = await getRepositories(this._hass);
    // A dialog closed meanwhile is detached, its events reach nobody.
    fireEvent(window, "marketplace-refresh");

    if (this.isConnected) {
      this._repositories = repositories;
    }
  }

  static get styles() {
    return [
      css`
        ha-progress-bar {
          margin-block-end: calc(-1 * var(--ha-space-2));
          margin-block-start: var(--ha-space-1);
        }
        ha-md-list {
          padding: 0;
        }
        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-2);
        }
        .delete {
          color: var(--error-color);
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
