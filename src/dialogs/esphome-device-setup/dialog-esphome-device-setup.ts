import { consume, type ContextType } from "@lit/context";
import {
  mdiAccessPoint,
  mdiBluetooth,
  mdiCheck,
  mdiChevronDown,
  mdiChevronLeft,
  mdiMusic,
  mdiOpenInNew,
  mdiSwapHorizontal,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import type { LocalizeKeys } from "../../common/translations/localize";
import { waitForMs } from "../../common/util/wait";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-domain-icon";
import "../../components/ha-icon-button";
import "../../components/ha-icon-next";
import "../../components/ha-spinner";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-nav";
import { fetchConfigFlowInProgress } from "../../data/config_flow";
import {
  apiContext,
  configContext,
  configEntriesContext,
  connectionContext,
  devicesContext,
  entitiesContext,
  internationalizationContext,
} from "../../data/context";
import type { DataEntryFlowProgress } from "../../data/data_entry_flow";
import {
  fetchESPHomeDeviceCapabilities,
  type ESPHomeDeviceCapabilities,
} from "../../data/esphome";
import {
  deriveESPHomeSetupStatus,
  deviceHasMediaPlayerEntity,
  ESPHOME_CAPABILITY_ACCENTS,
  ESPHOME_SERIAL_INTEGRATIONS,
  getESPHomeSetupCapabilityIds,
  hasZWaveJSEntryForDevice,
  MUSIC_ASSISTANT_ADDON_SLUG,
  MUSIC_ASSISTANT_DOCS_URL,
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
import { domainToName, fetchIntegrationManifest } from "../../data/integration";
import { mdiHomeAssistant } from "../../resources/home-assistant-logo-svg";
import { haStyle, haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { showConfigFlowDialog } from "../config-flow/show-dialog-config-flow";
import { DialogMixin } from "../dialog-mixin";
import { showAlertDialog } from "../generic/show-dialog-box";
import type { ESPHomeDeviceSetupDialogParams } from "./show-dialog-esphome-device-setup";

type SetupView = "checklist" | "zwave-adapters" | "serial";

const CAPABILITY_ICONS: Record<ESPHomeCapabilityId, string> = {
  bluetooth: mdiBluetooth,
  audio: mdiMusic,
  connectivity: mdiAccessPoint,
  serial: mdiSwapHorizontal,
};

const CAPABILITY_TITLE_KEYS: Record<ESPHomeCapabilityId, LocalizeKeys> = {
  bluetooth: "ui.panel.config.devices.esphome.setup_capability_bluetooth_title",
  audio: "ui.panel.config.devices.esphome.setup_capability_audio_title",
  connectivity:
    "ui.panel.config.devices.esphome.setup_capability_connectivity_title",
  serial: "ui.panel.config.devices.esphome.setup_capability_serial_title",
};

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

@customElement("dialog-esphome-device-setup")
class DialogESPHomeDeviceSetup extends DialogMixin<ESPHomeDeviceSetupDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

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
  @consume({ context: devicesContext, subscribe: true })
  private _devices?: ContextType<typeof devicesContext>;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities?: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  private _configEntries?: ContextType<typeof configEntriesContext>;

  @state() private _capabilities?: ESPHomeDeviceCapabilities;

  @state() private _fetching = true;

  @state() private _error?: string;

  @state() private _view: SetupView = "checklist";

  @state() private _expanded?: ESPHomeCapabilityId;

  @state() private _installingAudio = false;

  @state() private _installStatus?: string;

  private _loaded = false;

  public disconnectedCallback() {
    this.params?.dialogClosedCallback?.();
    super.disconnectedCallback();
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      !this._loaded &&
      this.params &&
      this._api &&
      this._i18n &&
      this._hassConfig &&
      this._devices
    ) {
      this._loaded = true;
      this._capabilities = this.params.capabilities;
      this._load();
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
    if (this._view === "serial") {
      return this._renderSerial();
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
            <ha-svg-icon .path=${CAPABILITY_ICONS[id]}></ha-svg-icon>
          </span>
          <span class="check-text">
            <span class="check-title">
              ${localize(CAPABILITY_TITLE_KEYS[id])}
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
                  <p>${localize(CAPABILITY_DESCRIPTION_KEYS[id])}</p>
                  ${id === "audio" ? this._renderAudioActions(status) : nothing}
                  ${
                    id === "connectivity"
                      ? this._renderConnectivityActions(status)
                      : nothing
                  }
                  ${id === "serial" ? this._renderSerialActions() : nothing}
                </div>
              `
            : nothing
        }
      </div>
    `;
  }

  private _statusBadge(status: ESPHomeCapabilityStatus) {
    if (status !== "completed" && status !== "active") {
      return nothing;
    }
    return html`
      <span
        class="status-badge ${status}"
        role="img"
        aria-label=${this._i18n!.localize(
          status === "completed"
            ? "ui.panel.config.devices.esphome.setup_status_completed"
            : "ui.panel.config.devices.esphome.setup_status_active"
        )}
      >
        <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
      </span>
    `;
  }

  private _renderAudioActions(status: ESPHomeCapabilityStatus) {
    const localize = this._i18n!.localize;
    const hassio = isComponentLoaded(this._hassConfig!.config, "hassio");
    const musicAssistantReady = status === "completed";
    return html`
      <div class="audio-players">
        <div class="audio-player">
          <span class="audio-icon">
            <ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>
          </span>
          <span class="audio-text">
            <span class="audio-name">
              ${localize(
                "ui.panel.config.devices.esphome.setup_audio_home_assistant"
              )}
            </span>
            <span class="audio-meta">
              ${localize(
                "ui.panel.config.devices.esphome.setup_audio_builtin_playback"
              )}
            </span>
          </span>
          <span class="chip active">
            ${localize("ui.panel.config.devices.esphome.setup_audio_active")}
          </span>
        </div>
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
                          "ui.panel.config.devices.esphome.setup_audio_music_assistant_meta"
                        )}
                      </span>
                    </span>
                    <span class="chip active">
                      ${localize(
                        "ui.panel.config.devices.esphome.setup_audio_active"
                      )}
                    </span>
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
              `
            : html`
                <div class="ma-upsell">
                  <div class="ma-upsell-head">
                    <span class="audio-icon">
                      <ha-domain-icon
                        domain="music_assistant"
                        brand-fallback
                      ></ha-domain-icon>
                    </span>
                    <span class="ma-upsell-title">
                      <span class="audio-name">
                        ${localize(
                          "ui.panel.config.devices.esphome.setup_audio_music_assistant"
                        )}
                      </span>
                      <span class="audio-meta">
                        ${localize(
                          "ui.panel.config.devices.esphome.setup_audio_music_assistant_upsell"
                        )}
                      </span>
                    </span>
                    <span class="chip recommended">
                      ${localize(
                        "ui.panel.config.devices.esphome.setup_audio_recommended"
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

  private _renderConnectivityActions(status: ESPHomeCapabilityStatus) {
    const localize = this._i18n!.localize;
    if (status === "completed") {
      return nothing;
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
    return html`
      <div class="actions">
        <ha-button @click=${this._setupZWave}>
          ${localize("ui.panel.config.devices.esphome.setup_zwave")}
        </ha-button>
      </div>
    `;
  }

  private _renderSerialActions() {
    return html`
      <div class="actions">
        <ha-button @click=${this._showSerial}>
          ${this._i18n!.localize(
            "ui.panel.config.devices.esphome.setup_action"
          )}
        </ha-button>
      </div>
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

  private _renderSerial() {
    const localize = this._i18n!.localize;
    const ports = this._capabilities?.serial_proxies ?? [];
    return html`
      <p>${localize("ui.panel.config.devices.esphome.setup_serial_intro")}</p>
      ${
        ports.length
          ? html`
              <h3>
                ${localize(
                  "ui.panel.config.devices.esphome.setup_serial_ports"
                )}
              </h3>
              <ul class="ports">
                ${ports.map(
                  (port) => html`
                    <li>
                      ${port.name}
                      ${
                        port.port_type
                          ? html`<span class="port-type"
                              >${port.port_type}</span
                            >`
                          : nothing
                      }
                    </li>
                  `
                )}
              </ul>
            `
          : nothing
      }
      <h3>
        ${localize("ui.panel.config.devices.esphome.setup_serial_integrations")}
      </h3>
      <ha-list-nav>
        ${ESPHOME_SERIAL_INTEGRATIONS.map(
          (domain) => html`
            <ha-list-item-button
              data-domain=${domain}
              @click=${this._setupSerialIntegration}
            >
              <ha-domain-icon
                slot="start"
                .domain=${domain}
                brand-fallback
              ></ha-domain-icon>
              <span slot="headline">${domainToName(localize, domain)}</span>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-list-item-button>
          `
        )}
      </ha-list-nav>
    `;
  }

  private _dialogTitle(): string {
    const localize = this._i18n!.localize;
    if (this._view === "zwave-adapters") {
      return localize("ui.panel.config.devices.esphome.setup_adapters_title");
    }
    if (this._view === "serial") {
      return localize("ui.panel.config.devices.esphome.setup_serial_choose");
    }
    return localize("ui.panel.config.devices.esphome.setup_title");
  }

  private _status(): ESPHomeSetupStatus | undefined {
    if (
      !this.params ||
      !this._capabilities ||
      !this._hassConfig ||
      !this._devices
    ) {
      return undefined;
    }
    return deriveESPHomeSetupStatus(this._capabilities, {
      mediaPlayerSupported:
        Boolean(this.params.mediaPlayerSupported) ||
        (this._entities
          ? deviceHasMediaPlayerEntity(
              this.params.deviceId,
              Object.values(this._entities)
            )
          : false),
      musicAssistantLoaded: isComponentLoaded(
        this._hassConfig.config,
        "music_assistant"
      ),
      zwaveJsEntryExists: this._configEntries
        ? hasZWaveJSEntryForDevice(
            this.params.deviceId,
            this._devices,
            this._configEntries
          )
        : false,
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
      this._capabilities = capabilities;
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

  private async _showSerial(ev: Event) {
    ev.stopPropagation();
    if (this._i18n) {
      await Promise.all(
        ESPHOME_SERIAL_INTEGRATIONS.map((domain) =>
          this._i18n!.loadBackendTranslation("title", domain)
        )
      );
    }
    this._view = "serial";
  }

  private async _installMusicAssistant(ev: Event) {
    ev.stopPropagation();
    if (!this._api || !this._i18n || !this._connection) {
      return;
    }
    this._installingAudio = true;
    this._error = undefined;
    try {
      const { addons } = await fetchHassioAddonsInfo({
        callWS: this._api.callWS,
      } as HomeAssistant);
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
      await this._openMusicAssistantFlow(true);
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

  private async _openMusicAssistantFlow(waitForDiscovery = false) {
    if (!this._connection) {
      return;
    }
    const flow = waitForDiscovery
      ? await this._findFlow("music_assistant")
      : (await fetchConfigFlowInProgress(this._connection.connection)).find(
          (item) => item.handler === "music_assistant"
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
      startFlowHandler: "music_assistant",
      dialogClosedCallback: () => {
        this._load();
      },
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

  private async _setupSerialIntegration(
    ev: HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    ev.stopPropagation();
    const domain = ev.currentTarget.dataset.domain;
    if (!domain) {
      return;
    }
    let manifest;
    try {
      manifest = this._api
        ? await fetchIntegrationManifest(
            { callWS: this._api.callWS } as HomeAssistant,
            domain
          )
        : undefined;
    } catch (_err) {
      manifest = undefined;
    }
    if (!manifest?.config_flow) {
      await showAlertDialog(this, {
        text: this._i18n!.localize(
          "ui.panel.config.devices.esphome.setup_error_serial_integration"
        ),
      });
      return;
    }
    showConfigFlowDialog(this, {
      startFlowHandler: domain,
      manifest,
      dialogClosedCallback: () => {
        this._load();
      },
    });
  }

  private async _findFlow(
    handler: string
  ): Promise<DataEntryFlowProgress | undefined> {
    if (!this._connection) {
      return undefined;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      // Sequential polls: discovery is not available until the add-on starts.
      // eslint-disable-next-line no-await-in-loop
      const flows = await fetchConfigFlowInProgress(
        this._connection.connection
      );
      const flow = flows.find((item) => item.handler === handler);
      if (flow) {
        return flow;
      }
      if (attempt < 7) {
        // eslint-disable-next-line no-await-in-loop
        await waitForMs(1000);
      }
    }
    return undefined;
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
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: var(--ha-border-radius-circle);
          background: var(--success-color);
          color: var(--ha-color-on-success-loud);
        }
        .status-badge.active {
          background: var(--warning-color);
          color: var(
            --ha-color-on-warning-loud,
            var(--ha-color-on-success-loud)
          );
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
        .chip.recommended {
          background: color-mix(
            in srgb,
            var(--capability-accent, var(--success-color)) 16%,
            transparent
          );
          color: var(--capability-accent, var(--success-color));
        }
        .ma-upsell {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          padding: var(--ha-space-4);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-lg);
          background: var(--card-background-color);
        }
        .ma-upsell-head {
          display: flex;
          align-items: flex-start;
          gap: var(--ha-space-3);
        }
        .ma-upsell-title {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          flex: 1;
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
        h3 {
          margin: var(--ha-space-4) 0 var(--ha-space-2);
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }
        .ports {
          margin: 0 0 var(--ha-space-4);
          padding-inline-start: var(--ha-space-5);
        }
        .port-type {
          color: var(--secondary-text-color);
          margin-inline-start: var(--ha-space-2);
        }
        ha-list-item-button ha-domain-icon {
          width: 24px;
          height: 24px;
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
