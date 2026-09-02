import {
  mdiAccount,
  mdiArrowDownBold,
  mdiCube,
  mdiDotsVertical,
  mdiDownload,
  mdiExclamationThick,
  mdiStar,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { extractSearchParamsObject } from "../../../common/url/search-params";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/chips/ha-assist-chip";
import "../../../components/chips/ha-chip-set";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-markdown";
import "@home-assistant/webawesome/dist/components/divider/divider";
import "../../../components/ha-dropdown";
import type { HaDropdown } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { showStoreDownloadDialog } from "../dialogs/show-dialog-store";
import { repositoryMenuItems } from "../components/ha-store-repository-overflow-menu";
import type { StoreData } from "../data/store";
import type { RepositoryBase, RepositoryInfo } from "../data/repository";
import { fetchRepositoryInformation } from "../data/repository";
import { getRepositories, repositoryAdd } from "../data/websocket";
import { storeStyles } from "../styles/store-common-style";
import { markdownWithRepositoryContext } from "../tools/markdown";

@customElement("ha-store-repository-dashboard")
export class HaStoreRepositoryDashboard extends LitElement {
  @property({ attribute: false }) public store!: StoreData;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() public _repository?: RepositoryInfo;

  @state() private _error?: string;

  @query("#overflow-menu")
  private _repositoryOverflowMenu!: HaDropdown;

  private _openingOverflowMenu = false;

  protected async firstUpdated(
    changedProperties: PropertyValues
  ): Promise<void> {
    super.firstUpdated(changedProperties);

    const params = extractSearchParamsObject();
    if (Object.entries(params).length) {
      let existing: RepositoryBase | undefined;
      const requestedRepository = `${params.owner}/${params.repository}`;
      existing = this.store.repositories.find(
        (repository) =>
          repository.full_name.toLocaleLowerCase() ===
          requestedRepository.toLocaleLowerCase()
      );
      if (!existing && params.category) {
        if (
          !(await showConfirmationDialog(this, {
            title: this.hass.localize("ui.panel.store.my.add_repository_title"),
            text: this.hass.localize(
              "ui.panel.store.my.add_repository_description",
              {
                repository: requestedRepository,
              }
            ),
            confirmText: this.hass.localize("ui.panel.store.common.add"),
            dismissText: this.hass.localize("ui.panel.store.common.cancel"),
          }))
        ) {
          this._error = this.hass.localize(
            "ui.panel.store.my.repository_not_found",
            {
              repository: requestedRepository,
            }
          );
          return;
        }
        try {
          await repositoryAdd(this.hass, requestedRepository, params.category);
          fireEvent(this, "store-refresh");
          const repositories = await getRepositories(this.hass);
          existing = repositories.find(
            (repository) =>
              repository.full_name.toLocaleLowerCase() ===
              requestedRepository.toLocaleLowerCase()
          );
        } catch (err: any) {
          this._error = err?.message;
          return;
        }
      }
      if (existing) {
        this._fetchRepository(String(existing.id));
      } else {
        this._error = this.hass.localize(
          "ui.panel.store.my.repository_not_found",
          {
            repository: requestedRepository,
          }
        );
      }
    } else {
      const dividerPos = this.route.path.indexOf("/", 1);
      const repositoryId = this.route.path.substr(dividerPos + 1);
      if (!repositoryId) {
        this._error = this.hass.localize(
          "ui.panel.store.dashboard.repository_not_found"
        );
        return;
      }
      this._fetchRepository(repositoryId);
    }
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);

    if (!changedProps.has("store") || !this._repository) {
      return;
    }

    // The store data is refetched as a whole, so only pick up changes that
    // affect the repository shown here.
    const repositoryId = this._repository.id;
    const listed = this.store.repositories.find(
      (repository) => repository.id === repositoryId
    );
    const previouslyListed = changedProps
      .get("store")
      ?.repositories.find((repository) => repository.id === repositoryId);

    if (previouslyListed && !deepEqual(previouslyListed, listed)) {
      this._fetchRepository();
    }
  }

  private async _fetchRepository(repositoryId?: string) {
    try {
      const repository = await fetchRepositoryInformation(
        this.hass,
        repositoryId || String(this._repository!.id)
      );
      if (!this.isConnected) {
        return;
      }
      this._repository = repository;
    } catch (err: any) {
      if (!this.isConnected) {
        return;
      }
      this._error = err?.message;
    }
  }

  private _getAuthors = memoizeOne((repository: RepositoryInfo) => {
    const authors: string[] = [];
    if (!repository.authors) return authors;
    repository.authors.forEach((author) =>
      authors.push(author.replace("@", ""))
    );
    if (authors.length === 0) {
      const author = repository.full_name.split("/")[0];
      if (
        [
          "custom-cards",
          "custom-components",
          "home-assistant-community-themes",
        ].includes(author)
      ) {
        return authors;
      }
      authors.push(author);
    }
    return authors;
  });

  protected render(): TemplateResult {
    if (this._error) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
        .error=${this._error}
      ></hass-error-screen>`;
    }

    if (!this._repository) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    const authors = this._getAuthors(this._repository);

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/store"
        .header=${this._repository.name}
      >
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.overflow_menu") || "overflow_menu"}
          .path=${mdiDotsVertical}
          @click=${this._showOverflowRepositoryMenu}
        ></ha-icon-button>
        <div class="content">
          <ha-card>
            <ha-chip-set>
              ${
                this._repository.installed
                  ? html`
                      <ha-assist-chip
                        .label=${this._repository.installed_version}
                        title=${this.hass.localize("ui.panel.store.dialog_info.version_installed")}
                      >
                        <ha-svg-icon slot="icon" .path=${mdiCube}></ha-svg-icon>
                      </ha-assist-chip>
                    `
                  : ""
              }
              ${authors.map(
                (author) =>
                  html`<a
                    href="https://github.com/${author}"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <ha-assist-chip
                      .label=${author}
                      title=${this.hass.localize("ui.panel.store.dialog_info.author")}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiAccount}
                      ></ha-svg-icon>
                      @${author}
                    </ha-assist-chip>
                  </a>`
              )}
              ${
                this._repository.downloads
                  ? html` <ha-assist-chip
                      title=${this.hass.localize("ui.panel.store.dialog_info.downloads")}
                      .label=${String(this._repository.downloads)}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiArrowDownBold}
                      ></ha-svg-icon>
                    </ha-assist-chip>`
                  : ""
              }
              <ha-assist-chip
                .label=${String(this._repository.stars)}
                title=${this.hass.localize("ui.panel.store.dialog_info.stars")}
              >
                <ha-svg-icon slot="icon" .path=${mdiStar}></ha-svg-icon>
                ${this._repository.stars}
              </ha-assist-chip>
              <a
                href="https://github.com/${this._repository.full_name}/issues"
                target="_blank"
                rel="noreferrer noopener"
              >
                <ha-assist-chip
                  .label=${String(this._repository.issues)}
                  title=${this.hass.localize("ui.panel.store.dialog_info.open_issues")}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiExclamationThick}
                  ></ha-svg-icon>
                  ${this._repository.issues}
                </ha-assist-chip>
              </a>
            </ha-chip-set>
            <ha-markdown
              .content=${
                markdownWithRepositoryContext(
                  this._repository.additional_info,
                  this._repository
                ) || this.hass.localize("ui.panel.store.dialog_info.no_info")
              }
            ></ha-markdown>
          </ha-card>
        </div>

        ${
          !this._repository.installed_version
            ? html`<ha-button
                slot="fab"
                size="l"
                @click=${this._downloadRepositoryDialog}
              >
                <ha-svg-icon slot="start" .path=${mdiDownload}></ha-svg-icon>
                ${this.hass.localize("ui.panel.store.common.download")}
              </ha-button>`
            : nothing
        }
      </hass-subpage>
      <ha-dropdown
        id="overflow-menu"
        @wa-after-show=${this._overflowMenuOpened}
        @wa-after-hide=${this._overflowMenuClosed}
      >
        ${repositoryMenuItems(this, this._repository, this.hass.localize).map(
          (entry) =>
            entry.divider
              ? html`<wa-divider></wa-divider>`
              : html`
                  <ha-dropdown-item
                    variant=${entry.error ? "danger" : "default"}
                    @click=${entry.action}
                  >
                    <ha-svg-icon .path=${entry.path} slot="icon"></ha-svg-icon>
                    ${entry.label}
                  </ha-dropdown-item>
                `
        )}
      </ha-dropdown>
    `;
  }

  private _showOverflowRepositoryMenu = (ev) => {
    if (this._repositoryOverflowMenu.anchorElement === ev.target) {
      this._repositoryOverflowMenu.anchorElement = undefined;
      return;
    }
    this._openingOverflowMenu = true;
    this._repositoryOverflowMenu.anchorElement = ev.target;
    this._repositoryOverflowMenu.open = true;
  };

  private _overflowMenuOpened = () => {
    this._openingOverflowMenu = false;
  };

  private _overflowMenuClosed = () => {
    // Changing the anchor element fires a close event, ignore that one.
    if (this._openingOverflowMenu) {
      return;
    }

    this._repositoryOverflowMenu.anchorElement = undefined;
  };

  private _downloadRepositoryDialog() {
    showStoreDownloadDialog(this, {
      store: this.store,
      repositoryId: this._repository!.id,
      repository: this._repository!,
    });
  }

  static get styles() {
    return [
      storeStyles,
      css`
        ha-card {
          display: block;
          padding: 16px;
        }
        .content {
          margin: auto;
          padding: 8px;
          max-width: 1536px;
        }

        ha-chip-set {
          padding-bottom: 8px;
        }

        @media all and (max-width: 500px) {
          .content {
            margin: 8px 4px 64px;
            max-width: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-store-repository-dashboard": HaStoreRepositoryDashboard;
  }
}
