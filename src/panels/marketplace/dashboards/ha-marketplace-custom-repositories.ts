import type { ContextType } from "@lit/context";
import { mdiDelete, mdiDeleteOff, mdiLinkPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import type { HaIconButton } from "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { apiContext, internationalizationContext } from "../../../data/context";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import type {
  RepositoryBase,
  RepositoryType,
} from "../../../data/marketplace/repository";
import { removeMarketplaceRepository } from "../../../data/marketplace/repository";
import { marketplaceErrorMessage } from "../../../data/marketplace/websocket";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import type { Route } from "../../../types";
import { showMarketplaceAddFromLink } from "../tools/add-from-link";

@customElement("ha-marketplace-custom-repositories")
export class HaMarketplaceCustomRepositories extends LitElement {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  // Only what was added from a link, of the types the Marketplace has on
  private _customRepositories = memoizeOne(
    (
      repositories: RepositoryBase[],
      categories: RepositoryType[],
      localize: LocalizeFunc
    ): DataTableRowData[] =>
      repositories.flatMap((repository) =>
        repository.custom && categories.includes(repository.category)
          ? [
              {
                ...repository,
                translated_category: localize(
                  `ui.panel.marketplace.common.type.${repository.category}`
                ),
              },
            ]
          : []
      )
  );

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer<RepositoryBase> => ({
      name: {
        title: localize("ui.panel.marketplace.column.name"),
        main: true,
        sortable: true,
        filterable: true,
        direction: "asc",
        flex: 2,
      },
      full_name: {
        title: localize("ui.panel.marketplace.custom_repositories.github"),
        sortable: true,
        filterable: true,
        flex: 2,
      },
      translated_category: {
        title: localize("ui.panel.marketplace.column.type"),
        sortable: true,
        filterable: true,
        flex: 1,
      },
      actions: {
        title: "",
        label: localize("ui.common.remove"),
        type: "icon-button",
        showNarrow: true,
        lastFixed: true,
        template: (repository) => html`
          <ha-tooltip .for=${`remove-${repository.id}`}>
            ${localize(
              // Forgetting an installed repository would leave its files running
              repository.installed
                ? "ui.panel.marketplace.custom_repositories.remove_installed"
                : "ui.common.remove"
            )}
          </ha-tooltip>
          <ha-icon-button
            id=${`remove-${repository.id}`}
            class="delete"
            .label=${localize("ui.common.remove")}
            .path=${repository.installed ? mdiDeleteOff : mdiDelete}
            .disabled=${repository.installed}
            data-repository-id=${repository.id}
            @click=${this._handleRemoveClick}
          ></ha-icon-button>
        `,
      },
    })
  );

  protected render() {
    const repositories = this._customRepositories(
      this.marketplace.repositories,
      this.marketplace.info.categories,
      this._i18n.localize
    );

    return html`
      <hass-subpage
        .narrow=${this.narrow}
        back-path="/marketplace"
        .header=${this._i18n.localize(
          "ui.panel.marketplace.custom_repositories.title"
        )}
      >
        <ha-data-table
          .narrow=${this.narrow}
          .columns=${this._columns(this._i18n.localize)}
          .data=${repositories}
          .searchLabel=${this._i18n.localize(
            "ui.panel.marketplace.dashboard.search",
            { number: repositories.length }
          )}
          .noDataText=${this._i18n.localize(
            "ui.panel.marketplace.custom_repositories.no_repositories"
          )}
          clickable
          @row-click=${this._handleRowClicked}
        ></ha-data-table>
        <ha-button slot="fab" size="l" @click=${this._addFromLink}>
          <ha-svg-icon slot="start" .path=${mdiLinkPlus}></ha-svg-icon>
          ${this._i18n.localize("ui.panel.marketplace.tabs.add_from_link")}
        </ha-button>
      </hass-subpage>
    `;
  }

  private _handleRowClicked(ev: CustomEvent<RowClickedEvent>) {
    navigate(`/marketplace/repository/${ev.detail.id}`);
  }

  private _addFromLink() {
    showMarketplaceAddFromLink(this, this._i18n.localize, this.marketplace);
  }

  // An arrow function, the data table renders the button and would be `this`
  private _handleRemoveClick = async (
    ev: HASSDomCurrentTargetEvent<HaIconButton>
  ) => {
    const repositoryId = ev.currentTarget.dataset.repositoryId!;

    const repository = this.marketplace.repositories.find(
      (item) => item.id === repositoryId
    );

    // Like removing an app repository, and it can be added again later. Asked
    // first, a failure then shows on its own instead of behind the question.
    const confirmed = await showConfirmationDialog(this, {
      title: this._i18n.localize(
        "ui.panel.marketplace.custom_repositories.remove_title",
        { name: repository?.name ?? repositoryId }
      ),
      text: this._i18n.localize(
        "ui.panel.marketplace.custom_repositories.remove_text"
      ),
      confirmText: this._i18n.localize("ui.common.remove"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    // The panel hears the change from the backend and passes on the new list
    try {
      await removeMarketplaceRepository(this._api, repositoryId);
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this._i18n.localize("ui.panel.marketplace.dialog.error.title"),
        text: marketplaceErrorMessage(err, this._i18n.localize),
      });
    }
  };

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }
    ha-data-table {
      width: 100%;
      height: 100%;
      --data-table-border-width: 0;
      /* Keeps the last row clear of the add button */
      --data-table-empty-row-height: calc(
        48px + var(--ha-space-4) * 2 + var(--safe-area-inset-bottom, 0px)
      );
    }
    ha-icon-button.delete {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-custom-repositories": HaMarketplaceCustomRepositories;
  }
}
