import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-card";
import "../../../../../../components/ha-spinner";
import type { ZHADevice, ZHAGroup } from "../../../../../../data/zha";
import { fetchBindableDevices, fetchGroups } from "../../../../../../data/zha";
import { haStyle } from "../../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../../types";
import "../zha-device-binding";
import { sortZHADevices, sortZHAGroups } from "../functions";
import "../zha-group-binding";

@customElement("zha-device-bindings-pane")
export class ZHADeviceBindingsPane extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @state() private _bindableDevices: ZHADevice[] = [];

  @state() private _groups: ZHAGroup[] = [];

  @state() private _loaded = false;

  @state() private _error?: string;

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    const oldDevice = changedProperties.get("device");
    const deviceChanged =
      changedProperties.has("device") && this.device?.ieee !== oldDevice?.ieee;

    if (deviceChanged) {
      this._bindableDevices = [];
      this._groups = [];
      this._loaded = false;
      this._error = undefined;
      this._fetchBindings();
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.device) {
      return nothing;
    }

    if (!this._loaded) {
      return html`
        <ha-card class="loading-card">
          <ha-spinner size="large"></ha-spinner>
        </ha-card>
      `;
    }

    if (this._error) {
      return html`<ha-card class="empty-card">${this._error}</ha-card>`;
    }

    if (!this._bindableDevices.length && !this._groups.length) {
      return html`
        <ha-card class="empty-card">
          ${this.hass.localize("ui.panel.config.zha.device_page.no_bindings")}
        </ha-card>
      `;
    }

    return html`
      ${this._bindableDevices.length
        ? html`
            <ha-card class="binding-card">
              <div class="binding-section-header">
                <div class="binding-section-title">
                  ${this.hass.localize(
                    "ui.panel.config.zha.device_binding.header"
                  )}
                </div>
                <div class="binding-section-description">
                  ${this.hass.localize(
                    "ui.panel.config.zha.device_binding.introduction"
                  )}
                </div>
              </div>
              <zha-device-binding-control
                .hass=${this.hass}
                .device=${this.device}
                .bindableDevices=${this._bindableDevices}
              ></zha-device-binding-control>
            </ha-card>
          `
        : nothing}
      ${this._groups.length
        ? html`
            <ha-card class="binding-card">
              <div class="binding-section-header">
                <div class="binding-section-title">
                  ${this.hass.localize(
                    "ui.panel.config.zha.group_binding.header"
                  )}
                </div>
                <div class="binding-section-description">
                  ${this.hass.localize(
                    "ui.panel.config.zha.group_binding.introduction"
                  )}
                </div>
              </div>
              <zha-group-binding-control
                .hass=${this.hass}
                .device=${this.device}
                .groups=${this._groups}
              ></zha-group-binding-control>
            </ha-card>
          `
        : nothing}
    `;
  }

  private async _fetchBindings(): Promise<void> {
    if (!this.device || !this.hass) {
      return;
    }

    const ieee = this.device.ieee;

    try {
      const [bindableDevices, groups] = await Promise.all([
        this.device.device_type !== "Coordinator"
          ? fetchBindableDevices(this.hass, ieee)
          : Promise.resolve([]),
        fetchGroups(this.hass),
      ]);

      if (this.device?.ieee !== ieee) {
        return;
      }

      this._bindableDevices = bindableDevices.sort(sortZHADevices);
      this._groups = groups.sort(sortZHAGroups);
    } catch (_err: any) {
      if (this.device?.ieee === ieee) {
        this._error = this.hass.localize(
          "ui.panel.config.zha.device_page.bindings_error"
        );
      }
    } finally {
      if (this.device?.ieee === ieee) {
        this._loaded = true;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }

        .binding-card {
          overflow: hidden;
        }

        .binding-section-header {
          padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
        }

        .binding-section-title {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
        }

        .binding-section-description {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m);
          margin-top: var(--ha-space-1);
        }

        .loading-card,
        .empty-card {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-8);
        }

        .empty-card {
          color: var(--secondary-text-color);
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-bindings-pane": ZHADeviceBindingsPane;
  }
}
