import type { ContextType } from "@lit/context";
import { mdiDelete, mdiDeleteOff, mdiLinkPlus, mdiMenuDown } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/chips/ha-assist-chip";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
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
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import type { Route } from "../../../types";
import { showMarketplaceAddFromLink } from "../tools/add-from-link";

const pageTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.marketplace.custom_repositories.title",
    path: "/marketplace/repositories",
  },
];

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

  @state() private _selected: string[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

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
                selectable: !repository.installed,
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
    const removeLabel = this._i18n.localize(
      "ui.panel.marketplace.custom_repositories.remove_selected"
    );

    return html`
      <hass-tabs-subpage-data-table
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${pageTabs}
        back-path="/marketplace"
        .columns=${this._columns(this._i18n.localize)}
        .data=${repositories}
        .searchLabel=${this._i18n.localize(
          "ui.panel.marketplace.dashboard.search",
          { number: repositories.length }
        )}
        .noDataText=${this._i18n.localize(
          "ui.panel.marketplace.custom_repositories.no_repositories"
        )}
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        has-fab
        clickable
        @row-click=${this._handleRowClicked}
      >
        ${
          this.narrow
            ? html`<ha-dropdown
                slot="selection-bar"
                @wa-select=${this._removeSelected}
              >
                <ha-assist-chip
                  slot="trigger"
                  .label=${this._i18n.localize(
                    "ui.panel.config.automation.picker.bulk_action"
                  )}
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${mdiMenuDown}
                  ></ha-svg-icon>
                </ha-assist-chip>
                <ha-dropdown-item
                  value="remove"
                  .disabled=${!this._selected.length}
                >
                  ${removeLabel}
                </ha-dropdown-item>
              </ha-dropdown>`
            : html`<ha-assist-chip
                slot="selection-bar"
                .label=${removeLabel}
                .disabled=${!this._selected.length}
                @click=${this._removeSelected}
              ></ha-assist-chip>`
        }
        <ha-button slot="fab" size="l" @click=${this._addFromLink}>
          <ha-svg-icon slot="start" .path=${mdiLinkPlus}></ha-svg-icon>
          ${this._i18n.localize("ui.panel.marketplace.tabs.add_from_link")}
        </ha-button>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleRowClicked(ev: CustomEvent<RowClickedEvent>) {
    navigate(`/marketplace/repository/${ev.detail.id}`);
  }

  private _addFromLink() {
    showMarketplaceAddFromLink(this, this._i18n.localize, this.marketplace);
  }

  private _handleSelectionChanged = (
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void => {
    this._selected = ev.detail.value;
  };

  private _removeSelected = async () => {
    const selectedRepositories = this.marketplace.repositories.filter(
      (repository) =>
        this._selected.includes(repository.id) && !repository.installed
    );
    if (!selectedRepositories.length) {
      return;
    }

    const confirmed = await showConfirmationDialog(this, {
      title: this._i18n.localize(
        "ui.panel.marketplace.custom_repositories.remove_selected_title"
      ),
      text: this._i18n.localize(
        "ui.panel.marketplace.custom_repositories.remove_selected_text",
        { count: selectedRepositories.length }
      ),
      confirmText: this._i18n.localize("ui.common.remove"),
      dismissText: this._i18n.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    const results = await Promise.allSettled(
      selectedRepositories.map((repository) =>
        removeMarketplaceRepository(this._api, repository.id)
      )
    );
    const failures = results.flatMap((result, index) =>
      result.status === "rejected"
        ? [
            `${selectedRepositories[index].name}: ${marketplaceErrorMessage(
              result.reason,
              this._i18n.localize
            )}`,
          ]
        : []
    );
    this._dataTable.clearSelection();

    if (failures.length) {
      showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.marketplace.custom_repositories.remove_failed_title"
        ),
        text: html`
          <p>
            ${this._i18n.localize(
              "ui.panel.marketplace.custom_repositories.remove_failed"
            )}
          </p>
          <pre>${failures.join("\n")}</pre>
        `,
      });
    }
  };

  private _handleRemoveClick = async (
    ev: HASSDomCurrentTargetEvent<HaIconButton>
  ) => {
    const repositoryId = ev.currentTarget.dataset.repositoryId!;

    const repository = this.marketplace.repositories.find(
      (item) => item.id === repositoryId
    );

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
