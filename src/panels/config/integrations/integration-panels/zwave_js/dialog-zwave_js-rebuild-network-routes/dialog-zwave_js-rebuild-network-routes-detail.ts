import { consume, type ContextType } from "@lit/context";
import "@material/mwc-linear-progress/mwc-linear-progress";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { transform } from "../../../../../../common/decorators/transform";
import { computeAreaName } from "../../../../../../common/entity/compute_area_name";
import { computeDeviceNameDisplay } from "../../../../../../common/entity/compute_device_name";
import { getDeviceContext } from "../../../../../../common/entity/context/get_device_context";
import { caseInsensitiveStringCompare } from "../../../../../../common/string/compare";
import "../../../../../../components/ha-button";
import "../../../../../../components/ha-dialog";
import "../../../../../../components/ha-dialog-footer";
import "../../../../../../components/ha-domain-icon";
import "../../../../../../components/ha-fade-in";
import "../../../../../../components/ha-md-list";
import "../../../../../../components/ha-md-list-item";
import "../../../../../../components/ha-spinner";
import {
  areasContext,
  configEntriesContext,
  devicesContext,
  entitiesContext,
  localeContext,
  localizeContext,
  statesContext,
} from "../../../../../../data/context";
import {
  getDeviceEntityDisplayLookup,
  type DeviceRegistryEntry,
} from "../../../../../../data/device/device_registry";
import { DialogMixin } from "../../../../../../dialogs/dialog-mixin";
import { zwaveJsRebuildNetworkRoutesProgressContext } from "./context";
import type { ZWaveJSRebuildNetworkRoutesDetailDialogParams } from "./show-dialog-zwave_js-rebuild-network-routes-detail";

@customElement("dialog-zwave_js-rebuild-network-routes-detail")
class DialogZWaveJSRebuildNetworkRoutesDetail extends DialogMixin<ZWaveJSRebuildNetworkRoutesDetailDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private _localize!: ContextType<typeof localizeContext>;

  @state()
  @consume({ context: localeContext, subscribe: true })
  private _locale!: ContextType<typeof localeContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  private _configEntries?: ContextType<typeof configEntriesContext>;

  @state()
  @consume({ context: devicesContext, subscribe: true })
  @transform<ContextType<typeof devicesContext>, DeviceRegistryEntry[]>({
    transformer: function (
      this: { params?: ZWaveJSRebuildNetworkRoutesDetailDialogParams },
      hassDevices
    ) {
      return this.params && hassDevices
        ? Object.values(hassDevices).filter(
            (device) =>
              device.config_entries.includes(this.params!.configEntryId) &&
              device.identifiers.some((id) => id[0] === "zwave_js")
          )
        : undefined;
    },
  })
  private _zwaveDevices?: DeviceRegistryEntry[];

  @state()
  @consume({
    context: zwaveJsRebuildNetworkRoutesProgressContext,
    subscribe: true,
  })
  @transform<
    ContextType<typeof zwaveJsRebuildNetworkRoutesProgressContext>,
    number[]
  >({
    transformer: function (
      this: { params?: ZWaveJSRebuildNetworkRoutesDetailDialogParams },
      progress
    ) {
      return this.params && progress ? progress[this.params.type] : undefined;
    },
  })
  private _progress?: number[];

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        width="small"
        .headerTitle=${this._localize(
          `ui.panel.config.zwave_js.rebuild_network_routes.details.${this.params.type}`,
          {
            count: this._progress ? this._progress.length : 0,
          }
        )}
      >
        ${!this._configEntries
          ? html`
              <ha-fade-in .delay=${500}
                ><ha-spinner size="large"></ha-spinner
              ></ha-fade-in>
            `
          : !this._progress || this._progress.length === 0
            ? html`<p>
                ${this._localize(
                  "ui.panel.config.zwave_js.rebuild_network_routes.details.no_devices"
                )}
              </p>`
            : this._zwaveDevices
              ? html`<ha-md-list>
                  ${this._filteredDevices(
                    this._progress,
                    this._zwaveDevices
                  ).map(
                    (device) => html`
                      <ha-md-list-item>
                        <ha-domain-icon
                          slot="start"
                          .domain=${device.domain}
                          brand-fallback
                        ></ha-domain-icon>
                        <span slot="headline">${device.name}</span>
                        <span slot="supporting-text">${device.areaName}</span>
                      </ha-md-list-item>
                    `
                  )}
                </ha-md-list>`
              : nothing}
      </ha-dialog>
    `;
  }

  private _filteredDevices = memoizeOne(
    (nodeIds: number[], devices: DeviceRegistryEntry[]) => {
      const nodes = devices.filter((device) => {
        try {
          return !!device.identifiers.find(
            (id) =>
              id[0] === "zwave_js" &&
              nodeIds.includes(parseInt(id[1].split("-")[1]))
          );
        } catch (_error) {
          // eslint-disable-next-line no-console
          console.warn(
            `Unexpected identifier format for device ${device.id}, skipping device in rebuild network routes progress dialog.`,
            _error
          );
          return false;
        }
      });

      const deviceEntityLookup = getDeviceEntityDisplayLookup(
        Object.values(this._entities)
      );

      const configEntryLookup = Object.fromEntries(
        this._configEntries!.map((entry) => [entry.entry_id, entry])
      );

      return nodes
        .map((device) => {
          const name =
            computeDeviceNameDisplay(
              device,
              this._localize,
              this._states,
              deviceEntityLookup[device.id]
            ) || this._localize("ui.components.device-picker.unnamed_device");

          const { area } = getDeviceContext(device, this._areas);

          const areaName = area ? computeAreaName(area) : undefined;

          const configEntry = device.primary_config_entry
            ? configEntryLookup?.[device.primary_config_entry]
            : undefined;

          return {
            name,
            areaName,
            domain: configEntry?.domain,
          };
        })
        .sort((entry1, entry2) =>
          caseInsensitiveStringCompare(
            [entry1.name, entry1.areaName].filter(Boolean).join(" "),
            [entry2.name, entry2.areaName].filter(Boolean).join(" "),
            this._locale.language
          )
        );
    }
  );

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-md-list {
          gap: var(--ha-space-2);
          min-height: 300px;
        }
        ha-md-list-item {
          border: var(--ha-border-width-sm) solid
            var(--ha-color-border-neutral-normal);
          border-radius: var(--ha-border-radius-lg);
          background: var(--ha-color-fill-neutral-quiet-resting);
        }
        ha-fade-in {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-rebuild-network-routes-detail": DialogZWaveJSRebuildNetworkRoutesDetail;
  }
}
