import { mdiStar } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type {
  Adapter,
  IPv4ConfiguredAddress,
  IPv6ConfiguredAddress,
  NetworkConfig,
} from "../data/network";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-checkbox";
import type { HaCheckbox } from "./ha-checkbox";
import "./ha-settings-row";
import "./ha-svg-icon";

const format_addresses = (
  addresses: IPv6ConfiguredAddress[] | IPv4ConfiguredAddress[]
): TemplateResult =>
  html`${addresses.map((address, i) => [
    html`<span>${address.address}/${address.network_prefix}</span>`,
    i < addresses.length - 1 ? ", " : nothing,
  ])}`;

const format_auto_detected_interfaces = (
  adapters: Adapter[]
): (TemplateResult | string)[] =>
  adapters.map((adapter) =>
    adapter.auto
      ? html`${adapter.name}
        (${format_addresses([...adapter.ipv4, ...adapter.ipv6])})`
      : ""
  );

declare global {
  interface HASSDomEvents {
    "network-config-changed": { configured_adapters: string[] };
  }
}
@customElement("ha-network")
export class HaNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public networkConfig?: NetworkConfig;

  @state() private _expanded?: boolean;

  protected render() {
    if (this.networkConfig === undefined) {
      return nothing;
    }
    const configured_adapters = this.networkConfig.configured_adapters || [];
    return html`
      <ha-checkbox
        @change=${this._handleAutoConfigureCheckboxClick}
        .checked=${!configured_adapters.length}
        .hint=${!configured_adapters.length
          ? this.hass.localize(
              "ui.panel.config.network.adapter.auto_configure_manual_hint"
            )
          : ""}
      >
        ${this.hass.localize("ui.panel.config.network.adapter.auto_configure")}
        <div class="description">
          ${this.hass.localize("ui.panel.config.network.adapter.detected")}:
          ${format_auto_detected_interfaces(this.networkConfig.adapters)}
        </div>
      </ha-checkbox>
      ${configured_adapters.length || this._expanded
        ? this.networkConfig.adapters.map(
            (adapter) =>
              html`<ha-checkbox
                id=${adapter.name}
                @change=${this._handleAdapterCheckboxClick}
                .checked=${configured_adapters.includes(adapter.name)}
                .adapter=${adapter.name}
              >
                ${this.hass.localize(
                  "ui.panel.config.network.adapter.adapter"
                )}:
                ${adapter.name}
                ${adapter.default
                  ? html`<ha-svg-icon .path=${mdiStar}></ha-svg-icon>
                      (${this.hass.localize("ui.common.default")})`
                  : nothing}
                <div class="description">
                  ${format_addresses([...adapter.ipv4, ...adapter.ipv6])}
                </div>
              </ha-checkbox>`
          )
        : nothing}
    `;
  }

  private _handleAutoConfigureCheckboxClick(ev: Event) {
    const checkbox = ev.currentTarget as HaCheckbox;
    if (this.networkConfig === undefined) {
      return;
    }

    let configured_adapters = [...this.networkConfig.configured_adapters];

    if (checkbox.checked) {
      this._expanded = false;
      configured_adapters = [];
    } else {
      this._expanded = true;
      for (const adapter of this.networkConfig.adapters) {
        if (adapter.default) {
          configured_adapters = [adapter.name];
          break;
        }
      }
    }

    fireEvent(this, "network-config-changed", {
      configured_adapters: configured_adapters,
    });
  }

  private _handleAdapterCheckboxClick(ev: Event) {
    const checkbox = ev.currentTarget as HaCheckbox;
    const adapter_name = checkbox.id;
    if (this.networkConfig === undefined) {
      return;
    }

    const configured_adapters = [...this.networkConfig.configured_adapters];

    if (checkbox.checked) {
      configured_adapters.push(adapter_name);
    } else {
      const index = configured_adapters.indexOf(adapter_name, 0);
      configured_adapters.splice(index, 1);
    }

    fireEvent(this, "network-config-changed", {
      configured_adapters: configured_adapters,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .error {
          color: var(--error-color);
        }

        ha-checkbox:not(:last-child) {
          margin-bottom: var(--ha-space-3);
        }

        ha-svg-icon {
          --mdc-icon-size: 12px;
          margin-bottom: 4px;
        }

        .description {
          font-size: var(--ha-font-size-s);
          margin-top: var(--ha-space-1);
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-network": HaNetwork;
  }
}
