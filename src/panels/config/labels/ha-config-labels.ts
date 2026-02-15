import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiDelete,
  mdiDevices,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiLabelOutline,
  mdiPlus,
  mdiRobot,
  mdiShape,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../common/decorators/storage";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-dropdown";
import type {
  HaDropdown,
  HaDropdownSelectEvent,
} from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import { renderLabelColorBadge } from "../../../components/ha-label-picker";
import "../../../components/ha-svg-icon";
import type {
  LabelRegistryEntry,
  LabelRegistryEntryMutableParams,
} from "../../../data/label/label_registry";
import {
  createLabelRegistryEntry,
  deleteLabelRegistryEntry,
  fetchLabelRegistry,
  updateLabelRegistryEntry,
} from "../../../data/label/label_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../types";
import {
  getCreatedAtTableColumn,
  getModifiedAtTableColumn,
} from "../common/data-table-columns";
import { configSections } from "../ha-panel-config";
import { showLabelDetailDialog } from "./show-dialog-label-detail";

@customElement("ha-config-labels")
export class HaConfigLabels extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _labels: LabelRegistryEntry[] = [];

  @state()
  @storage({
    storage: "sessionStorage",
    key: "labels-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  @storage({
    key: "labels-table-sort",
    state: false,
    subscribe: false,
  })
  private _activeSorting?: SortingChangedEvent;

  @storage({
    key: "labels-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "labels-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @query("#overflow-menu") private _overflowMenu?: HaDropdown;

  private _overflowLabel!: LabelRegistryEntry;

  private _openingOverflow = false;

  private _columns = memoizeOne((localize: LocalizeFunc, narrow: boolean) => {
    const columns: DataTableColumnContainer<LabelRegistryEntry> = {
      icon: {
        title: "",
        moveable: false,
        showNarrow: true,
        label: localize("ui.panel.config.labels.headers.icon"),
        type: "icon",
        template: (label) =>
          label.icon
            ? html`<ha-icon .icon=${label.icon}></ha-icon>`
            : html`<ha-svg-icon .path=${mdiLabelOutline}></ha-svg-icon>`,
      },
      color: {
        title: "",
        showNarrow: true,
        label: localize("ui.panel.config.labels.headers.color"),
        type: "icon",
        template: (label) => renderLabelColorBadge(label.color ?? undefined),
      },
      name: {
        title: localize("ui.panel.config.labels.headers.name"),
        main: true,
        flex: 2,
        sortable: true,
        filterable: true,
        template: narrow
          ? undefined
          : (label) => html`
              <div>${label.name}</div>
              ${label.description
                ? html`<div class="secondary">${label.description}</div>`
                : nothing}
            `,
      },
      description: {
        title: localize("ui.panel.config.labels.headers.description"),
        hidden: !narrow,
        filterable: true,
        hideable: true,
      },
      created_at: getCreatedAtTableColumn(localize, this.hass),
      modified_at: getModifiedAtTableColumn(localize, this.hass),
      actions: {
        title: "",
        label: localize("ui.panel.config.generic.headers.actions"),
        showNarrow: true,
        moveable: false,
        hideable: false,
        type: "overflow-menu",
        template: (label) => html`
          <ha-icon-button
            .selected=${label}
            .label=${this.hass.localize("ui.common.overflow_menu")}
            .path=${mdiDotsVertical}
            @click=${this._toggleOverflowMenu}
          ></ha-icon-button>
        `,
      },
    };
    return columns;
  });

  private _data = memoizeOne(
    (labels: LabelRegistryEntry[]): LabelRegistryEntry[] =>
      labels.map((label) => ({
        ...label,
      }))
  );

  private _toggleOverflowMenu = (ev) => {
    if (!this._overflowMenu) {
      return;
    }

    if (this._overflowMenu.anchorElement === ev.target) {
      this._overflowMenu.anchorElement = undefined;
      return;
    }
    this._openingOverflow = true;
    this._overflowMenu.anchorElement = ev.target;
    this._overflowLabel = ev.target.selected;
    this._overflowMenu.open = true;
  };

  private _overflowMenuOpened = () => {
    this._openingOverflow = false;
  };

  private _overflowMenuClosed = () => {
    // changing the anchorElement triggers a close event, ignore it
    if (this._openingOverflow || !this._overflowMenu) {
      return;
    }

    this._overflowMenu.anchorElement = undefined;
  };

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._fetchLabels();
  }

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.areas}
        .columns=${this._columns(this.hass.localize, this.narrow)}
        .data=${this._data(this._labels)}
        .noDataText=${this.hass.localize("ui.panel.config.labels.no_labels")}
        has-fab
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._editLabel}
        clickable
        id="label_id"
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._showHelp}
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
        ></ha-icon-button>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize("ui.panel.config.labels.add_label")}
          extended
          @click=${this._addLabel}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
      <ha-dropdown
        id="overflow-menu"
        @wa-select=${this._handleOverflowAction}
        @wa-after-show=${this._overflowMenuOpened}
        @wa-after-hide=${this._overflowMenuClosed}
      >
        <ha-dropdown-item value="navigate-entities">
          <ha-svg-icon slot="icon" .path=${mdiShape}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.entities.caption")}
        </ha-dropdown-item>
        <ha-dropdown-item value="navigate-devices">
          <ha-svg-icon slot="icon" .path=${mdiDevices}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.devices.caption")}
        </ha-dropdown-item>
        <ha-dropdown-item value="navigate-automations">
          <ha-svg-icon slot="icon" .path=${mdiRobot}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.automation.caption")}
        </ha-dropdown-item>
        <wa-divider></wa-divider>
        <ha-dropdown-item variant="danger" value="remove">
          <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
          ${this.hass.localize("ui.common.delete")}
        </ha-dropdown-item>
      </ha-dropdown>
    `;
  }

  private _editLabel(ev: CustomEvent<RowClickedEvent>) {
    const label = this._labels.find((lbl) => lbl.label_id === ev.detail.id);
    this._openDialog(label);
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.labels.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.labels.introduction")}
        <p>${this.hass.localize("ui.panel.config.labels.introduction2")}</p>
      `,
    });
  }

  private async _fetchLabels() {
    this._labels = await fetchLabelRegistry(this.hass.connection);
  }

  private _addLabel() {
    this._openDialog();
  }

  private _openDialog(entry?: LabelRegistryEntry) {
    showLabelDetailDialog(this, {
      entry,
      createEntry: (values) => this._createLabel(values),
      updateEntry: entry
        ? (values) => this._updateLabel(entry, values)
        : undefined,
      removeEntry: entry ? () => this._removeLabel(entry) : undefined,
    });
  }

  private async _createLabel(
    values: LabelRegistryEntryMutableParams
  ): Promise<LabelRegistryEntry> {
    const newTag = await createLabelRegistryEntry(this.hass, values);
    this._labels = [...this._labels, newTag];
    return newTag;
  }

  private async _updateLabel(
    selectedLabel: LabelRegistryEntry,
    values: Partial<LabelRegistryEntryMutableParams>
  ): Promise<LabelRegistryEntry> {
    const updated = await updateLabelRegistryEntry(
      this.hass,
      selectedLabel.label_id,
      values
    );
    this._labels = this._labels.map((label) =>
      label.label_id === selectedLabel.label_id ? updated : label
    );
    return updated;
  }

  private _handleRemoveLabelClick = () => {
    this._removeLabel(this._overflowLabel);
  };

  private async _removeLabel(selectedLabel: LabelRegistryEntry) {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.labels.confirm_remove_title"
        ),
        text: this.hass.localize("ui.panel.config.labels.confirm_remove", {
          label: selectedLabel.name || selectedLabel.label_id,
        }),
        dismissText: this.hass!.localize("ui.common.cancel"),
        confirmText: this.hass!.localize("ui.common.remove"),
        destructive: true,
      }))
    ) {
      return false;
    }
    try {
      await deleteLabelRegistryEntry(this.hass, selectedLabel.label_id);
      this._labels = this._labels.filter(
        (label) => label.label_id !== selectedLabel.label_id
      );
      return true;
    } catch (_err: any) {
      return false;
    }
  }

  private _handleOverflowAction = (ev: HaDropdownSelectEvent) => {
    const action = ev.detail.item.value;

    if (!action) {
      return;
    }
    switch (action) {
      case "navigate-entities":
        this._navigateEntities();
        break;
      case "navigate-devices":
        this._navigateDevices();
        break;
      case "navigate-automations":
        this._navigateAutomations();
        break;
      case "remove":
        this._handleRemoveLabelClick();
        break;
    }
  };

  private _navigateEntities = () => {
    navigate(
      `/config/entities?historyBack=1&label=${this._overflowLabel.label_id}`
    );
  };

  private _navigateDevices = () => {
    navigate(
      `/config/devices/dashboard?historyBack=1&label=${this._overflowLabel.label_id}`
    );
  };

  private _navigateAutomations = () => {
    navigate(
      `/config/automation/dashboard?historyBack=1&label=${this._overflowLabel.label_id}`
    );
  };

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-labels": HaConfigLabels;
  }
}
