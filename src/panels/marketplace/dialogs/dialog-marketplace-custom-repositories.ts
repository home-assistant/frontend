import type { ContextType } from "@lit/context";
import { mdiDelete, mdiDeleteOff } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../components/ha-form/types";
import "../../../components/ha-icon-button";
import "../../../components/item/ha-list-item-base";
import "../../../components/list/ha-list-base";
import type { HaIconButton } from "../../../components/ha-icon-button";
import "../../../components/ha-tooltip";
import "../../../components/ha-svg-icon";
import "../../../components/progress/ha-progress-bar";
import { apiContext, internationalizationContext } from "../../../data/context";
import type {
  RepositoryBase,
  RepositoryType,
} from "../../../data/marketplace/repository";
import {
  ERROR_GITHUB_NOT_CONNECTED,
  isWebSocketError,
  marketplaceErrorMessage,
} from "../../../data/marketplace/websocket";
import {
  addMarketplaceRepository,
  detectMarketplaceRepository,
  fetchMarketplaceRepositories,
  removeMarketplaceRepository,
} from "../../../data/marketplace/repository";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
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
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _repositories: RepositoryBase[] = [];

  @state() private _waiting?: boolean;

  @state() private _errors?: Record<string, string>;

  @state() private _data?: { repository: string; category?: RepositoryType };

  // What was found out about the link, set when that did not settle the type
  @state() private _detected?: RepositoryType[];

  @state() private _githubConnected = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this.params) {
      return;
    }

    this._repositories = this.params.marketplace.repositories;
    this._githubConnected = this.params.marketplace.info.github_connected;
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
          <p class="intro">
            ${this._i18n.localize(
              "ui.panel.marketplace.dialog_custom_repositories.intro"
            )}
          </p>
          ${this._renderAdded()}
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
            .schema=${this._schema(this._i18n.localize, this._typeOptions())}
            .error=${this._errors}
            .computeLabel=${this._computeLabel}
            .computeHelper=${this._computeHelper}
            .disabled=${this._waiting}
            @value-changed=${this._valueChanged}
            autofocus
          ></ha-form>
          ${
            this._detected
              ? html`<ha-alert alert-type="info" class="type-unknown">
                  ${this._i18n.localize(
                    this._detected.length > 1
                      ? "ui.panel.marketplace.dialog_custom_repositories.type_several"
                      : "ui.panel.marketplace.dialog_custom_repositories.type_unknown"
                  )}
                </ha-alert>`
              : nothing
          }
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
              !this._data?.repository ||
              (this._detected && !this._data.category)
            }
            @click=${this._addRepository}
          >
            ${this._i18n.localize("ui.common.add")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  // Only what was added from a link, and only once there is any
  private _renderAdded() {
    const added = this._repositories
      .filter((repository) => repository.custom)
      .filter((repository) =>
        this.params!.marketplace.info.categories.includes(repository.category)
      );
    if (!added.length) {
      return nothing;
    }

    return html`<h3>
        ${this._i18n.localize(
          "ui.panel.marketplace.dialog_custom_repositories.added"
        )}
      </h3>
      <ha-list-base>
        ${added.map(
          (repository) =>
            html`<ha-list-item-base>
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
                  // Forgetting an installed repository would leave its files running
                  repository.installed
                    ? "ui.panel.marketplace.dialog_custom_repositories.remove_installed"
                    : "ui.common.remove"
                )}
              </ha-tooltip>
            </ha-list-item-base>`
        )}
      </ha-list-base>`;
  }

  // Only when the type could not be found out, from what it might be
  private _typeOptions(): RepositoryType[] | undefined {
    if (!this._detected) {
      return undefined;
    }
    return this._detected.length > 1
      ? this._detected
      : this.params!.marketplace.info.categories;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, categories?: RepositoryType[]): HaFormSchema[] => [
      {
        name: "repository",
        selector: { text: {} },
      },
      ...(categories
        ? [
            {
              name: "category",
              selector: {
                select: {
                  mode: "dropdown" as const,
                  options: categories.map((category) => ({
                    value: category,
                    label: localize(
                      `ui.panel.marketplace.common.type.${category}`
                    ),
                  })),
                },
              },
            },
          ]
        : []),
    ]
  );

  private _computeLabel = (schema: HaFormSchema): string =>
    this._i18n.localize(
      schema.name === "category"
        ? "ui.panel.marketplace.dialog_custom_repositories.type"
        : "ui.panel.marketplace.dialog_custom_repositories.link"
    );

  private _computeHelper = (schema: HaFormSchema): string =>
    this._i18n.localize(
      schema.name === "category"
        ? "ui.panel.marketplace.dialog_custom_repositories.type_helper"
        : "ui.panel.marketplace.dialog_custom_repositories.link_helper"
    );

  private _valueChanged(ev: CustomEvent) {
    const data = { ...this._data, ...ev.detail.value };
    // Another link holds something else, it is found out again
    if (data.repository !== this._data?.repository) {
      this._detected = undefined;
      delete data.category;
    }
    this._data = data;
  }

  private async _handleRemoveClick(
    ev: HASSDomCurrentTargetEvent<HaIconButton>
  ) {
    ev.preventDefault();
    const repositoryId = ev.currentTarget.dataset.repositoryId!;
    const repository = this._repositories.find(
      (item) => item.id === repositoryId
    );

    // Like removing an app repository, and it can be added again later. Asked
    // first, a failure then shows here instead of behind a closed question.
    const confirmed = await showConfirmationDialog(this, {
      title: this._i18n.localize(
        "ui.panel.marketplace.dialog_custom_repositories.remove_title",
        { name: repository?.name ?? repositoryId }
      ),
      text: this._i18n.localize(
        "ui.panel.marketplace.dialog_custom_repositories.remove_text"
      ),
      confirmText: this._i18n.localize("ui.common.remove"),
      destructive: true,
    });
    if (confirmed) {
      await this._removeRepository(repositoryId);
    }
  }

  private async _addRepository() {
    this._errors = {};

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
      this._githubConnected = await showConnectGitHubFlow(
        this,
        this._api,
        this._i18n.localize
      );
      if (!this._githubConnected || !this.isConnected) {
        return;
      }
    }

    // What was asked for, the form can change while it is found out
    const { repository } = this._data;
    this._waiting = true;
    try {
      let category = this._data.category;
      if (!category) {
        const { categories } = await detectMarketplaceRepository(
          this._api,
          repository
        );
        if (!this.isConnected || this._data?.repository !== repository) {
          return;
        }
        // Asked once it is clear it has to be, otherwise added right away
        if (categories.length !== 1) {
          this._detected = categories;
          return;
        }
        category = categories[0];
      }

      await addMarketplaceRepository(this._api, repository, category);
      this._detected = undefined;
      await this._updateRepositories();
    } catch (err: unknown) {
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
      await removeMarketplaceRepository(this._api, repository);
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
    return marketplaceErrorMessage(err, this._i18n.localize);
  }

  private async _updateRepositories() {
    // The panel hears the change from the backend, this is for the dialog
    const repositories = await fetchMarketplaceRepositories(this._api);

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
        .intro {
          margin: 0 0 var(--ha-space-4);
        }
        h3 {
          margin: 0;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }
        ha-list-base {
          padding: 0;
          margin-block-end: var(--ha-space-4);
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
