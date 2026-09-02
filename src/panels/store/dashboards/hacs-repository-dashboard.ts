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
import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { mainWindow } from "../../homeassistant-frontend/src/common/dom/get_main_window";
import { extractSearchParamsObject } from "../../homeassistant-frontend/src/common/url/search-params";
import "../../homeassistant-frontend/src/components/chips/ha-assist-chip";
import "../../homeassistant-frontend/src/components/chips/ha-chip-set";
import "../../homeassistant-frontend/src/components/ha-alert";
import "../../homeassistant-frontend/src/components/ha-card";
import "../../homeassistant-frontend/src/components/ha-fab";
import "../../homeassistant-frontend/src/components/ha-markdown";
import "../../homeassistant-frontend/src/components/ha-menu";
import type { HaMenu } from "../../homeassistant-frontend/src/components/ha-menu";
import "../../homeassistant-frontend/src/components/ha-md-menu-item";
import { showConfirmationDialog } from "../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";
import "../../homeassistant-frontend/src/layouts/hass-error-screen";
import "../../homeassistant-frontend/src/layouts/hass-loading-screen";
import "../../homeassistant-frontend/src/layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../homeassistant-frontend/src/types";
import { showHacsDownloadDialog } from "../components/dialogs/show-hacs-dialog";
import { repositoryMenuItems } from "../components/hacs-repository-owerflow-menu";
import type { Hacs } from "../data/hacs";
import type { RepositoryBase, RepositoryInfo } from "../data/repository";
import { fetchRepositoryInformation } from "../data/repository";
import { getRepositories, repositoryAdd } from "../data/websocket";
import { HacsStyles } from "../styles/hacs-common-style";
import { markdownWithRepositoryContext } from "../tools/markdown";

@customElement("hacs-repository-dashboard")
export class HacsRepositoryDashboard extends LitElement {
  @property({ attribute: false }) public hacs!: Hacs;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public isWide!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() public _repository?: RepositoryInfo;

  @state() private _error?: string;

  @query("#overflow-menu")
  private _repositoryOverflowMenu!: HaMenu;

  public connectedCallback() {
    super.connectedCallback();
    document.body.addEventListener("keydown", this._generateMyLink);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    document.body.removeEventListener("keydown", this._generateMyLink);
  }

