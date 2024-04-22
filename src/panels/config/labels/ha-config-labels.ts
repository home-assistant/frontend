import {
  mdiDelete,
  mdiDevices,
  mdiHelpCircle,
  mdiPlus,
  mdiRobot,
  mdiShape,
} from "@mdi/js";
import { LitElement, PropertyValues, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-relative-time";
import "../../../components/ha-icon-overflow-menu";
import {
  LabelRegistryEntry,
  LabelRegistryEntryMutableParams,
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
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showLabelDetailDialog } from "./show-dialog-label-detail";
import { navigate } from "../../../common/navigate";

@customElement("ha-config-labels")
export class HaConfigLabels extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _labels: LabelRegistryEntry[] = [];

  private _columns = memoizeOne((localize: LocalizeFunc) => {
    const columns: DataTableColumnContainer<LabelRegistryEntry> = {
      icon: {
        title: "",
        label: localize("ui.panel.config.labels.headers.icon"),
        type: "icon",
        template: (label) =>
          label.icon ? html`<ha-icon .icon=${label.icon}></ha-icon>` : nothing,
      },
      color: {
        title: "",
        label: localize("ui.panel.config.labels.headers.color"),
        type: "icon",
        template: (label) =>
          label.color
            ? html`<div
                style="
          background-color: ${computeCssColor(label.color)};
          border-radius: 10px;
          width: 20px;
          height: 20px;"
              ></div>`
            : nothing,
      },
      name: {
        title: localize("ui.panel.config.labels.headers.name"),
        main: true,
        sortable: true,
        filterable: true,
        grows: true,
        template: (label) => html`
          <div>${label.name}</div>
          ${label.description
            ? html`<div class="secondary">${label.description}</div>`
            : nothing}
        `,
      },
      actions: {
        title: "",
        width: "64px",
        type: "overflow-menu",
        template: (label) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
              {
                label: this.hass.localize("ui.panel.config.entities.caption"),
                path: mdiShape,
                action: () => this._navigateEntities(label),
              },
              {
                label: this.hass.localize("ui.panel.config.devices.caption"),
                path: mdiDevices,
                action: () => this._navigateDevices(label),
              },
              {
                label: this.hass.localize("ui.panel.config.automation.caption"),
                path: mdiRobot,
                action: () => this._navigateAutomations(label),
              },
              {
                label: this.hass.localize("ui.common.delete"),
                path: mdiDelete,
                action: () => this._removeLabel(label),
                warning: true,
              },
            ]}
          >
          </ha-icon-overflow-menu>
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
        .columns=${this._columns(this.hass.localize)}
        .data=${this._data(this._labels)}
        .noDataText=${this.hass.localize("ui.panel.config.labels.no_labels")}
        hasFab
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
    } catch (err: any) {
      return false;
    }
  }

  private _navigateEntities(label: LabelRegistryEntry) {
    navigate(`/config/entities?historyBack=1&label=${label.label_id}`);
  }

  private _navigateDevices(label: LabelRegistryEntry) {
    navigate(`/config/devices/dashboard?historyBack=1&label=${label.label_id}`);
  }

  private _navigateAutomations(label: LabelRegistryEntry) {
    navigate(
      `/config/automation/dashboard?historyBack=1&label=${label.label_id}`
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-labels": HaConfigLabels;
  }
}
