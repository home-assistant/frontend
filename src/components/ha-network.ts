import { mdiStar } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import {
  IPv4ConfiguredAddress,
  IPv6ConfiguredAddress,
  NetworkConfig,
} from "../data/network";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
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

declare global {
  interface HASSDomEvents {
    "network-config-changed": { configured_adapters: string[] };
  }
}
@customElement("ha-network")
export class HaNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public networkConfig?: NetworkConfig;

  protected render(): TemplateResult {
    if (this.networkConfig === undefined) {
      return html``;
    }
    const configured_adapters = this.networkConfig.configured_adapters || [];
    return html`
      ${this.networkConfig.adapters.map(
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
                ? html`<ha-svg-icon .path=${mdiStar}></ha-svg-icon> (Default)`
                : ""}
            </span>
            <span slot="description">
              ${format_addresses([...adapter.ipv4, ...adapter.ipv6])}
            </span>
          </ha-settings-row>`
      )}
    `;
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