  private _generateMyLink = (ev: KeyboardEvent) => {
    if (ev.ctrlKey || ev.shiftKey || ev.metaKey || ev.altKey) {
      // Ignore if modifier keys are pressed
      return;
    }
    if (ev.key === "m" && mainWindow.location.pathname.startsWith("/hacs/repository/")) {
      if (!this._repository) {
        return;
      }
      const myParams = new URLSearchParams({
        redirect: "hacs_repository",
        owner: this._repository!.full_name.split("/")[0],
        repository: this._repository!.full_name.split("/")[1],
        category: this._repository!.category,
      });
      window.open(`https://my.home-assistant.io/create-link/?${myParams.toString()}`, "_blank");
    }
  };

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);

    const params = extractSearchParamsObject();
    if (Object.entries(params).length) {
      let existing: RepositoryBase | undefined;
      const requestedRepository = `${params.owner}/${params.repository}`;
      existing = this.hacs.repositories.find(
        (repository) =>
          repository.full_name.toLocaleLowerCase() === requestedRepository.toLocaleLowerCase(),
      );
      if (!existing && params.category) {
        if (
          !(await showConfirmationDialog(this, {
            title: this.hacs.localize("my.add_repository_title"),
            text: this.hacs.localize("my.add_repository_description", {
              repository: requestedRepository,
            }),
            confirmText: this.hacs.localize("common.add"),
            dismissText: this.hacs.localize("common.cancel"),
          }))
        ) {
          this._error = this.hacs.localize("my.repository_not_found", {
            repository: requestedRepository,
          });
          return;
        }
        try {
          await repositoryAdd(this.hass, requestedRepository, params.category);
          this.hacs.repositories = await getRepositories(this.hass);
          existing = this.hacs.repositories.find(
            (repository) =>
              repository.full_name.toLocaleLowerCase() === requestedRepository.toLocaleLowerCase(),
          );
        } catch (err: any) {
          this._error = err;
          return;
        }
      }
      if (existing) {
        this._fetchRepository(String(existing.id));
      } else {
        this._error = this.hacs.localize("my.repository_not_found", {
          repository: requestedRepository,
        });
      }
    } else {
      const dividerPos = this.route.path.indexOf("/", 1);
      const repositoryId = this.route.path.substr(dividerPos + 1);
      if (!repositoryId) {
        this._error = "Missing repositoryId from route";
        return;
      }
      this._fetchRepository(repositoryId);
    }
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("repositories") && this._repository) {
      this._fetchRepository();
    }
  }

  private async _fetchRepository(repositoryId?: string) {
    try {
      this._repository = await fetchRepositoryInformation(
        this.hass,
        repositoryId || String(this._repository!.id),
      );
    } catch (err: any) {
      this._error = err?.message;
    }
  }

  private _getAuthors = memoizeOne((repository: RepositoryInfo) => {
    const authors: string[] = [];
    if (!repository.authors) return authors;
    repository.authors.forEach((author) => authors.push(author.replace("@", "")));
    if (authors.length === 0) {
      const author = repository.full_name.split("/")[0];
      if (
        ["custom-cards", "custom-components", "home-assistant-community-themes"].includes(author)
      ) {
        return authors;
      }
      authors.push(author);
    }
    return authors;
  });

  protected render(): TemplateResult {
    if (this._error) {
      return html`<hass-error-screen .error=${this._error}></hass-error-screen>`;
    }

    if (!this._repository) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    const authors = this._getAuthors(this._repository);

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .header=${this._repository.name}
        hasFab
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
              ${this._repository.installed
                ? html`
                    <ha-assist-chip
                      .label=${this._repository.installed_version}
                      title="${this.hacs.localize("dialog_info.version_installed")}"
                    >
                      <ha-svg-icon slot="icon" .path=${mdiCube}></ha-svg-icon>
                    </ha-assist-chip>
                  `
                : ""}
              ${authors
                ? authors.map(
                    (author) =>
                      html`<a
                        href="https://github.com/${author}"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <ha-assist-chip
                          .label=${author}
                          title="${this.hacs.localize("dialog_info.author")}"
                        >
                          <ha-svg-icon slot="icon" .path=${mdiAccount}></ha-svg-icon>
                          @${author}
                        </ha-assist-chip>
                      </a>`,
                  )
                : ""}
              ${this._repository.downloads
                ? html` <ha-assist-chip
                    title="${this.hacs.localize("dialog_info.downloads")}"
                    .label=${String(this._repository.downloads)}
                  >
                    <ha-svg-icon slot="icon" .path=${mdiArrowDownBold}></ha-svg-icon>
                  </ha-assist-chip>`
                : ""}
              <ha-assist-chip
                .label=${String(this._repository.stars)}
                title="${this.hacs.localize("dialog_info.stars")}"
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
                  title="${this.hacs.localize("dialog_info.open_issues")}"
                >
                  <ha-svg-icon slot="icon" .path=${mdiExclamationThick}></ha-svg-icon>
                  ${this._repository.issues}
                </ha-assist-chip>
              </a>
            </ha-chip-set>
            <ha-markdown
              .content=${markdownWithRepositoryContext(
                this._repository.additional_info,
                this._repository,
              ) || this.hacs.localize("dialog_info.no_info")}
            ></ha-markdown>
          </ha-card>
        </div>

        ${!this._repository.installed_version
          ? html`<ha-fab
              .label=${this.hacs.localize("common.download")}
              .extended=${!this.narrow}
              @click=${this._downloadRepositoryDialog}
            >
              <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
            </ha-fab>`
          : ""}
      </hass-subpage>
      <ha-menu id="overflow-menu" positioning="fixed">
        ${repositoryMenuItems(this, this._repository, this.hacs.localize).map((entry) =>
          entry.divider
            ? html`<li divider role="separator"></li>`
            : html`
                <ha-md-menu-item
                  class="${entry.error ? "error" : entry.warning ? "warning" : ""}"
                  .clickAction=${() => {
                    entry?.action && entry.action();
                  }}
                >
                  <ha-svg-icon .path=${entry.path} slot="start"></ha-svg-icon>
                  <div slot="headline">${entry.label}</div>
                </ha-md-menu-item>
              `,
        )}
      </ha-menu>
    `;
  }

  private _showOverflowRepositoryMenu = (ev: any) => {
    if (
      this._repositoryOverflowMenu.open &&
      ev.target === this._repositoryOverflowMenu.anchorElement
    ) {
      this._repositoryOverflowMenu.close();
      return;
    }
    this._repositoryOverflowMenu.anchorElement = ev.target;
    this._repositoryOverflowMenu.show();
  };

  private _downloadRepositoryDialog() {
    showHacsDownloadDialog(this, {
      hacs: this.hacs,
      repositoryId: this._repository!.id,
      repository: this._repository!,
    });
  }

  static get styles() {
    return [
      HacsStyles,
      css`
        hass-loading-screen {
          --app-header-background-color: var(--sidebar-background-color);
          --app-header-text-color: var(--sidebar-text-color);
          height: 100vh;
        }

        hass-subpage {
          position: absolute;
          width: 100vw;
        }

        ha-fab ha-svg-icon {
          color: var(--hcv-text-color-on-background);
        }

        ha-fab {
          position: fixed;
          float: right;
          right: calc(18px + env(safe-area-inset-right));
          bottom: calc(16px + env(safe-area-inset-bottom));
          z-index: 1;
        }

        ha-fab.rtl {
          float: left;
          right: auto;
          left: calc(18px + env(safe-area-inset-left));
        }

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
