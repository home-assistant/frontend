import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import "../../../../../components/ha-switch";
import type { HaSwitch } from "../../../../../components/ha-switch";
import "../../../../../components/input/ha-input";
import type { HaInput } from "../../../../../components/input/ha-input";
import type {
  AddonNetworkIsolationParams,
  HassioAddonDetails,
  HassioAddonSetOptionParams,
} from "../../../../../data/hassio/addon";
import { setHassioAddonOption } from "../../../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import type { NetworkInterface } from "../../../../../data/hassio/network";
import { fetchNetworkInfo } from "../../../../../data/hassio/network";
import { DirtyStateProviderMixin } from "../../../../../mixins/dirty-state-provider-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";
import { suggestSupervisorAppRestart } from "../dialogs/suggestSupervisorAppRestart";

interface NetworkConfig {
  ports: Record<string, number | null>;
  isolation: AddonNetworkIsolationParams | null;
}

const isValidIpv4 = (address: string): boolean => {
  const parts = address.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  );
};

@customElement("supervisor-app-network")
class SupervisorAppNetwork extends DirtyStateProviderMixin<NetworkConfig>()(
  LitElement
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property({ type: Boolean }) public disabled = false;

  @state() private _showOptional = false;

  @state() private _error?: string;

  @state() private _config?: NetworkConfig;

  @state() private _isolationInterfaces?: NetworkInterface[];

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const ports = this._config.ports;

    const hasHiddenOptions = Object.keys(ports).find(
      (entry) => ports[entry] === null
    );

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.apps.configuration.network.header"
        )}
      >
        <div class="card-content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
          ${this.addon.network
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.apps.configuration.network.introduction"
                  )}
                </p>
                <ha-form
                  .disabled=${this.disabled}
                  .data=${ports}
                  @value-changed=${this._configChanged}
                  .computeLabel=${this._computeLabel}
                  .computeHelper=${this._computeHelper}
                  .schema=${this._createSchema(ports, this._showOptional)}
                ></ha-form>
              `
            : nothing}
          ${this.addon.network_isolation_available
            ? this._renderIsolation()
            : nothing}
        </div>
        ${hasHiddenOptions
          ? html`<ha-formfield
              class="show-optional"
              .label=${this.hass.localize(
                "ui.panel.config.apps.configuration.network.show_disabled"
              )}
            >
              <ha-switch
                @change=${this._toggleOptional}
                .checked=${this._showOptional}
              >
              </ha-switch>
            </ha-formfield>`
          : nothing}
        <div class="card-actions">
          <ha-progress-button
            variant="danger"
            appearance="plain"
            .disabled=${this.disabled}
            @click=${this._resetTapped}
          >
            ${this.hass.localize(
              "ui.panel.config.apps.configuration.network.reset_defaults"
            )}
          </ha-progress-button>
          <ha-progress-button
            @click=${this._saveTapped}
            .disabled=${!this.isDirtyState || this.disabled}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private _renderIsolation() {
    const isolation = this._config!.isolation;

    return html`
      <div class="isolation">
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.apps.configuration.network.isolation.title"
          )}
        >
          <ha-switch
            .checked=${isolation !== null}
            .disabled=${this.disabled}
            @change=${this._isolationToggled}
          ></ha-switch>
        </ha-formfield>
        <p class="secondary">
          ${this.hass.localize(
            "ui.panel.config.apps.configuration.network.isolation.description"
          )}
        </p>
        ${isolation
          ? html`
              <ha-select
                .label=${this.hass.localize(
                  "ui.panel.config.apps.configuration.network.isolation.interface"
                )}
                .value=${isolation.interface}
                .disabled=${this.disabled}
                .options=${(this._isolationInterfaces || []).map((iface) => ({
                  value: iface.interface,
                  label: iface.ipv4?.address?.length
                    ? `${iface.interface} (${iface.ipv4.address.join(", ")})`
                    : iface.interface,
                }))}
                @selected=${this._isolationInterfaceChanged}
              ></ha-select>
              <ha-input
                .label=${this.hass.localize(
                  "ui.panel.config.apps.configuration.network.isolation.ip_address"
                )}
                .hint=${this.hass.localize(
                  "ui.panel.config.apps.configuration.network.isolation.ip_address_helper"
                )}
                .value=${isolation.ipv4}
                .disabled=${this.disabled}
                @change=${this._isolationAddressChanged}
              ></ha-input>
            `
          : nothing}
      </div>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("addon")) {
      this._setNetworkConfig();
      if (
        this.addon.network_isolation_available &&
        this._isolationInterfaces === undefined
      ) {
        this._loadIsolationInterfaces();
      }
    }
  }

  private async _loadIsolationInterfaces(): Promise<void> {
    this._isolationInterfaces = [];
    try {
      const { interfaces } = await fetchNetworkInfo(this.hass);
      this._isolationInterfaces = interfaces.filter(
        (iface) => iface.network_isolation_capable
      );
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
  }

  private _createSchema = memoizeOne(
    (
      ports: Record<string, number | null>,
      showOptional: boolean
    ): HaFormSchema[] =>
      (showOptional
        ? Object.keys(ports)
        : Object.keys(ports).filter((entry) => ports[entry] !== null)
      ).map((entry) => ({
        name: entry,
        selector: {
          number: {
            mode: "box",
            min: 0,
            max: 65535,
            unit_of_measurement: entry,
          },
        },
      }))
  );

  private _computeLabel = (_: HaFormSchema): string => "";

  private _computeHelper = (item: HaFormSchema): string =>
    this.addon.translations[this.hass.language]?.network?.[item.name] ||
    this.addon.translations.en?.network?.[item.name] ||
    this.addon.network_description?.[item.name] ||
    item.name;

  private _setNetworkConfig(): void {
    const config: NetworkConfig = {
      ports: this.addon.network || {},
      isolation: this.addon.network_isolation
        ? {
            interface: this.addon.network_isolation.interface,
            ipv4: this.addon.network_isolation.ipv4,
          }
        : null,
    };
    this._config = config;
    this._initDirtyTracking({ type: "deep" }, config);
  }

  private _configChanged(ev: CustomEvent): void {
    this._config = { ...this._config!, ports: ev.detail.value };
    this._updateDirtyState(this._config);
  }

  private _isolationToggled(ev: Event): void {
    const enabled = (ev.target as HaSwitch).checked;
    this._config = {
      ...this._config!,
      isolation: enabled
        ? {
            interface:
              this.addon.network_isolation?.interface ||
              this._isolationInterfaces?.[0]?.interface ||
              "",
            ipv4: this.addon.network_isolation?.ipv4 || "",
          }
        : null,
    };
    this._updateDirtyState(this._config);
  }

  private _isolationInterfaceChanged(ev: HaSelectSelectEvent): void {
    this._config = {
      ...this._config!,
      isolation: { ...this._config!.isolation!, interface: ev.detail.value },
    };
    this._updateDirtyState(this._config);
  }

  private _isolationAddressChanged(ev: Event): void {
    this._config = {
      ...this._config!,
      isolation: {
        ...this._config!.isolation!,
        ipv4: (ev.target as HaInput).value || "",
      },
    };
    this._updateDirtyState(this._config);
  }

  private async _resetTapped(ev: CustomEvent): Promise<void> {
    if (this.disabled) {
      return;
    }

    const button = ev.currentTarget as any;
    const data: HassioAddonSetOptionParams = {};
    if (this.addon.network) {
      data.network = null;
    }
    if (this.addon.network_isolation_available) {
      data.network_isolation = null;
    }

    try {
      await setHassioAddonOption(this.hass.callWS, this.addon.slug, data);
      this._markDirtyStateClean();
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      button.actionSuccess();
      fireEvent(this, "hass-api-called", eventdata);
      if (this.addon?.state === "started") {
        await suggestSupervisorAppRestart(this, this.hass, this.addon);
      }
    } catch (err: any) {
      this._error = this.hass.localize(
        "ui.panel.config.apps.dashboard.failed_to_reset",
        {
          error: extractApiErrorMessage(err),
        }
      );
      button.actionError();
    }
  }

  private _toggleOptional() {
    this._showOptional = !this._showOptional;
  }

  private async _saveTapped(ev: CustomEvent): Promise<void> {
    if (!this.isDirtyState || this.disabled) {
      return;
    }

    const button = ev.currentTarget as any;

    this._error = undefined;
    const { ports, isolation } = this._config!;

    if (this.addon.network_isolation_available && isolation) {
      if (!isolation.interface) {
        this._error = this.hass.localize(
          "ui.panel.config.apps.configuration.network.isolation.no_interface"
        );
        button.actionError();
        return;
      }
      if (!isValidIpv4(isolation.ipv4)) {
        this._error = this.hass.localize(
          "ui.panel.config.apps.configuration.network.isolation.invalid_ip"
        );
        button.actionError();
        return;
      }
    }

    const data: HassioAddonSetOptionParams = {};
    if (this.addon.network) {
      const networkconfiguration: Record<string, number | null> = {};
      Object.entries(ports).forEach(([key, value]) => {
        networkconfiguration[key] = value ?? null;
      });
      data.network = networkconfiguration;
    }
    if (this.addon.network_isolation_available) {
      data.network_isolation = isolation;
    }

    try {
      await setHassioAddonOption(this.hass.callWS, this.addon.slug, data);
      this._markDirtyStateClean();
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      button.actionSuccess();
      fireEvent(this, "hass-api-called", eventdata);
      if (this.addon?.state === "started") {
        await suggestSupervisorAppRestart(this, this.hass, this.addon);
      }
    } catch (err: any) {
      this._error = this.hass.localize(
        "ui.panel.config.apps.dashboard.failed_to_save",
        {
          error: extractApiErrorMessage(err),
        }
      );
      button.actionError();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      supervisorAppsStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          display: block;
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
        }
        .show-optional {
          padding: 16px;
        }
        ha-form + .isolation {
          margin-top: var(--ha-space-6);
        }
        .isolation .secondary {
          margin-top: var(--ha-space-1);
          color: var(--secondary-text-color);
        }
        .isolation ha-select,
        .isolation ha-input {
          display: block;
          width: 100%;
        }
        .isolation ha-input {
          margin-top: var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-network": SupervisorAppNetwork;
  }
}
