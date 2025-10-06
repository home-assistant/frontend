import {
  mdiDelete,
  mdiDevices,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiPlus,
  mdiRobot,
  mdiShape,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { formatShortDateTime } from "../../../common/datetime/format_date_time";
import { storage } from "../../../common/decorators/storage";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-relative-time";
import type {
  LabelRegistryEntry,
  LabelRegistryEntryMutableParams,
} from "../../../data/label_registry";
import {
  createLabelRegistryEntry,
  deleteLabelRegistryEntry,
  fetchLabelRegistry,
  updateLabelRegistryEntry,
} from "../../../data/label_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showLabelDetailDialog } from "./show-dialog-label-detail";
import type { HaMdMenu } from "../../../components/ha-md-menu";

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

  @query("#overflow-menu") private _overflowMenu?: HaMdMenu;

  private _overflowLabel!: LabelRegistryEntry;

  private _columns = memoizeOne((localize: LocalizeFunc, narrow: boolean) => {
    const columns: DataTableColumnContainer<LabelRegistryEntry> = {
      icon: {
        title: "",
        moveable: false,
        showNarrow: true,
        label: localize("ui.panel.config.labels.headers.icon"),
        type: "icon",
        template: (label) =>
          label.icon ? html`<ha-icon .icon=${label.icon}></ha-icon>` : nothing,
      },
      color: {
        title: "",
        showNarrow: true,
        label: localize("ui.panel.config.labels.headers.color"),
        type: "icon",
        template: (label) =>
          label.color
            ? html`<div
                style=${styleMap({
                  backgroundColor: computeCssColor(label.color),
                  borderRadius: "var(--ha-border-radius-md)",
                  border: "1px solid var(--outline-color)",
                  boxSizing: "border-box",
                  width: "20px",
                  height: "20px",
                })}
              ></div>`
            : nothing,
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
      created_at: {
        title: localize("ui.panel.config.generic.headers.created_at"),
        defaultHidden: true,
        sortable: true,
        minWidth: "128px",
        template: (label) =>
          label.created_at
            ? formatShortDateTime(
                new Date(label.created_at * 1000),
                this.hass.locale,
                this.hass.config
              )
            : "—",
      },
      modified_at: {
        title: localize("ui.panel.config.generic.headers.modified_at"),
        defaultHidden: true,
        sortable: true,
        minWidth: "128px",
        template: (label) =>
          label.modified_at
            ? formatShortDateTime(
                new Date(label.modified_at * 1000),
                this.hass.locale,
                this.hass.config
              )
            : "—",
      },
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

    if (this._overflowMenu.open) {
      this._overflowMenu.close();
      return;
    }
    this._overflowLabel = ev.target.selected;
    this._overflowMenu.anchorElement = ev.target;
    this._overflowMenu.show();
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
      <ha-md-menu id="overflow-menu" positioning="fixed">
        <ha-md-menu-item .clickAction=${this._navigateEntities}>
          <ha-svg-icon slot="start" .path=${mdiShape}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.entities.caption")}
        </ha-md-menu-item>
        <ha-md-menu-item .clickAction=${this._navigateDevices}>
          <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.devices.caption")}
        </ha-md-menu-item>
        <ha-md-menu-item .clickAction=${this._navigateAutomations}>
          <ha-svg-icon slot="start" .path=${mdiRobot}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.automation.caption")}
        </ha-md-menu-item>
        <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
        <ha-md-menu-item
          class="warning"
          .clickAction=${this._handleRemoveLabelClick}
        >
          <ha-svg-icon
            slot="start"
            class="warning"
            .path=${mdiDelete}
          ></ha-svg-icon>
          ${this.hass.localize("ui.common.delete")}
        </ha-md-menu-item>
      </ha-md-menu>
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
