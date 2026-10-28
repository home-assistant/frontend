import "../../../layouts/hass-error-screen";
import {
  mdiContentSave,
  mdiDownload,
  mdiFire,
  mdiLightningBolt,
  mdiViewDashboardEdit,
  mdiWater,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import type {
  EnergyPreferencesValidation,
  EnergyInfo,
  EnergyPreferences,
} from "../../../data/energy";
import {
  getEnergyPreferenceValidation,
  getEnergyInfo,
  getEnergyPreferences,
  getReferencedStatisticIds,
} from "../../../data/energy";
import type { StatisticsMetaData } from "../../../data/recorder";
import { getStatisticMetadata } from "../../../data/recorder";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-svg-icon";
import "./components/ha-energy-device-settings";
import "./components/ha-energy-device-settings-water";
import "./components/ha-energy-grid-settings";
import "./components/ha-energy-solar-settings";
import "./components/ha-energy-home-settings";
import "./components/ha-energy-battery-settings";
import "./components/ha-energy-gas-settings";
import "./components/ha-energy-water-settings";
import { fileDownload } from "../../../util/file_download";
import { showToast } from "../../../util/toast";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { showEnergyCustomiseDialog } from "./dialogs/show-dialog-energy-customise";
import type { EnergyEditorStatus } from "./editors/energy-editor";
import "./ha-energy-sidebar";
import type { EnergySidebarConfig, HaEnergySidebar } from "./ha-energy-sidebar";

const INITIAL_CONFIG: EnergyPreferences = {
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
};

const SIDEBAR_WIDTH = 500;
const CONTENT_MIN_WIDTH = 350;

const TABS: PageNavigation[] = [
  {
    path: "/config/energy/electricity",
    translationKey: "ui.panel.config.energy.tabs.electricity",
    iconPath: mdiLightningBolt,
    iconColor: "#F1C447",
  },
  {
    path: "/config/energy/gas",
    translationKey: "ui.panel.config.energy.tabs.gas",
    iconPath: mdiFire,
    iconColor: "#F1C447",
  },
  {
    path: "/config/energy/water",
    translationKey: "ui.panel.config.energy.tabs.water",
    iconPath: mdiWater,
    iconColor: "#F1C447",
  },
];

@customElement("ha-config-energy")
class HaConfigEnergy extends PreventUnsavedMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _info?: EnergyInfo;

  @state() private _preferences?: EnergyPreferences;

  @state() private _validationResult?: EnergyPreferencesValidation;

  @state() private _error?: string;

  @state() private _statsMetadata?: Record<string, StatisticsMetaData>;

  @state() private _sidebar?: EnergySidebarConfig;

  @state() private _editorStatus?: EnergyEditorStatus;

  @state() private _bottomSheetHeight?: number;

  @query("ha-energy-sidebar") private _sidebarElement?: HaEnergySidebar;

  public isDirtyState = false;

  private get _currTab(): string {
    return this.route.path.substring(1) || "electricity";
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("route")) {
      const tab = this.route.path.substring(1);
      if (!tab || !TABS.some((t) => t.path.endsWith(`/${tab}`))) {
        navigate(`${this.route.prefix}/electricity`, { replace: true });
      }
      const previousTab = changedProperties.get("route")?.path;
      if (this._sidebar && previousTab !== this.route.path) {
        this._closeSidebar();
      }
    }
  }

  protected firstUpdated() {
    this._fetchConfig();
  }

  protected render(): TemplateResult {
    if (!this._preferences && !this._error) {
      return html`<hass-loading-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></hass-loading-screen>`;
    }

    if (this._error) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .narrow=${this.narrow}
        .error=${this._error}
      ></hass-error-screen>`;
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        back-path="/config/lovelace/dashboards"
        .route=${this.route}
        .tabs=${TABS}
      >
        <div slot="toolbar-icon" class="toolbar-icons">
          <ha-icon-button
            .path=${mdiViewDashboardEdit}
            .label=${this.hass.localize(
              "ui.panel.config.energy.customise.toolbar_action"
            )}
            @click=${this._customise}
          ></ha-icon-button>
          <ha-icon-button
            .path=${mdiDownload}
            .label=${this.hass.localize(
              "ui.panel.config.devices.download_diagnostics"
            )}
            @click=${this._downloadDiagnostics}
          ></ha-icon-button>
        </div>
        <div
          class=${classMap({
            editor: true,
            "has-sidebar": !!this._sidebar && !this.narrow,
          })}
          @energy-open-sidebar=${this._openSidebar}
          @energy-sidebar-saved=${this._sidebarSaved}
          @energy-close-sidebar=${this._closeSidebar}
        >
          <div
            class=${classMap({
              "content-wrapper": true,
              "has-bottom-sheet": !!this._sidebar && this.narrow,
            })}
            style=${styleMap({
              "--energy-bottom-sheet-settled-height":
                this._bottomSheetHeight === undefined
                  ? undefined
                  : `${this._bottomSheetHeight}px`,
            })}
          >
            <div class="sections">
              <ha-alert>
                ${this.hass.localize("ui.panel.config.energy.new_device_info")}
              </ha-alert>
              ${cache(this._renderTabContent())}
            </div>
            <div class="fab-positioner">
              <ha-button
                size="l"
                class=${this._editorStatus?.dirty ? "dirty" : ""}
                .disabled=${
                  !this._editorStatus?.dirty ||
                  !this._editorStatus.valid ||
                  this._editorStatus.saving
                }
                .loading=${!!this._editorStatus?.saving}
                @click=${this._save}
              >
                <ha-svg-icon slot="start" .path=${mdiContentSave}></ha-svg-icon>
                ${this.hass.localize("ui.common.save")}
              </ha-button>
            </div>
          </div>
          <div class="sidebar-positioner">
            ${
              this._sidebar
                ? html`<ha-energy-sidebar
                    tabindex="-1"
                    .hass=${this.hass}
                    .config=${this._sidebar}
                    .isWide=${this.isWide}
                    .narrow=${this.narrow}
                    .dirty=${!!this._editorStatus?.dirty}
                    @energy-editor-status-changed=${this._statusChanged}
                    @close-sidebar=${this._requestCloseSidebar}
                    @bottom-sheet-closed=${this._closeSidebar}
                    @bottom-sheet-resized=${this._bottomSheetResized}
                  ></ha-energy-sidebar>`
                : nothing
            }
          </div>
        </div>
      </hass-tabs-subpage>
    `;
  }

  private _renderTabContent(): TemplateResult | typeof nothing {
    const selectedKey = this._sidebar?.key;
    switch (this._currTab) {
      case "electricity":
        return html`
          <ha-energy-grid-settings
            sidebar
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .selectedKey=${selectedKey}
            @value-changed=${this._prefsChanged}
          ></ha-energy-grid-settings>
          <ha-energy-solar-settings
            sidebar
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .info=${this._info}
            .selectedKey=${selectedKey}
            @value-changed=${this._prefsChanged}
          ></ha-energy-solar-settings>
          <ha-energy-home-settings
            sidebar
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .validationResult=${this._validationResult}
            .selectedKey=${selectedKey}
            @value-changed=${this._prefsChanged}
          ></ha-energy-home-settings>
          <ha-energy-battery-settings
            sidebar
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .selectedKey=${selectedKey}
            @value-changed=${this._prefsChanged}
          ></ha-energy-battery-settings>
          <ha-energy-device-settings
            sidebar
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .selectedKey=${selectedKey}
            @value-changed=${this._prefsChanged}
          ></ha-energy-device-settings>
        `;
      case "gas":
        return html`
          <ha-energy-gas-settings
            sidebar
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .selectedKey=${selectedKey}
            @value-changed=${this._prefsChanged}
          ></ha-energy-gas-settings>
        `;
      case "water":
        return html`
          <ha-energy-water-settings
            sidebar
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .selectedKey=${selectedKey}
            @value-changed=${this._prefsChanged}
          ></ha-energy-water-settings>
          <ha-energy-device-settings-water
            sidebar
            .hass=${this.hass}
            .preferences=${this._preferences!}
            .statsMetadata=${this._statsMetadata}
            .validationResult=${this._validationResult}
            .selectedKey=${selectedKey}
            @value-changed=${this._prefsChanged}
          ></ha-energy-device-settings-water>
        `;
      default:
        return nothing;
    }
  }

  private async _openSidebar(
    ev: HASSDomEvent<HASSDomEvents["energy-open-sidebar"]>
  ) {
    const config = ev.detail;
    if (config.key !== undefined && config.key === this._sidebar?.key) {
      await this._requestCloseSidebar();
      return;
    }
    // The saved item opens once the save is done
    if (this._editorStatus?.saving || !(await this._confirmDiscard())) {
      return;
    }
    this._showSidebar(config);
    await this._sidebarElement?.updateComplete;
    this._sidebarElement?.focus();
  }

  private _sidebarSaved(
    ev: HASSDomEvent<HASSDomEvents["energy-sidebar-saved"]>
  ) {
    if (this._sidebar) {
      this._showSidebar(ev.detail);
    }
  }

  private _showSidebar(config: EnergySidebarConfig) {
    this._sidebar = config;
    this._editorStatus = undefined;
    this.isDirtyState = false;
  }

  private async _requestCloseSidebar() {
    if (this._editorStatus?.saving || !(await this._confirmDiscard())) {
      return;
    }
    await this._sidebarElement?.closeSheet();
    this._closeSidebar();
  }

  private _closeSidebar() {
    this._sidebar = undefined;
    this._editorStatus = undefined;
    this._bottomSheetHeight = undefined;
    this.isDirtyState = false;
  }

  private _statusChanged(
    ev: HASSDomEvent<HASSDomEvents["energy-editor-status-changed"]>
  ) {
    this._editorStatus = ev.detail;
    this.isDirtyState = ev.detail.dirty;
  }

  private _bottomSheetResized(
    ev: HASSDomEvent<HASSDomEvents["bottom-sheet-resized"]>
  ) {
    this._bottomSheetHeight = ev.detail.height;
  }

  private _save() {
    this._sidebarElement?.save();
  }

  private async _confirmDiscard(addHistory = true): Promise<boolean> {
    if (!this._editorStatus?.dirty) {
      return true;
    }
    return showConfirmationDialog(this, {
      addHistory,
      title: this.hass.localize("ui.panel.config.energy.unsaved_confirm_title"),
      text: this.hass.localize("ui.panel.config.energy.unsaved_confirm_text"),
      confirmText: this.hass.localize("ui.common.leave"),
      dismissText: this.hass.localize("ui.common.stay"),
      destructive: true,
    });
  }

  protected async promptDiscardChanges(): Promise<boolean> {
    return this._confirmDiscard(false);
  }

  private async _fetchConfig() {
    this._error = undefined;

    const validationPromise = getEnergyPreferenceValidation(this.hass);
    const energyInfoPromise = await getEnergyInfo(this.hass.callWS);
    try {
      this._preferences = await getEnergyPreferences(this.hass.callWS);
    } catch (err: any) {
      if (err.code === "not_found") {
        this._preferences = INITIAL_CONFIG;
      } else {
        this._error = err.message;
      }
    }
    try {
      this._validationResult = await validationPromise;
    } catch (err: any) {
      this._error = err.message;
    }
    this._info = await energyInfoPromise;
    await this._fetchMetaData();
  }

  private async _prefsChanged(ev: CustomEvent) {
    this._preferences = ev.detail.value;
    this._validationResult = undefined;
    try {
      this._validationResult = await getEnergyPreferenceValidation(this.hass);
    } catch (err: any) {
      this._error = err.message;
    }
    this._info = await getEnergyInfo(this.hass.callWS);
    await this._fetchMetaData();
  }

  private async _fetchMetaData() {
    if (!this._preferences || !this._info) {
      return;
    }
    const statIDs = getReferencedStatisticIds(this._preferences, this._info);
    const statsMetadataArray = await getStatisticMetadata(
      this.hass.callWS,
      statIDs
    );
    const statsMetadata: Record<string, StatisticsMetaData> = {};
    statsMetadataArray.forEach((x) => {
      statsMetadata[x.statistic_id] = x;
    });
    this._statsMetadata = statsMetadata;
  }

  private _customise() {
    if (!this._preferences) {
      return;
    }
    showEnergyCustomiseDialog(this, {
      preferences: this._preferences,
      saveCallback: () => {
        showToast(this, {
          message: this.hass.localize("ui.panel.config.energy.customise.saved"),
        });
      },
    });
  }

  private async _downloadDiagnostics() {
    const data = {
      version: this.hass.config.version,
      info: this._info,
      preferences: this._preferences,
      metadata: this._statsMetadata,
      entities: Object.fromEntries(
        Object.keys(this._statsMetadata || {}).map((key) => [
          key,
          this.hass.entities[key],
        ])
      ),
      states: Object.fromEntries(
        Object.keys(this._statsMetadata || {}).map((key) => [
          key,
          this.hass.states[key],
        ])
      ),
      issues: this._validationResult,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    fileDownload(url, "energy_diagnostics.json");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .toolbar-icons {
          display: flex;
          align-items: center;
        }
        .editor {
          --sidebar-width: 0px;
          --sidebar-gap: 0px;
          max-width: 1540px;
          margin: 0 auto;
          padding: 0 var(--ha-space-3);
        }

        .editor.has-sidebar {
          --sidebar-width: min(
            ${SIDEBAR_WIDTH}px,
            100vw - ${CONTENT_MIN_WIDTH}px - var(--ha-sidebar-width, 0px)
          );
          --sidebar-gap: var(--ha-space-4);
        }

        .content-wrapper {
          padding-inline-end: calc(var(--sidebar-width) + var(--sidebar-gap));
        }

        .sections {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          padding-top: var(--ha-space-3);
          padding-bottom: max(var(--safe-area-inset-bottom, 0px), 32px);
          transition: padding-bottom 180ms ease-in-out;
        }

        .sections > * {
          display: block;
        }

        .has-bottom-sheet {
          --energy-bottom-sheet-height: 50vh;
          /* The backdrop covers the page when the sheet is at full height */
          --energy-bottom-sheet-covered-height: min(
            var(--energy-bottom-sheet-settled-height, 100vh),
            var(--energy-bottom-sheet-height)
          );
        }
        /* A custom property can't fall back from dvh to vh by being declared twice */
        @supports (height: 1dvh) {
          .has-bottom-sheet {
            --energy-bottom-sheet-height: 50dvh;
          }
        }
        .has-bottom-sheet .sections {
          padding-bottom: calc(
            var(--energy-bottom-sheet-covered-height) + var(--ha-space-4)
          );
        }

        .fab-positioner {
          display: flex;
          justify-content: flex-end;
        }
        .fab-positioner ha-button {
          position: fixed;
          bottom: calc(-80px - var(--safe-area-inset-bottom, 0px));
          transition: bottom 0.3s;
          z-index: 1;
          --ha-button-box-shadow: var(--ha-box-shadow-l);
        }
        .fab-positioner ha-button.dirty {
          bottom: calc(16px + var(--safe-area-inset-bottom, 0px));
        }
        .has-bottom-sheet .fab-positioner ha-button.dirty {
          bottom: calc(
            var(--energy-bottom-sheet-covered-height) + var(--ha-space-4)
          );
        }

        .sidebar-positioner {
          display: flex;
          justify-content: flex-end;
        }

        ha-energy-sidebar {
          position: fixed;
          top: calc(var(--header-height) + 16px);
          height: calc(-81px + 100vh - var(--safe-area-inset-top, 0px));
          height: calc(-81px + 100dvh - var(--safe-area-inset-top, 0px));
          width: var(--sidebar-width);
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-energy": HaConfigEnergy;
  }
}
