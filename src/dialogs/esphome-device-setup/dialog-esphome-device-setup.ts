import type { ContextType } from "@lit/context";
import { mdiCheck, mdiChevronDown, mdiOpenInNew } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { consume } from "../../common/decorators/consume";
import { transform } from "../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/ha-domain-icon";
import "../../components/ha-icon-button-prev";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-nav";
import {
  fetchConfigFlowInProgress,
  subscribeConfigFlowInProgress,
  type ConfigFlowInProgressMessage,
} from "../../data/config_flow";
import {
  apiContext,
  configContext,
  configEntriesContext,
  connectionContext,
  devicesContext,
  entitiesContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../data/context";
import type { DataEntryFlowProgress } from "../../data/data_entry_flow";
import {
  fetchESPHomeDeviceCapabilities,
  type ESPHomeDeviceCapabilities,
  type ESPHomeSerialPortType,
} from "../../data/esphome";
import {
  deriveESPHomeSetupStatus,
  ESPHOME_CAPABILITY_ACCENTS,
  ESPHOME_CAPABILITY_ICONS,
  ESPHOME_CAPABILITY_TITLE_KEYS,
  findESPHomeZWaveFlow,
  getESPHomeAudioControls,
  getESPHomeSetupCapabilityIds,
  isESPHomeSerialConfigured,
  MUSIC_ASSISTANT_ADDON_SLUG,
  MUSIC_ASSISTANT_DOCS_URL,
  type ESPHomeAudioControls,
  type ESPHomeCapabilityId,
  type ESPHomeCapabilityStatus,
  type ESPHomeSetupStatus,
} from "../../data/esphome_setup";
import {
  fetchHassioAddonsInfo,
  installHassioAddon,
  startHassioAddon,
} from "../../data/hassio/addon";
import { extractApiErrorMessage } from "../../data/hassio/common";
import { listSerialPortsWithUsage, type SerialPortUsage } from "../../data/usb";
import { showAddIntegrationDialog } from "../../panels/config/integrations/show-add-integration-dialog";
import { haStyle, haStyleDialog } from "../../resources/styles";
import type { HomeAssistant, HomeAssistantUI } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { getWsErrorMessage } from "../../util/ws-error";
import { showConfigFlowDialog } from "../config-flow/show-dialog-config-flow";
import { DialogMixin } from "../dialog-mixin";
import { showAlertDialog } from "../generic/show-dialog-box";
import type { ESPHomeDeviceSetupDialogParams } from "./show-dialog-esphome-device-setup";

type SetupView =
  "checklist" | "zwave-adapters" | "audio-offer" | "audio-working";

const SERIAL_PORT_TYPE_LABELS: Record<ESPHomeSerialPortType, LocalizeKeys> = {
  TTL: "ui.panel.config.devices.esphome.setup_serial_port_ttl",
  RS232: "ui.panel.config.devices.esphome.setup_serial_port_rs232",
  RS485: "ui.panel.config.devices.esphome.setup_serial_port_rs485",
  USB_SERIAL: "ui.panel.config.devices.esphome.setup_serial_port_usb_serial",
};

/** Add-on discovery on slow hardware can take longer than a few seconds. */
const MUSIC_ASSISTANT_DISCOVERY_TIMEOUT_MS = 60_000;

/** Same delay ha-entity-toggle uses to resync a switch the state did not follow. */
const SWITCH_RESYNC_MS = 2000;

const CAPABILITY_SHORT_KEYS: Record<ESPHomeCapabilityId, LocalizeKeys> = {
  bluetooth: "ui.panel.config.devices.esphome.setup_capability_bluetooth_short",
  audio: "ui.panel.config.devices.esphome.setup_capability_audio_short",
  connectivity:
    "ui.panel.config.devices.esphome.setup_capability_connectivity_short",
  serial: "ui.panel.config.devices.esphome.setup_capability_serial_short",
};

const CAPABILITY_DESCRIPTION_KEYS: Record<ESPHomeCapabilityId, LocalizeKeys> = {
  bluetooth:
    "ui.panel.config.devices.esphome.setup_capability_bluetooth_description",
  audio: "ui.panel.config.devices.esphome.setup_capability_audio_description",
  connectivity:
    "ui.panel.config.devices.esphome.setup_capability_connectivity_description",
  serial: "ui.panel.config.devices.esphome.setup_capability_serial_description",
};

const hassioMusicAssistantFlow = (
  messages: ConfigFlowInProgressMessage[]
): DataEntryFlowProgress | undefined => {
  for (const message of messages) {
    if (
      message.type !== "removed" &&
      message.flow.handler === "music_assistant" &&
      message.flow.context.source === "hassio"
    ) {
      return message.flow;
    }
  }
  return undefined;
};

@customElement("dialog-esphome-device-setup")
class DialogESPHomeDeviceSetup extends DialogMixin<ESPHomeDeviceSetupDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean | undefined>({
    transformer: ({ themes }) => themes?.darkMode,
  })
  private _darkMode?: boolean;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api?: ContextType<typeof apiContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection?: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig?: ContextType<typeof configContext>;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities?: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states?: ContextType<typeof statesContext>;

  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  private _configEntries?: ContextType<typeof configEntriesContext>;

  @state()
  @consume({ context: devicesContext, subscribe: true })
  @transform<HomeAssistant["devices"], string | undefined>({
    transformer: function (this: DialogESPHomeDeviceSetup, devices) {
      const deviceId = this.params?.deviceId;
      return deviceId
        ? devices[deviceId]?.connections.find(([type]) => type === "mac")?.[1]
        : undefined;
    },
  })
  private _macAddress?: string;

  @state() private _zwaveFlows: DataEntryFlowProgress[] = [];

  @state() private _capabilities?: ESPHomeDeviceCapabilities;

  /** Last successful USB usage scan. Undefined until a scan completes. */
  @state() private _serialPorts?: SerialPortUsage[];

  @state() private _serialUsageError?: string;

  private _serialUsageRequest = 0;

  @state() private _fetching = true;

  @state() private _error?: string;

  @state() private _view: SetupView = "checklist";

  @state() private _expanded?: ESPHomeCapabilityId;

  @state() private _installingAudio = false;

  @state() private _installStatus?: string;

  /** True until the Sendspin switch state catches up after we turn it on. */
  @state() private _sendspinOptimisticOn = false;

  /** Bumps when the user leaves the audio flow, so an in-flight step stops. */
  private _audioFlowId = 0;

  private _loadStarted = false;

  private _musicAssistantDiscovery?: {
    unsub?: UnsubscribeFunc;
    timer?: number;
    resolve?: (flow: DataEntryFlowProgress | undefined) => void;
  };

  public disconnectedCallback() {
    this._finishMusicAssistantDiscovery(undefined);
    this.params?.dialogClosedCallback?.();
    super.disconnectedCallback();
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (this._sendspinOptimisticOn && changedProps.has("_states")) {
      const entityId = this._audioControls().sendspinEntityId;
      const oldStates = changedProps.get("_states") as typeof this._states;
      if (entityId && this._states?.[entityId] !== oldStates?.[entityId]) {
        this._sendspinOptimisticOn = false;
      }
    }
    if (
      !this._loadStarted &&
      this.params &&
      this._api &&
      this._i18n &&
      this._hassConfig
    ) {
      this._loadStarted = true;
      this._capabilities = this.params.capabilities;
      this._load();
    } else if (
      this._loadStarted &&
      changedProps.has("_configEntries") &&
      this._capabilities?.serial_proxies.length
    ) {
      this._refreshSerialPorts();
    }
  }

  protected render() {
    if (!this.params || !this._i18n || !this._hassConfig) {
      return nothing;
    }

    return html`
      <ha-dialog open width="medium" .headerTitle=${this._dialogTitle()}>
        ${
          this._view !== "checklist"
            ? html`
                <ha-icon-button-prev
                  slot="headerNavigationIcon"
                  .label=${this._i18n.localize("ui.common.back")}
                  @click=${this._showChecklist}
                ></ha-icon-button-prev>
              `
            : nothing
        }
        ${this._renderContent()} ${this._renderFooter()}
      </ha-dialog>
    `;
  }

  private _renderContent() {
    if (this._fetching && !this._capabilities) {
      return html`
        <div class="loading">
          <ha-spinner></ha-spinner>
        </div>
      `;
    }

    if (this._error && !this._capabilities) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }

    if (!this._capabilities) {
      return nothing;
    }

    if (this._view === "zwave-adapters") {
      return this._renderZWaveAdapters();
    }
    // Footer hides Install and Skip while this flag is set. Progress is the body.
    if (this._installingAudio || this._view === "audio-working") {
      return this._renderAudioWorking();
    }
    if (this._view === "audio-offer") {
      return this._renderAudioOffer();
    }
    return this._renderChecklist();
  }

  private _renderChecklist() {
    const status = this._status();
    if (!status || !this._i18n) {
      return nothing;
    }
    const ids = getESPHomeSetupCapabilityIds(status);

    return html`
      <p class="intro">
        ${this._i18n.localize("ui.panel.config.devices.esphome.setup_intro", {
          count: ids.length,
        })}
      </p>
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      ${
        this._serialUsageError
          ? html`<ha-alert alert-type="error"
              >${this._serialUsageError}</ha-alert
            >`
          : nothing
      }
      <div class="checklist">
        ${ids.map((id) => this._renderCapability(id, status[id]!))}
      </div>
    `;
  }

  private _renderCapability(
    id: ESPHomeCapabilityId,
    status: ESPHomeCapabilityStatus
  ) {
    const localize = this._i18n!.localize;
    const expanded = this._expanded === id;
    return html`
      <div
        class="check-item ${classMap({ open: expanded })}"
        style="--capability-accent: ${ESPHOME_CAPABILITY_ACCENTS[id]}"
      >
        <button
          type="button"
          class="check-head"
          data-capability=${id}
          aria-expanded=${expanded}
          @click=${this._toggleCapability}
        >
          <span class="icon-chip">
            <ha-svg-icon .path=${ESPHOME_CAPABILITY_ICONS[id]}></ha-svg-icon>
          </span>
          <span class="check-text">
            <span class="check-title">
              ${localize(ESPHOME_CAPABILITY_TITLE_KEYS[id])}
            </span>
            <span class="check-short">
              ${localize(CAPABILITY_SHORT_KEYS[id])}
            </span>
          </span>
          <span class="check-end">
            ${this._statusBadge(status)}
            <ha-svg-icon
              class="chevron ${classMap({ open: expanded })}"
              .path=${mdiChevronDown}
            ></ha-svg-icon>
          </span>
        </button>
        ${
          expanded
            ? html`
                <div class="check-body">
                  ${
                    id === "audio"
                      ? html`
                          <img
                            class="sendspin-lockup ${classMap({
                              dark: Boolean(this._darkMode),
                            })}"
                            alt=${localize(
                              "ui.panel.config.devices.esphome.setup_audio_sendspin"
                            )}
                            src="/static/images/sendspin-lockup.svg"
                          />
                        `
                      : nothing
                  }
                  <p>${localize(CAPABILITY_DESCRIPTION_KEYS[id])}</p>
                  ${id === "audio" ? this._renderAudioActions(status) : nothing}
                  ${
                    id === "connectivity"
                      ? this._renderConnectivityActions(status)
                      : nothing
                  }
                  ${id === "serial" ? this._renderSerialPortList() : nothing}
                </div>
              `
            : nothing
        }
      </div>
    `;
  }

  private _statusBadge(status: ESPHomeCapabilityStatus) {
    if (status !== "completed") {
      return nothing;
    }
    return html`
      <span
        class="status-badge completed"
        role="img"
        aria-label=${this._i18n!.localize(
          "ui.panel.config.devices.esphome.setup_status_completed"
        )}
      >
        <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
      </span>
    `;
  }

  private _renderAudioActions(status: ESPHomeCapabilityStatus) {
    const localize = this._i18n!.localize;
    if (status === "completed") {
      return nothing;
    }
    return html`
      <div class="actions">
        <ha-button @click=${this._startAudioFlow}>
          ${localize(
            "ui.panel.config.devices.esphome.setup_enable_stream_audio"
          )}
        </ha-button>
      </div>
    `;
  }

  private _renderAudioOffer() {
    const localize = this._i18n!.localize;
    return html`
      <div class="ma-offer">
        <div class="ma-offer-head">
          <span class="audio-icon">
            <ha-domain-icon
              domain="music_assistant"
              brand-fallback
            ></ha-domain-icon>
          </span>
          <span class="audio-text">
            <span class="audio-name">
              ${localize(
                "ui.panel.config.devices.esphome.setup_audio_music_assistant"
              )}
            </span>
            <span class="audio-meta">
              ${localize("ui.panel.config.devices.esphome.setup_audio_byline")}
            </span>
          </span>
        </div>
        <p>
          ${localize("ui.panel.config.devices.esphome.setup_audio_offer_body")}
        </p>
        <div class="ma-benefits">
          ${this._renderBenefit(
            "ui.panel.config.devices.esphome.setup_audio_benefit_multiroom"
          )}
          ${this._renderBenefit(
            "ui.panel.config.devices.esphome.setup_audio_benefit_lossless"
          )}
          ${this._renderBenefit(
            "ui.panel.config.devices.esphome.setup_audio_benefit_album_art"
          )}
        </div>
      </div>
    `;
  }

  private _renderBenefit(key: LocalizeKeys) {
    return html`
      <div class="ma-benefit">
        <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
        <span>${this._i18n!.localize(key)}</span>
      </div>
    `;
  }

  private _renderAudioWorking() {
    return html`
      <div class="audio-working">
        <ha-spinner></ha-spinner>
        ${this._installStatus ? html`<p>${this._installStatus}</p>` : nothing}
      </div>
    `;
  }

  private _renderFooter() {
    if (!this._i18n || !this._hassConfig) {
      return nothing;
    }
    const localize = this._i18n.localize;
    if (this._view === "audio-offer" && !this._installingAudio) {
      const hassio = isComponentLoaded(this._hassConfig.config, "hassio");
      return html`
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._skipMusicAssistant}
          >
            ${localize("ui.panel.config.devices.esphome.setup_audio_skip")}
          </ha-button>
          ${
            hassio
              ? html`
                  <ha-button
                    slot="primaryAction"
                    @click=${this._installMusicAssistant}
                  >
                    ${localize(
                      "ui.panel.config.devices.esphome.setup_install_music_assistant"
                    )}
                  </ha-button>
                `
              : html`
                  <ha-button
                    slot="primaryAction"
                    appearance="plain"
                    href=${MUSIC_ASSISTANT_DOCS_URL}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    ${localize(
                      "ui.panel.config.devices.esphome.setup_learn_more"
                    )}
                    <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
                  </ha-button>
                `
          }
        </ha-dialog-footer>
      `;
    }
    return nothing;
  }

  private _renderConnectivityActions(status: ESPHomeCapabilityStatus) {
    const localize = this._i18n!.localize;
    if (status === "completed") {
      const entry = this._zwaveJSEntry();
      if (!entry) {
        return nothing;
      }
      return html`
        <ul class="ports">
          <li>
            <span class="port-text">
              <span class="port-name">${entry.title}</span>
            </span>
            <span class="chip active">
              ${localize(
                "ui.panel.config.devices.esphome.setup_zwave_configured"
              )}
            </span>
          </li>
        </ul>
      `;
    }
    if (status === "not-started") {
      return html`
        <div class="actions">
          <ha-button appearance="outlined" @click=${this._showZWaveAdapters}>
            ${localize(
              "ui.panel.config.devices.esphome.setup_what_are_adapters"
            )}
          </ha-button>
        </div>
      `;
    }
    if (!isComponentLoaded(this._hassConfig!.config, "hassio")) {
      return html`
        <div class="actions">
          <ha-button
            appearance="plain"
            href=${documentationUrl(
              this._hassConfig!,
              "/integrations/zwave_js/"
            )}
            target="_blank"
            rel="noreferrer noopener"
          >
            ${localize("ui.panel.config.devices.esphome.setup_learn_more")}
            <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
          </ha-button>
        </div>
      `;
    }
    return html`
      <div class="actions">
        <ha-button @click=${this._setupZWave}>
          ${localize("ui.panel.config.devices.esphome.setup_zwave")}
        </ha-button>
      </div>
    `;
  }

  private _zwaveJSEntry() {
    const entryId = this._capabilities?.zwave_proxy.config_entry_id;
    if (!entryId || !this._configEntries) {
      return undefined;
    }
    return this._configEntries.find((entry) => entry.entry_id === entryId);
  }

  /** Undefined when USB usage has not been loaded. An empty array is a real scan. */
  private _serialConsumers(url: string) {
    if (!this._serialPorts) {
      return undefined;
    }
    return (
      this._serialPorts.find((port) => port.device === url)?.consumers ?? []
    );
  }

  private _renderSerialPortList() {
    const ports = this._capabilities?.serial_proxies ?? [];
    if (!ports.length) {
      return nothing;
    }
    const localize = this._i18n!.localize;
    return html`
      <ul class="ports">
        ${ports.map((port) => {
          const consumers = this._serialConsumers(port.url);
          return html`
            <li>
              <span class="port-text">
                <span class="port-name">${port.name}</span>
                ${
                  port.port_type
                    ? html`<span class="port-type"
                        >${this._serialPortTypeLabel(port.port_type)}</span
                      >`
                    : nothing
                }
                ${
                  consumers?.length
                    ? html`<span class="port-type">
                        ${consumers.map((consumer) => consumer.title).join(", ")}
                      </span>`
                    : nothing
                }
              </span>
              ${
                consumers === undefined
                  ? nothing
                  : consumers.length
                    ? html`
                        <span class="chip active">
                          ${localize(
                            "ui.panel.config.devices.esphome.setup_serial_configured"
                          )}
                        </span>
                      `
                    : html`
                        <ha-button size="s" @click=${this._setupSerialPort}>
                          ${localize(
                            "ui.panel.config.devices.esphome.setup_action"
                          )}
                        </ha-button>
                      `
              }
            </li>
          `;
        })}
      </ul>
    `;
  }

  private _renderZWaveAdapters() {
    const localize = this._i18n!.localize;
    return html`
      <p>${localize("ui.panel.config.devices.esphome.setup_adapters_intro")}</p>
      <ha-list-nav>
        <ha-list-item-button
          href=${documentationUrl(this._hassConfig!, "/connect/zbt-2/")}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span slot="headline">
            ${localize("ui.panel.config.devices.esphome.setup_adapter_zbt2")}
          </span>
          <span slot="supporting-text">
            ${localize(
              "ui.panel.config.devices.esphome.setup_adapter_zbt2_description"
            )}
          </span>
          <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
        </ha-list-item-button>
        <ha-list-item-button
          href=${documentationUrl(this._hassConfig!, "/connect/zwa-2/")}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span slot="headline">
            ${localize("ui.panel.config.devices.esphome.setup_adapter_zwa2")}
          </span>
          <span slot="supporting-text">
            ${localize(
              "ui.panel.config.devices.esphome.setup_adapter_zwa2_description"
            )}
          </span>
          <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
        </ha-list-item-button>
      </ha-list-nav>
    `;
  }

  private _setupSerialPort = (ev: Event) => {
    ev.stopPropagation();
    showAddIntegrationDialog(this);
  };

  private _dialogTitle(): string {
    const localize = this._i18n!.localize;
    if (this._view === "zwave-adapters") {
      return localize("ui.panel.config.devices.esphome.setup_adapters_title");
    }
    if (this._installingAudio || this._view === "audio-working") {
      return localize(ESPHOME_CAPABILITY_TITLE_KEYS.audio);
    }
    if (this._view === "audio-offer") {
      return localize(
        "ui.panel.config.devices.esphome.setup_audio_offer_title"
      );
    }
    return localize("ui.panel.config.devices.esphome.setup_title");
  }

  private _status(): ESPHomeSetupStatus | undefined {
    if (!this.params || !this._capabilities || !this._hassConfig) {
      return undefined;
    }
    const audio = this._audioControls();
    const status = deriveESPHomeSetupStatus(this._capabilities, {
      mediaPlayerSupported:
        Boolean(this.params.mediaPlayerSupported) || audio.supported,
      sendspinSupported: Boolean(audio.sendspinEntityId),
      sendspinEnabled: this._sendspinIsOn(audio),
      musicAssistantLoaded: isComponentLoaded(
        this._hassConfig.config,
        "music_assistant"
      ),
      serialConfigured:
        this._serialPorts === undefined
          ? undefined
          : isESPHomeSerialConfigured(
              this._capabilities.serial_proxies,
              this._serialPorts
            ),
      zwaveFlowInProgress:
        findESPHomeZWaveFlow(this._zwaveFlows, this._macAddress) !== undefined,
    });
    // A failed scan left no usage data. Keep the row, but do not show
    // Configured or Set up from that missing result.
    if (
      this._serialUsageError &&
      this._capabilities.serial_proxies.length > 0 &&
      this._serialPorts === undefined
    ) {
      status.serial = "not-started";
    }
    return status;
  }

  private async _load() {
    if (!this.params || !this._api || !this._i18n) {
      return;
    }
    this._fetching = true;
    this._error = undefined;
    try {
      const capabilities = await fetchESPHomeDeviceCapabilities(
        this._api,
        this.params.deviceId
      );
      if (!this.isConnected) {
        return;
      }
      this._capabilities = capabilities;
      if (capabilities.zwave_proxy.supported) {
        await this._refreshZWaveFlows();
        if (!this.isConnected) {
          return;
        }
      }
      await this._refreshSerialPorts();
      if (!this.isConnected) {
        return;
      }
      const status = this._status();
      if (status && this._expanded === undefined) {
        this._expanded =
          getESPHomeSetupCapabilityIds(status).find(
            (id) => status[id] !== "completed"
          ) ?? getESPHomeSetupCapabilityIds(status)[0];
      }
    } catch (err: unknown) {
      this._error =
        getWsErrorMessage(err) ??
        this._i18n.localize(
          "ui.panel.config.devices.esphome.setup_error_capabilities"
        );
    } finally {
      this._fetching = false;
    }
  }

  private async _readSerialUsage(
    capabilities: ESPHomeDeviceCapabilities
  ): Promise<
    { ok: true; ports: SerialPortUsage[] } | { ok: false; error: unknown }
  > {
    if (
      !capabilities.serial_proxies.length ||
      !this._api ||
      !this._hassConfig ||
      !isComponentLoaded(this._hassConfig.config, "usb")
    ) {
      return { ok: true, ports: [] };
    }
    try {
      return { ok: true, ports: await listSerialPortsWithUsage(this._api) };
    } catch (err: unknown) {
      return { ok: false, error: err };
    }
  }

  private async _refreshSerialPorts() {
    const capabilities = this._capabilities;
    if (!capabilities) {
      return;
    }
    const request = ++this._serialUsageRequest;
    const result = await this._readSerialUsage(capabilities);
    if (
      request !== this._serialUsageRequest ||
      !this.isConnected ||
      this._capabilities !== capabilities
    ) {
      return;
    }
    if (!result.ok) {
      this._serialUsageError =
        getWsErrorMessage(result.error) ??
        this._i18n!.localize("ui.panel.config.serial.loading_error");
      return;
    }
    this._serialUsageError = undefined;
    this._serialPorts = result.ports;
  }

  private _toggleCapability(ev: HASSDomCurrentTargetEvent<HTMLButtonElement>) {
    const capability = ev.currentTarget.dataset
      .capability as ESPHomeCapabilityId;
    this._expanded = this._expanded === capability ? undefined : capability;
  }

  private _showChecklist = () => {
    this._audioFlowId += 1;
    this._finishMusicAssistantDiscovery(undefined);
    this._view = "checklist";
    this._installingAudio = false;
    this._installStatus = undefined;
    this._error = undefined;
  };

  private _showZWaveAdapters = (ev: Event) => {
    ev.stopPropagation();
    this._view = "zwave-adapters";
  };

  private _audioControls(): ESPHomeAudioControls {
    if (!this.params) {
      return {
        supported: false,
        sendspinOn: false,
      };
    }
    return getESPHomeAudioControls(
      this.params.deviceId,
      this._entities ? Object.values(this._entities) : [],
      this._states ?? {}
    );
  }

  private _serialPortTypeLabel(portType: string): string {
    const key = SERIAL_PORT_TYPE_LABELS[portType as ESPHomeSerialPortType];
    return key ? this._i18n!.localize(key) : portType;
  }

  private _sendspinIsOn(audio: ESPHomeAudioControls): boolean {
    return this._sendspinOptimisticOn || audio.sendspinOn;
  }

  private _audioFlowCurrent(flowId: number): boolean {
    return this.isConnected && this._audioFlowId === flowId;
  }

  private _startAudioFlow = (ev: Event) => {
    ev.stopPropagation();
    if (!isComponentLoaded(this._hassConfig!.config, "music_assistant")) {
      this._view = "audio-offer";
      return;
    }
    void this._continueAfterMusicAssistant(this._audioFlowId);
  };

  private _skipMusicAssistant = (ev: Event) => {
    ev.stopPropagation();
    void this._continueAfterMusicAssistant(this._audioFlowId);
  };

  /** After Music Assistant is installed or skipped, turn Sendspin on. */
  private async _continueAfterMusicAssistant(flowId: number) {
    if (!this._audioFlowCurrent(flowId)) {
      return;
    }
    const audio = this._audioControls();
    if (audio.sendspinEntityId && !this._sendspinIsOn(audio)) {
      const enabled = await this._enableSendspin(
        flowId,
        audio.sendspinEntityId
      );
      if (!enabled || !this._audioFlowCurrent(flowId)) {
        return;
      }
    }
    if (!this._audioFlowCurrent(flowId)) {
      return;
    }
    this._view = "checklist";
    this._installStatus = undefined;
  }

  private async _enableSendspin(
    flowId: number,
    entityId: string
  ): Promise<boolean> {
    if (!this._api || !this._i18n || !this._audioFlowCurrent(flowId)) {
      return false;
    }
    this._view = "audio-working";
    this._installingAudio = true;
    this._installStatus = this._i18n.localize(
      "ui.panel.config.devices.esphome.setup_enabling_sendspin"
    );
    const stateBefore = this._states?.[entityId];
    this._sendspinOptimisticOn = true;
    try {
      await this._api.callService("switch", "turn_on", {
        entity_id: entityId,
      });
      if (!this._audioFlowCurrent(flowId)) {
        return false;
      }
      window.setTimeout(() => {
        if (
          this._states?.[entityId] === stateBefore &&
          this._sendspinOptimisticOn
        ) {
          this._sendspinOptimisticOn = false;
        }
      }, SWITCH_RESYNC_MS);
      return true;
    } catch {
      // callService already shows the failure toast.
      this._sendspinOptimisticOn = false;
      if (this._audioFlowCurrent(flowId)) {
        this._view = "checklist";
        this._installStatus = undefined;
      }
      return false;
    } finally {
      if (this._audioFlowCurrent(flowId)) {
        this._installingAudio = false;
      }
    }
  }

  private _installMusicAssistant = async (ev: Event) => {
    ev.stopPropagation();
    if (!this._api || !this._i18n || !this._connection) {
      return;
    }
    const flowId = this._audioFlowId;
    this._view = "audio-working";
    this._installingAudio = true;
    this._error = undefined;
    this._installStatus = this._i18n.localize(
      "ui.panel.config.devices.esphome.setup_installing_music_assistant"
    );
    try {
      const { addons } = await fetchHassioAddonsInfo(this._api);
      if (!this._audioFlowCurrent(flowId)) {
        return;
      }
      const addon = addons.find(
        (item) => item.slug === MUSIC_ASSISTANT_ADDON_SLUG
      );
      if (!addon) {
        await installHassioAddon(this._api.callWS, MUSIC_ASSISTANT_ADDON_SLUG);
      }
      if (!this._audioFlowCurrent(flowId)) {
        return;
      }
      if (!addon || addon.state !== "started") {
        this._installStatus = this._i18n.localize(
          "ui.panel.config.devices.esphome.setup_starting_music_assistant"
        );
        await startHassioAddon(this._api.callWS, MUSIC_ASSISTANT_ADDON_SLUG);
      }
      if (!this._audioFlowCurrent(flowId)) {
        return;
      }
      this._installStatus = this._i18n.localize(
        "ui.panel.config.devices.esphome.setup_discovering_music_assistant"
      );
      await this._openMusicAssistantFlow(flowId);
    } catch (err: unknown) {
      if (!this._audioFlowCurrent(flowId) || !this._i18n) {
        return;
      }
      this._view = "audio-offer";
      await showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.devices.esphome.setup_error_music_assistant"
        ),
        text: extractApiErrorMessage(err),
      });
    } finally {
      if (this._audioFlowCurrent(flowId)) {
        this._installingAudio = false;
      }
    }
  };

  private async _openMusicAssistantFlow(flowId: number) {
    if (!this._connection) {
      return;
    }
    const flow = await this._waitForHassioMusicAssistantFlow();
    if (!this._audioFlowCurrent(flowId)) {
      return;
    }
    const continueSetup = ({ flowFinished }: { flowFinished: boolean }) => {
      if (!this._audioFlowCurrent(flowId)) {
        return;
      }
      if (!flowFinished) {
        this._installingAudio = false;
        this._installStatus = undefined;
        this._view = "audio-offer";
        return;
      }
      void this._continueAfterMusicAssistant(flowId);
    };
    if (flow) {
      showConfigFlowDialog(this, {
        continueFlowId: flow.flow_id,
        dialogClosedCallback: continueSetup,
      });
      return;
    }
    showConfigFlowDialog(this, {
      startFlowHandler: "music_assistant",
      dialogClosedCallback: continueSetup,
    });
  }

  private _finishMusicAssistantDiscovery(
    flow: DataEntryFlowProgress | undefined
  ) {
    const pending = this._musicAssistantDiscovery;
    if (!pending) {
      return;
    }
    this._musicAssistantDiscovery = undefined;
    if (pending.timer !== undefined) {
      window.clearTimeout(pending.timer);
    }
    pending.unsub?.();
    pending.resolve?.(flow);
  }

  private _waitForHassioMusicAssistantFlow(): Promise<
    DataEntryFlowProgress | undefined
  > {
    const connection = this._connection;
    if (!connection) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
      const pending: NonNullable<typeof this._musicAssistantDiscovery> = {
        resolve,
      };
      this._musicAssistantDiscovery = pending;
      pending.timer = window.setTimeout(
        () => this._finishMusicAssistantDiscovery(undefined),
        MUSIC_ASSISTANT_DISCOVERY_TIMEOUT_MS
      );
      void subscribeConfigFlowInProgress(connection, (messages) => {
        const flow = hassioMusicAssistantFlow(messages);
        if (flow) {
          this._finishMusicAssistantDiscovery(flow);
        }
      })
        .then((unsub) => {
          if (this._musicAssistantDiscovery !== pending) {
            unsub();
            return;
          }
          pending.unsub = unsub;
        })
        .catch(() => this._finishMusicAssistantDiscovery(undefined));
    });
  }

  private async _refreshZWaveFlows() {
    if (!this._connection) {
      return;
    }
    try {
      const flows = await fetchConfigFlowInProgress(
        this._connection.connection
      );
      this._zwaveFlows = flows.filter((flow) => flow.handler === "zwave_js");
    } catch {
      // Keep the last list.
    }
  }

  private async _setupZWave(ev: Event) {
    ev.stopPropagation();
    if (!this._connection || !this._capabilities || !this._i18n) {
      return;
    }
    let flows: DataEntryFlowProgress[];
    try {
      flows = await fetchConfigFlowInProgress(this._connection.connection);
    } catch {
      if (this.isConnected) {
        this._error = this._i18n.localize(
          "ui.panel.config.devices.esphome.setup_error_zwave"
        );
      }
      return;
    }
    if (!this.isConnected) {
      return;
    }
    const flow = findESPHomeZWaveFlow(flows, this._macAddress);
    if (!flow) {
      this._error = this._i18n.localize(
        "ui.panel.config.devices.esphome.setup_error_zwave"
      );
      return;
    }
    this._error = undefined;
    showConfigFlowDialog(this, {
      continueFlowId: flow.flow_id,
      dialogClosedCallback: () => {
        this._load();
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-8);
        }
        .intro,
        .install-status,
        .check-body p {
          margin: 0 0 var(--ha-space-4);
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-normal);
        }
        .checklist {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
        }
        .check-item {
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md);
          overflow: hidden;
        }
        .check-item.open {
          border-color: color-mix(
            in srgb,
            var(--primary-text-color) 20%,
            transparent
          );
        }
        .check-head {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          width: 100%;
          min-height: 64px;
          margin: 0;
          padding: var(--ha-space-3);
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: start;
          cursor: pointer;
        }
        .check-head:hover {
          background: color-mix(
            in srgb,
            var(--primary-text-color) 4%,
            transparent
          );
        }
        .check-head:focus-visible {
          outline: var(--ha-focus-ring, 2px solid var(--primary-color));
          outline-offset: -2px;
        }
        .icon-chip {
          position: relative;
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--ha-border-radius-circle);
          color: var(--capability-accent);
        }
        .icon-chip::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: var(--capability-accent);
          opacity: 0.12;
        }
        .icon-chip ha-svg-icon {
          position: relative;
          --mdc-icon-size: 22px;
        }
        .check-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .check-title {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
        }
        .check-short {
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-condensed);
        }
        .check-end {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .status-badge {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: var(--ha-border-radius-circle);
          background: var(--success-color);
          color: var(--ha-color-on-success-loud);
        }
        .status-badge ha-svg-icon,
        .chevron {
          --mdc-icon-size: 16px;
        }
        .chevron {
          color: var(--secondary-text-color);
          transition: transform var(--ha-animation-duration-fast) ease;
        }
        .chevron.open {
          transform: rotate(180deg);
        }
        .check-body {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-3);
          padding: 0 var(--ha-space-3) var(--ha-space-3);
          padding-inline-start: calc(
            var(--ha-space-3) + 40px + var(--ha-space-4)
          );
        }
        .check-body p {
          margin: 0;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--ha-space-2);
        }
        ha-dialog-footer > ha-button[slot="secondaryAction"] {
          margin-inline-end: auto;
        }
        .audio-icon {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
        }
        .audio-icon ha-svg-icon,
        .audio-icon ha-domain-icon {
          --mdc-icon-size: 28px;
          width: 28px;
          height: 28px;
        }
        .audio-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .audio-name {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }
        .audio-meta {
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }
        .chip {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          height: 22px;
          padding: 0 9px;
          border-radius: var(--ha-border-radius-pill);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-medium);
          line-height: 1;
        }
        .chip.active {
          background: var(--success-color);
          color: var(--ha-color-on-success-loud);
        }
        .ma-offer {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }
        .ma-offer-head {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
        }
        .ma-offer p,
        .audio-working p {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-normal);
        }
        .audio-working {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-4);
          padding: var(--ha-space-10) 0;
        }
        .sendspin-lockup {
          display: block;
          height: 26px;
          width: auto;
          max-width: 100%;
          align-self: start;
          object-fit: contain;
          object-position: left center;
        }
        .sendspin-lockup.dark {
          filter: invert(1) hue-rotate(180deg);
        }
        .ma-benefits {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .ma-benefit {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
          font-size: var(--ha-font-size-s);
          color: var(--primary-text-color);
        }
        .ma-benefit ha-svg-icon {
          flex-shrink: 0;
          color: var(--light-green-color);
          --mdc-icon-size: 16px;
        }
        .ports {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
          margin: 0 0 var(--ha-space-4);
          padding: 0;
          list-style: none;
        }
        .ports li {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
          padding: var(--ha-space-3);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-lg);
          background: var(--card-background-color);
        }
        .port-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .port-name {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }
        .port-type {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .ports ha-button {
          flex-shrink: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-esphome-device-setup": DialogESPHomeDeviceSetup;
  }
}
