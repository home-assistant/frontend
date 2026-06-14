import { mdiCheck, mdiDelete } from "@mdi/js";
import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeDeviceName } from "../../../../../common/entity/compute_device_name";
import type { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
import type { ZwaveJSProvisioningEntry } from "../../../../../data/zwave_js";
import {
  fetchZwaveProvisioningEntries,
  ProvisioningEntryStatus,
  SecurityClass,
  unprovisionZwaveSmartStartNode,
} from "../../../../../data/zwave_js";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../../../types";

@customElement("zwave_js-provisioned")
class ZWaveJSProvisioned extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state() private _provisioningEntries: ZwaveJSProvisioningEntry[] = [];

  @state() private _nodeIdToDevice: Record<number, DeviceRegistryEntry> = {};

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${[
          {
            path: `/config/zwave_js/provisioned?config_entry=${this.configEntryId}`,
            name: this.hass.localize(
              "ui.panel.config.zwave_js.provisioned.caption"
            ),
          },
        ]}
        back-path="/config/zwave_js/dashboard?config_entry=${this
          .configEntryId}"
        .columns=${this._columns(this.hass.localize)}
        .data=${this._getData(this._provisioningEntries, this._nodeIdToDevice)}
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc
    ): DataTableColumnContainer<ZwaveJSProvisioningEntry> => ({
      name: {
        title: localize("ui.panel.config.zwave_js.provisioned.name"),
        main: true,
        sortable: true,
        filterable: true,
      },
      dsk: {
        title: localize("ui.panel.config.zwave_js.provisioned.dsk"),
        sortable: true,
        filterable: true,
        flex: 2,
      },
      security_classes: {
        title: localize(
          "ui.panel.config.zwave_js.provisioned.security_classes"
        ),
        filterable: true,
        sortable: true,
        template: (entry) => {
          const securityClasses = entry.securityClasses;
          return securityClasses
            .map((secClass) =>
              this.hass.localize(
                `ui.panel.config.zwave_js.security_classes.${SecurityClass[secClass]}.title`
              )
            )
            .join(", ");
        },
      },
      included: {
        title: localize("ui.panel.config.zwave_js.provisioned.included"),
        sortable: true,
        type: "icon",
        minWidth: "120px",
        maxWidth: "120px",
        template: (entry) =>
          entry.nodeId
            ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
            : html`—`,
      },
      active: {
        title: localize("ui.panel.config.zwave_js.provisioned.active"),
        sortable: true,
        type: "icon",
        minWidth: "120px",
        maxWidth: "120px",
        template: (entry) =>
          entry.status === ProvisioningEntryStatus.Active
            ? html`<ha-svg-icon .path=${mdiCheck}></ha-svg-icon>`
            : html`—`,
      },
      unprovision: {
        title: "",
        label: localize("ui.panel.config.zwave_js.provisioned.unprovision"),
        type: "icon-button",
        showNarrow: true,
        moveable: false,
        hideable: false,
        template: (entry) => html`
          <ha-icon-button
            .label=${this.hass.localize(
              "ui.panel.config.zwave_js.provisioned.unprovision"
            )}
            .path=${mdiDelete}
            .provisioningEntry=${entry}
            @click=${this._unprovision}
          ></ha-icon-button>
        `,
      },
    })
  );

  private _getData = memoizeOne(
    (
      entries: ZwaveJSProvisioningEntry[],
      nodeIdToDevice: Record<number, DeviceRegistryEntry>
    ) =>
      entries.map((entry) => {
        const device = entry.nodeId ? nodeIdToDevice[entry.nodeId] : undefined;
        return {
          ...entry,
          name: device ? computeDeviceName(device) || "—" : "—",
        };
      })
  );

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._fetchData();
  }

  private _fetchData() {
    this._buildNodeIdToDeviceMap();
    this._fetchProvisioningEntries();
  }

  private _buildNodeIdToDeviceMap() {
    const map: Record<number, DeviceRegistryEntry> = {};
    for (const device of Object.values(this.hass.devices)) {
      if (!device.config_entries.includes(this.configEntryId)) {
        continue;
      }
      for (const [domain, id] of device.identifiers) {
        if (domain === "zwave_js") {
          const nodeId = parseInt(id.split("-")[1]);
          if (!isNaN(nodeId)) {
            map[nodeId] = device;
            break;
          }
        }
      }
    }
    this._nodeIdToDevice = map;
  }

  private async _fetchProvisioningEntries() {
    this._provisioningEntries = await fetchZwaveProvisioningEntries(
      this.hass!,
      this.configEntryId
    );
  }

  private _unprovision = async (ev) => {
    const { dsk, nodeId } = ev.currentTarget.provisioningEntry;

    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.zwave_js.provisioned.confirm_unprovision_title"
      ),
      text: this.hass.localize(
        nodeId
          ? "ui.panel.config.zwave_js.provisioned.confirm_unprovision_text_included"
          : "ui.panel.config.zwave_js.provisioned.confirm_unprovision_text"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.zwave_js.provisioned.unprovision"
      ),
      destructive: true,
    });

    if (!confirm) {
      return;
    }

    await unprovisionZwaveSmartStartNode(this.hass, this.configEntryId, dsk);
    this._fetchProvisioningEntries();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-provisioned": ZWaveJSProvisioned;
  }
}
