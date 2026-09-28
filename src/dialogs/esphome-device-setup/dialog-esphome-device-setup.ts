import { consume, type ContextType } from "@lit/context";
import {
  mdiCheck,
  mdiChevronDown,
  mdiChevronLeft,
  mdiOpenInNew,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import type { HASSDomTargetEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/entity/ha-entity-toggle";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-domain-icon";
import "../../components/ha-icon-button";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import type { HaSwitch } from "../../components/ha-switch";
import "../../components/ha-switch";
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
  fetchHassioAddonInfo,
  fetchHassioAddonsInfo,
  installHassioAddon,
  startHassioAddon,
} from "../../data/hassio/addon";
import { extractApiErrorMessage } from "../../data/hassio/common";
import { listSerialPortsWithUsage, type SerialPortUsage } from "../../data/usb";
import { showAddIntegrationDialog } from "../../panels/config/integrations/show-add-integration-dialog";
import { haStyle, haStyleDialog } from "../../resources/styles";
import { documentationUrl } from "../../util/documentation-url";
import { showConfigFlowDialog } from "../config-flow/show-dialog-config-flow";
import { DialogMixin } from "../dialog-mixin";
import { showAlertDialog } from "../generic/show-dialog-box";
import type { ESPHomeDeviceSetupDialogParams } from "./show-dialog-esphome-device-setup";

type SetupView = "checklist" | "zwave-adapters";

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
  private _ui?: ContextType<typeof uiContext>;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api?: ContextType<typeof apiContext>;

  @state()
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

  @state() private _capabilities?: ESPHomeDeviceCapabilities;

  @state() private _serialPorts: SerialPortUsage[] = [];

  @state() private _fetching = true;

  @state() private _error?: string;

  @state() private _view: SetupView = "checklist";

  @state() private _expanded?: ESPHomeCapabilityId;

  @state() private _installingAudio = false;

  @state() private _installStatus?: string;

  /** Optimistic guest-access value until the entity state catches up. */
  @state() private _guestToggleOn?: boolean;

  private _loaded = false;

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
    if (this._guestToggleOn !== undefined && changedProps.has("_states")) {
      const entityId = this._audioControls().guestEntityId;
      const previous = changedProps.get("_states") as
        ContextType<typeof statesContext> | undefined;
      if (entityId && previous?.[entityId] !== this._states?.[entityId]) {
        this._guestToggleOn = undefined;
      }
    }
    if (
      !this._loaded &&
      this.params &&
      this._api &&
      this._i18n &&
      this._hassConfig
    ) {
      this._loaded = true;
      this._capabilities = this.params.capabilities;
      this._load();
    } else if (
      this._loaded &&
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
                <ha-icon-button
                  slot="headerNavigationIcon"
                  .path=${mdiChevronLeft}
                  .label=${this._i18n.localize("ui.common.back")}
                  @click=${this._showChecklist}
                ></ha-icon-button>
              `
            : nothing
        }
        ${this._renderContent()}
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
                              dark: Boolean(this._ui?.themes.darkMode),
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
                  ${id === "audio" ? this._renderAudioActions() : nothing}
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

  private _renderAudioActions() {
    const localize = this._i18n!.localize;
    const hassio = isComponentLoaded(this._hassConfig!.config, "hassio");
    const musicAssistantReady = isComponentLoaded(
      this._hassConfig!.config,
      "music_assistant"
    );
    const audio = this._audioControls();
    return html`
      <div class="audio-players">
        ${
          musicAssistantReady
            ? html`
                <div class="audio-player stacked">
                  <div class="audio-player-row">
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
                        ${localize(
                          "ui.panel.config.devices.esphome.setup_audio_installed"
                        )}
                      </span>
                    </span>
                    ${this._statusBadge("completed")}
                  </div>
                  <div class="actions">
                    <ha-button
                      appearance="outlined"
                      @click=${this._openMusicAssistant}
                    >
                      ${localize(
                        "ui.panel.config.devices.esphome.setup_open_music_assistant"
                      )}
                    </ha-button>
                  </div>
                </div>
                ${this._renderSendspinRows(audio)}
              `
            : html`
                <div class="ma-flat">
                  <div class="ma-flat-head">
                    <span class="audio-icon">
                      <ha-domain-icon
                        domain="music_assistant"
                        brand-fallback
                      ></ha-domain-icon>
                    </span>
                    <span class="audio-name">
                      ${localize(
                        "ui.panel.config.devices.esphome.setup_audio_music_assistant"
                      )}
                    </span>
                  </div>
                  <div class="ma-upsell-benefits">
                    <div class="ma-benefit">
                      <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
                      <span>
                        ${localize(
                          "ui.panel.config.devices.esphome.setup_audio_benefit_multiroom"
                        )}
                      </span>
                    </div>
                    <div class="ma-benefit">
                      <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
                      <span>
                        ${localize(
                          "ui.panel.config.devices.esphome.setup_audio_benefit_lossless"
                        )}
                      </span>
                    </div>
                    <div class="ma-benefit">
                      <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
                      <span>
                        ${localize(
                          "ui.panel.config.devices.esphome.setup_audio_benefit_album_art"
                        )}
                      </span>
                    </div>
                  </div>
                  <p class="sendspin-hint">
                    ${localize(
                      "ui.panel.config.devices.esphome.setup_audio_install_first"
                    )}
                  </p>
                  ${
                    this._installingAudio
                      ? html`<p class="install-status">
                          ${this._installStatus}
                        </p>`
                      : nothing
                  }
                  <div class="actions">
                    ${
                      hassio
                        ? html`
                            <ha-button
                              .loading=${this._installingAudio}
                              @click=${this._installMusicAssistant}
                            >
                              ${localize(
                                "ui.panel.config.devices.esphome.setup_install_music_assistant"
                              )}
                            </ha-button>
                          `
                        : nothing
                    }
                    <ha-button
                      appearance="plain"
                      href=${MUSIC_ASSISTANT_DOCS_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      ${localize(
                        "ui.panel.config.devices.esphome.setup_learn_more"
                      )}
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiOpenInNew}
                      ></ha-svg-icon>
                    </ha-button>
                  </div>
                </div>
              `
        }
      </div>
    `;
  }

  private _renderSendspinRows(audio: ESPHomeAudioControls) {
    if (!audio.sendspinEntityId && !audio.guestEntityId) {
      return nothing;
    }
    const localize = this._i18n!.localize;
    const sendspinBlocked = !audio.sendspinOn;
    const guestDisabled = sendspinBlocked || !audio.guestAvailable;
    return html`
      <div class="sendspin-list">
        ${
          audio.sendspinEntityId
            ? html`
                <div class="sendspin-row">
                  <span class="sendspin-text">
                    <span class="audio-name">
                      ${localize(
                        "ui.panel.config.devices.esphome.setup_audio_sendspin"
                      )}
                    </span>
                    <span class="audio-meta">
                      ${localize(
                        "ui.panel.config.devices.esphome.setup_audio_sendspin_meta"
                      )}
                    </span>
                  </span>
                  <ha-entity-toggle
                    .stateObj=${this._states?.[audio.sendspinEntityId]}
                  ></ha-entity-toggle>
                </div>
              `
            : nothing
        }
        ${
          audio.guestEntityId
            ? html`
                <div class="sendspin-row ${guestDisabled ? "is-disabled" : ""}">
                  <span class="sendspin-text">
                    <span class="audio-name">
                      ${localize(
                        "ui.panel.config.devices.esphome.setup_audio_guest"
                      )}
                    </span>
                    <span class="audio-meta">
                      ${localize(
                        sendspinBlocked
                          ? "ui.panel.config.devices.esphome.setup_audio_guest_needs_sendspin"
                          : "ui.panel.config.devices.esphome.setup_audio_guest_meta"
                      )}
                    </span>
                  </span>
                  <ha-switch
                    .checked=${
                      sendspinBlocked
                        ? false
                        : (this._guestToggleOn ?? audio.guestOn)
                    }
                    .disabled=${guestDisabled}
                    @change=${this._guestToggled}
                  ></ha-switch>
                </div>
              `
            : nothing
        }
      </div>
    `;
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

  private _serialConsumers(url: string) {
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
                  consumers.length
                    ? html`<span class="port-type">
                        ${consumers.map((consumer) => consumer.title).join(", ")}
                      </span>`
                    : nothing
                }
              </span>
              ${
                consumers.length
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
    return localize("ui.panel.config.devices.esphome.setup_title");
  }

  private _status(): ESPHomeSetupStatus | undefined {
    if (!this.params || !this._capabilities || !this._hassConfig) {
      return undefined;
    }
    const audio = this._audioControls();
    return deriveESPHomeSetupStatus(this._capabilities, {
      mediaPlayerSupported:
        Boolean(this.params.mediaPlayerSupported) || audio.supported,
      sendspinSupported: Boolean(audio.sendspinEntityId),
      sendspinEnabled: audio.sendspinOn,
      musicAssistantLoaded: isComponentLoaded(
        this._hassConfig.config,
        "music_assistant"
      ),
      serialConfigured: isESPHomeSerialConfigured(
        this._capabilities.serial_proxies,
        this._serialPorts
      ),
    });
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
      const serialPorts = await this._fetchSerialUsage(capabilities);
      this._capabilities = capabilities;
      this._serialPorts = serialPorts;
      const status = this._status();
      if (status && this._expanded === undefined) {
        this._expanded =
          getESPHomeSetupCapabilityIds(status).find(
            (id) => status[id] !== "completed"
          ) ?? getESPHomeSetupCapabilityIds(status)[0];
      }
    } catch (err: unknown) {
      this._error =
        err instanceof Error
          ? err.message
          : this._i18n.localize(
              "ui.panel.config.devices.esphome.setup_error_capabilities"
            );
    } finally {
      this._fetching = false;
    }
  }

  private async _fetchSerialUsage(
    capabilities: ESPHomeDeviceCapabilities
  ): Promise<SerialPortUsage[]> {
    if (
      !capabilities.serial_proxies.length ||
      !this._api ||
      !this._hassConfig ||
      !isComponentLoaded(this._hassConfig.config, "usb")
    ) {
      return [];
    }
    try {
      return await listSerialPortsWithUsage(this._api);
    } catch {
      return [];
    }
  }

  private async _refreshSerialPorts() {
    if (!this._capabilities) {
      return;
    }
    const ports = await this._fetchSerialUsage(this._capabilities);
    if (this.isConnected) {
      this._serialPorts = ports;
    }
  }

  private _toggleCapability(ev: Event) {
    const capability = (ev.currentTarget as HTMLElement).dataset
      .capability as ESPHomeCapabilityId;
    this._expanded = this._expanded === capability ? undefined : capability;
  }

  private _showChecklist = () => {
    this._view = "checklist";
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
        sendspinAvailable: false,
        guestOn: false,
        guestAvailable: false,
        guestRequiresPin: false,
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

  private _guestToggled = async (
    ev: Event & HASSDomTargetEvent<HaSwitch>
  ): Promise<void> => {
    ev.stopPropagation();
    const audio = this._audioControls();
    const entityId = audio.guestEntityId;
    if (!entityId || !audio.sendspinOn || !this._api) {
      return;
    }
    const guestOn = ev.target.checked;
    const turnOn = audio.guestRequiresPin ? !guestOn : guestOn;
    const stateBefore = this._states?.[entityId];
    this._guestToggleOn = guestOn;
    try {
      await this._api.callService("switch", turnOn ? "turn_on" : "turn_off", {
        entity_id: entityId,
      });
    } catch {
      // callService already shows the failure toast.
      this._guestToggleOn = undefined;
    } finally {
      // Same two-second resync as ha-entity-toggle when the state does not follow.
      window.setTimeout(() => {
        if (
          this._states?.[entityId] === stateBefore &&
          this._guestToggleOn !== undefined
        ) {
          this._guestToggleOn = undefined;
        }
      }, SWITCH_RESYNC_MS);
    }
  };

  private async _installMusicAssistant(ev: Event) {
    ev.stopPropagation();
    if (!this._api || !this._i18n || !this._connection) {
      return;
    }
    this._installingAudio = true;
    this._error = undefined;
    try {
      const { addons } = await fetchHassioAddonsInfo(this._api);
      const addon = addons.find(
        (item) => item.slug === MUSIC_ASSISTANT_ADDON_SLUG
      );
      if (!addon) {
        this._installStatus = this._i18n.localize(
          "ui.panel.config.devices.esphome.setup_installing_music_assistant"
        );
        await installHassioAddon(this._api.callWS, MUSIC_ASSISTANT_ADDON_SLUG);
      }
      if (!addon || addon.state !== "started") {
        this._installStatus = this._i18n.localize(
          "ui.panel.config.devices.esphome.setup_starting_music_assistant"
        );
        await startHassioAddon(this._api.callWS, MUSIC_ASSISTANT_ADDON_SLUG);
      }
      this._installStatus = this._i18n.localize(
        "ui.panel.config.devices.esphome.setup_discovering_music_assistant"
      );
      await this._openMusicAssistantFlow();
    } catch (err: unknown) {
      this._error = extractApiErrorMessage(err);
      await showAlertDialog(this, {
        title: this._i18n.localize(
          "ui.panel.config.devices.esphome.setup_error_music_assistant"
        ),
        text: this._error,
      });
    } finally {
      this._installingAudio = false;
      this._installStatus = undefined;
    }
  }

  private async _openMusicAssistantFlow() {
    if (!this._connection) {
      return;
    }
    const flow = await this._waitForHassioMusicAssistantFlow();
    if (!this.isConnected) {
      return;
    }
    if (flow) {
      showConfigFlowDialog(this, {
        continueFlowId: flow.flow_id,
        dialogClosedCallback: () => {
          this._load();
        },
      });
      return;
    }
    showConfigFlowDialog(this, {
      startFlowHandler: "music_assistant",
      dialogClosedCallback: () => {
        this._load();
      },
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

  private async _openMusicAssistant(ev: Event) {
    ev.stopPropagation();
    if (
      this._api &&
      this._hassConfig &&
      isComponentLoaded(this._hassConfig.config, "hassio")
    ) {
      try {
        const addon = await fetchHassioAddonInfo(
          this._api.callWS,
          MUSIC_ASSISTANT_ADDON_SLUG
        );
        if (addon.ingress) {
          navigate(`/app/${MUSIC_ASSISTANT_ADDON_SLUG}`);
          this.closeDialog();
          return;
        }
      } catch (_err) {
        // Fall through to the public Music Assistant site.
      }
    }
    window.open(MUSIC_ASSISTANT_DOCS_URL, "_blank", "noreferrer");
  }

  private async _setupZWave(ev: Event) {
    ev.stopPropagation();
    if (!this._connection || !this._capabilities) {
      return;
    }
    const homeId = String(this._capabilities.zwave_proxy.home_id);
    const flow = (
      await fetchConfigFlowInProgress(this._connection.connection)
    ).find(
      (item) =>
        item.handler === "zwave_js" &&
        item.context?.source === "esphome" &&
        item.context?.unique_id === homeId
    );
    if (flow) {
      showConfigFlowDialog(this, {
        continueFlowId: flow.flow_id,
        dialogClosedCallback: () => {
          this._load();
        },
      });
      return;
    }
    showConfigFlowDialog(this, {
      startFlowHandler: "zwave_js",
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
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--ha-border-radius-circle);
          background: color-mix(
            in srgb,
            var(--capability-accent) 12%,
            transparent
          );
          color: var(--capability-accent);
        }
        .icon-chip ha-svg-icon {
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
        .audio-players {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
        }
        .audio-player {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
          padding: var(--ha-space-3);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-lg);
          background: var(--card-background-color);
        }
        .audio-player.stacked {
          flex-direction: column;
          align-items: stretch;
          gap: var(--ha-space-3);
        }
        .audio-player-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
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
        .ma-flat {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          padding: var(--ha-space-4);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-lg);
          background: var(--card-background-color);
        }
        .ma-flat-head {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
        }
        .sendspin-hint {
          margin: 0;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .sendspin-list {
          display: flex;
          flex-direction: column;
        }
        .sendspin-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-4);
          min-height: 52px;
          padding: var(--ha-space-2) var(--ha-space-1);
        }
        .sendspin-row + .sendspin-row {
          border-top: 1px solid var(--divider-color);
        }
        .sendspin-text {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .sendspin-row.is-disabled .audio-name,
        .sendspin-row.is-disabled .audio-meta {
          opacity: 0.55;
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
        .ma-upsell-benefits {
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
          color: var(--capability-accent, var(--success-color));
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
