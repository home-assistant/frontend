import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/input/ha-input";
import "../../../../../components/ha-switch";
import type { ZHAConfiguration } from "../../../../../data/zha";
import {
  fetchZHAConfiguration,
  updateZHAConfiguration,
} from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";

const PREDEFINED_TIMEOUTS = [1800, 3600, 7200, 21600, 43200, 86400];

@customElement("zha-options-page")
class ZHAOptionsPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _configuration?: ZHAConfiguration;

  @state() private _customMains = false;

  @state() private _customBattery = false;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchConfiguration();
    }
  }

  private async _fetchConfiguration(): Promise<void> {
    this._configuration = await fetchZHAConfiguration(this.hass!);
    const mainsValue = this._configuration.data.zha_options
      ?.consider_unavailable_mains as number | undefined;
    const batteryValue = this._configuration.data.zha_options
      ?.consider_unavailable_battery as number | undefined;
    this._customMains =
      mainsValue !== undefined && !PREDEFINED_TIMEOUTS.includes(mainsValue);
    this._customBattery =
      batteryValue !== undefined && !PREDEFINED_TIMEOUTS.includes(batteryValue);
  }

  private _getUnavailableTimeoutOptions(defaultSeconds: number) {
    const defaultLabel = ` (${this.hass.localize("ui.panel.config.zha.configuration_page.timeout_default")})`;
    const options: { value: string; seconds: number; key: string }[] = [
      { value: "1800", seconds: 1800, key: "timeout_30_min" },
      { value: "3600", seconds: 3600, key: "timeout_1_hour" },
      { value: "7200", seconds: 7200, key: "timeout_2_hours" },
      { value: "21600", seconds: 21600, key: "timeout_6_hours" },
      { value: "43200", seconds: 43200, key: "timeout_12_hours" },
      { value: "86400", seconds: 86400, key: "timeout_24_hours" },
    ];
    return [
      ...options.map((opt) => ({
        value: opt.value,
        label: this.hass.localize(
          `ui.panel.config.zha.configuration_page.${opt.key}`,
          { default: opt.seconds === defaultSeconds ? defaultLabel : "" }
        ),
      })),
      {
        value: "custom",
        label: this.hass.localize(
          "ui.panel.config.zha.configuration_page.timeout_custom"
        ),
      },
    ];
  }

  private _getUnavailableDropdownValue(
    seconds: unknown,
    isCustom: boolean
  ): string {
    if (isCustom) {
      return "custom";
    }
    const value = (seconds as number) ?? 7200;
    if (PREDEFINED_TIMEOUTS.includes(value)) {
      return String(value);
    }
    return "custom";
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zha.configuration_page.options_title"
        )}
        back-path="/config/zha/dashboard"
      >
        <div class="container">
          <ha-card>
            ${this._configuration
              ? html`
                  <ha-md-list>
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.enable_identify_on_join_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.enable_identify_on_join_description"
                        )}</span
                      >
                      <ha-switch
                        slot="end"
                        .checked=${(this._configuration.data.zha_options
                          ?.enable_identify_on_join as boolean) ?? true}
                        @change=${this._enableIdentifyOnJoinChanged}
                      ></ha-switch>
                    </ha-md-list-item>
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.default_light_transition_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.default_light_transition_description"
                        )}</span
                      >
                      <ha-input
                        slot="end"
                        type="number"
                        .value=${String(
                          (this._configuration.data.zha_options
                            ?.default_light_transition as number) ?? 0
                        )}
                        .min=${0}
                        .step=${0.5}
                        @change=${this._defaultLightTransitionChanged}
                      >
                        <span slot="end">s</span>
                      </ha-input>
                    </ha-md-list-item>
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.enhanced_light_transition_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.enhanced_light_transition_description"
                        )}</span
                      >
                      <ha-switch
                        slot="end"
                        .checked=${(this._configuration.data.zha_options
                          ?.enhanced_light_transition as boolean) ?? false}
                        @change=${this._enhancedLightTransitionChanged}
                      ></ha-switch>
                    </ha-md-list-item>
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.light_transitioning_flag_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.light_transitioning_flag_description"
                        )}</span
                      >
                      <ha-switch
                        slot="end"
                        .checked=${(this._configuration.data.zha_options
                          ?.light_transitioning_flag as boolean) ?? true}
                        @change=${this._lightTransitioningFlagChanged}
                      ></ha-switch>
                    </ha-md-list-item>
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.group_members_assume_state_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.group_members_assume_state_description"
                        )}</span
                      >
                      <ha-switch
                        slot="end"
                        .checked=${(this._configuration.data.zha_options
                          ?.group_members_assume_state as boolean) ?? true}
                        @change=${this._groupMembersAssumeStateChanged}
                      ></ha-switch>
                    </ha-md-list-item>
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.consider_unavailable_mains_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.consider_unavailable_mains_description"
                        )}</span
                      >
                      <ha-select
                        slot="end"
                        .value=${this._getUnavailableDropdownValue(
                          this._configuration.data.zha_options
                            ?.consider_unavailable_mains,
                          this._customMains
                        )}
                        .options=${this._getUnavailableTimeoutOptions(7200)}
                        @selected=${this._mainsUnavailableChanged}
                      ></ha-select>
                    </ha-md-list-item>
                    ${this._customMains
                      ? html`
                          <ha-md-list-item>
                            <ha-input
                              slot="end"
                              type="number"
                              .value=${String(
                                (this._configuration.data.zha_options
                                  ?.consider_unavailable_mains as number) ??
                                  7200
                              )}
                              .min=${1}
                              .step=${1}
                              @change=${this._customMainsSecondsChanged}
                            >
                              <span slot="end">s</span>
                            </ha-input>
                          </ha-md-list-item>
                        `
                      : nothing}
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.consider_unavailable_battery_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.consider_unavailable_battery_description"
                        )}</span
                      >
                      <ha-select
                        slot="end"
                        .value=${this._getUnavailableDropdownValue(
                          this._configuration.data.zha_options
                            ?.consider_unavailable_battery,
                          this._customBattery
                        )}
                        .options=${this._getUnavailableTimeoutOptions(21600)}
                        @selected=${this._batteryUnavailableChanged}
                      ></ha-select>
                    </ha-md-list-item>
                    ${this._customBattery
                      ? html`
                          <ha-md-list-item>
                            <ha-input
                              slot="end"
                              type="number"
                              .value=${String(
                                (this._configuration.data.zha_options
                                  ?.consider_unavailable_battery as number) ??
                                  21600
                              )}
                              .min=${1}
                              .step=${1}
                              @change=${this._customBatterySecondsChanged}
                            >
                              <span slot="end">s</span>
                            </ha-input>
                          </ha-md-list-item>
                        `
                      : nothing}
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.enable_mains_startup_polling_label"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.enable_mains_startup_polling_description"
                        )}</span
                      >
                      <ha-switch
                        slot="end"
                        .checked=${(this._configuration.data.zha_options
                          ?.enable_mains_startup_polling as boolean) ?? true}
                        @change=${this._enableMainsStartupPollingChanged}
                      ></ha-switch>
                    </ha-md-list-item>
                  </ha-md-list>
                  <div class="card-actions">
                    <ha-progress-button
                      appearance="filled"
                      variant="brand"
                      @click=${this._updateConfiguration}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zha.configuration_page.update_button"
                      )}
                    </ha-progress-button>
                  </div>
                `
              : nothing}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _enableIdentifyOnJoinChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.enable_identify_on_join = checked;
    this.requestUpdate();
  }

  private _enhancedLightTransitionChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.enhanced_light_transition = checked;
    this.requestUpdate();
  }

  private _lightTransitioningFlagChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.light_transitioning_flag = checked;
    this.requestUpdate();
  }

  private _groupMembersAssumeStateChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.group_members_assume_state = checked;
    this.requestUpdate();
  }

  private _enableMainsStartupPollingChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.enable_mains_startup_polling =
      checked;
    this.requestUpdate();
  }

  private _defaultLightTransitionChanged(ev: Event): void {
    const value = Number((ev.target as HTMLInputElement).value);
    this._configuration!.data.zha_options.default_light_transition = value;
    this.requestUpdate();
  }

  private _customMainsSecondsChanged(ev: Event): void {
    const seconds = Number((ev.target as HTMLInputElement).value);
    this._configuration!.data.zha_options.consider_unavailable_mains = seconds;
    this.requestUpdate();
  }

  private _customBatterySecondsChanged(ev: Event): void {
    const seconds = Number((ev.target as HTMLInputElement).value);
    this._configuration!.data.zha_options.consider_unavailable_battery =
      seconds;
    this.requestUpdate();
  }

  private _mainsUnavailableChanged(ev: CustomEvent): void {
    const value = ev.detail.value;
    if (value === "custom") {
      this._customMains = true;
    } else {
      this._customMains = false;
      this._configuration!.data.zha_options.consider_unavailable_mains =
        Number(value);
    }
    this.requestUpdate();
  }

  private _batteryUnavailableChanged(ev: CustomEvent): void {
    const value = ev.detail.value;
    if (value === "custom") {
      this._customBattery = true;
    } else {
      this._customBattery = false;
      this._configuration!.data.zha_options.consider_unavailable_battery =
        Number(value);
    }
    this.requestUpdate();
  }

  private async _updateConfiguration(ev: Event): Promise<void> {
    const button = ev.currentTarget as HTMLElement & {
      progress: boolean;
      actionSuccess: () => void;
      actionError: () => void;
    };
    button.progress = true;
    try {
      await updateZHAConfiguration(this.hass!, this._configuration!.data);
      button.actionSuccess();
    } catch (_err: any) {
      button.actionError();
    } finally {
      button.progress = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }

        ha-card {
          max-width: 600px;
          margin: auto;
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        ha-md-list-item {
          --md-item-overflow: visible;
        }

        ha-select,
        ha-input {
          min-width: 210px;
        }

        .card-actions {
          display: flex;
          justify-content: flex-end;
        }

        @media all and (max-width: 450px) {
          ha-select,
          ha-input {
            min-width: 160px;
            width: 160px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-options-page": ZHAOptionsPage;
  }
}
