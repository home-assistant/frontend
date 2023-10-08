import { mdiCheckCircle, mdiCloseCircleOutline, mdiDelete } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
import {
  ZwaveJSProvisioningEntry,
  fetchZwaveProvisioningEntries,
  SecurityClass,
  unprovisionZwaveSmartStartNode,
} from "../../../../../data/zwave_js";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../../../types";
import { configTabs } from "./zwave_js-config-router";

@customElement("zwave_js-provisioned")
class ZWaveJSProvisioned extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public configEntryId!: string;

  @state() private _provisioningEntries: ZwaveJSProvisioningEntry[] = [];

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
        .columns=${this._columns(this.narrow)}
        .data=${this._provisioningEntries}
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer<ZwaveJSProvisioningEntry> => ({
      included: {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.provisioned.included"
        ),
        type: "icon",
        width: "100px",
        template: (entry) =>
          entry.additional_properties.nodeId
            ? html`
                <ha-svg-icon
                  .label=${this.hass.localize(
                    "ui.panel.config.zwave_js.provisioned.included"
                  )}
                  .path=${mdiCheckCircle}
                ></ha-svg-icon>
              `
            : html`
                <ha-svg-icon
                  .label=${this.hass.localize(
                    "ui.panel.config.zwave_js.provisioned.not_included"
                  )}
                  .path=${mdiCloseCircleOutline}
                ></ha-svg-icon>
              `,
      },
      dsk: {
        title: this.hass.localize("ui.panel.config.zwave_js.provisioned.dsk"),
        sortable: true,
        filterable: true,
        grows: true,
      },
      security_classes: {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.provisioned.security_classes"
        ),
        width: "30%",
        hidden: narrow,
        filterable: true,
        sortable: true,
        template: (entry) => {
          const securityClasses = entry.security_classes;
          return securityClasses
            .map((secClass) =>
              this.hass.localize(
                `ui.panel.config.zwave_js.security_classes.${SecurityClass[secClass]}.title`
              )
            )
            .join(", ");
        },
      },
      unprovision: {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.provisioned.unprovison"
        ),
        type: "icon-button",
        width: "100px",
        template: (entry) => html`
          <ha-icon-button
            .label=${this.hass.localize(
              "ui.panel.config.zwave_js.provisioned.unprovison"
            )}
            .path=${mdiDelete}
            .provisioningEntry=${entry}
            @click=${this._unprovision}
          ></ha-icon-button>
        `,
      },
    })
  );

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchData();
  }

  private async _fetchData() {
    this._provisioningEntries = await fetchZwaveProvisioningEntries(
      this.hass!,
      this.configEntryId
    );
  }

  private _unprovision = async (ev) => {
    const dsk = ev.currentTarget.provisioningEntry.dsk;

    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.zwave_js.provisioned.confirm_unprovision_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.zwave_js.provisioned.confirm_unprovision_text"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.zwave_js.provisioned.unprovison"
      ),
    });

    if (!confirm) {
      return;
    }

    await unprovisionZwaveSmartStartNode(this.hass, this.configEntryId, dsk);
    this._fetchData();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-provisioned": ZWaveJSProvisioned;
  }
}
