import { mdiCheckCircle, mdiCloseCircleOutline, mdiDelete } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { DataTableColumnContainer } from "../../../../../components/data-table/ha-data-table";
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
import { configTabs } from "./zwave_js-config-router";

@customElement("zwave_js-provisioned")
class ZWaveJSProvisioned extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state() private _provisioningEntries: ZwaveJSProvisioningEntry[] = [];

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._provisioningEntries}
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  private _columns = memoizeOne(
    (
      localize: LocalizeFunc
    ): DataTableColumnContainer<ZwaveJSProvisioningEntry> => ({
      included: {
        showNarrow: true,
        title: localize("ui.panel.config.zwave_js.provisioned.included"),
        type: "icon",
        template: (entry) =>
          entry.nodeId
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
      active: {
        title: localize("ui.panel.config.zwave_js.provisioned.active"),
        type: "icon",
        template: (entry) =>
          entry.status === ProvisioningEntryStatus.Active
            ? html`<ha-svg-icon .path=${mdiCheckCircle}></ha-svg-icon>`
            : html`<ha-svg-icon .path=${mdiCloseCircleOutline}></ha-svg-icon>`,
      },
      dsk: {
        main: true,
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
      unprovision: {
        showNarrow: true,
        title: localize("ui.panel.config.zwave_js.provisioned.unprovision"),
        type: "icon-button",
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
    this._fetchData();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-provisioned": ZWaveJSProvisioned;
  }
}
