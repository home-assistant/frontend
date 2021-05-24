import "@polymer/paper-tooltip/paper-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state, property } from "lit/decorators";
import {
  Adapter,
  NetworkConfig,
  IPv6ConfiguredAddress,
  IPv4ConfiguredAddress,
} from "../data/network";
import { fireEvent } from "../common/dom/fire_event";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
import "./ha-checkbox";
import type { HaCheckbox } from "./ha-checkbox";
import "./ha-settings-row";
import "./ha-icon";

const format_addresses = (
  addresses: IPv6ConfiguredAddress[] | IPv4ConfiguredAddress[]
): TemplateResult[] =>
  addresses.map(
    (address) => html`<span>${address.address}/${address.network_prefix}</span>`
  );

const format_auto_detected_interfaces = (
  adapters: Adapter[]
): TemplateResult[] =>
  adapters.map((adapter) =>
    adapter.auto
      ? html`${adapter.name} (${format_addresses(adapter.ipv4)}
        ${format_addresses(adapter.ipv6)} )`
      : html``
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

  protected render(): TemplateResult {
    if (this.networkConfig === undefined) {
      return html``;
    }
    const configured_adapters = this.networkConfig.configured_adapters || [];
    return html`
      <ha-settings-row>
        <span slot="prefix">
          <ha-checkbox
            id="auto_configure"
            @change=${this._handleAutoConfigureCheckboxClick}
            .checked=${!configured_adapters.length}
            name="auto_configure"
          >
          </ha-checkbox>
        </span>
        <span slot="heading" data-for="auto_configure"> Auto Configure </span>
        <span slot="description" data-for="auto_configure">
          Detected:
          ${format_auto_detected_interfaces(this.networkConfig.adapters)}
        </span>
      </ha-settings-row>
      ${configured_adapters.length || this._expanded
        ? this.networkConfig.adapters.map(
            (adapter) =>
              html`<ha-settings-row>
                <span slot="prefix">
                  <ha-checkbox
                    id=${adapter.name}
                    @change=${this._handleAdapterCheckboxClick}
                    .checked=${configured_adapters.includes(adapter.name)}
                    .adapter=${adapter.name}
                    name=${adapter.name}
                  >
                  </ha-checkbox>
                </span>
                <span slot="heading">
                  Adapter: ${adapter.name}
                  ${adapter.default
                    ? html`<ha-icon .icon="hass:star"></ha-icon> (Default)`
                    : ""}
                </span>
                <span slot="description">
                  ${format_addresses(adapter.ipv4)}
                  ${format_addresses(adapter.ipv6)}
                </span>
              </ha-settings-row>`
          )
        : ""}
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
    const adapter_name = (checkbox as any).name;
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

        ha-settings-row {
          padding: 0;
        }

        span[slot="heading"],
        span[slot="description"] {
          cursor: pointer;
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
