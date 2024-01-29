import "@material/mwc-list/mwc-list";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-clickable-list-item";
import {
  domainToName,
  fetchIntegrationManifests,
  fetchIntegrationSetups,
  IntegrationManifest,
  IntegrationSetup,
} from "../../../data/integration";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";

@customElement("integrations-startup-time")
class IntegrationsStartupTime extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _manifests?: {
    [domain: string]: IntegrationManifest;
  };

  @state() private _setups?: IntegrationSetup[];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchManifests();
    this._fetchSetups();
  }

  protected render() {
    if (!this._setups) {
      return nothing;
    }

    return html`
      <mwc-list>
        ${this._setups?.map((setup) => {
          const manifest = this._manifests && this._manifests[setup.domain];
          const docLink = manifest
            ? manifest.is_built_in
              ? documentationUrl(this.hass, `/integrations/${manifest.domain}`)
              : manifest.documentation
            : "";

          const setupSeconds = setup.seconds?.toFixed(2);
          return html`
            <ha-clickable-list-item
              graphic="avatar"
              twoline
              hasMeta
              openNewTab
              href=${docLink}
            >
              <img
                alt=""
                loading="lazy"
                src=${brandsUrl({
                  domain: setup.domain,
                  type: "icon",
                  useFallback: true,
                  darkOptimized: this.hass.themes?.darkMode,
                })}
                crossorigin="anonymous"
                referrerpolicy="no-referrer"
                slot="graphic"
              />
              <span>
                ${domainToName(this.hass.localize, setup.domain, manifest)}
              </span>
              <span slot="secondary">${setup.domain}</span>
              <div slot="meta">
                ${setupSeconds ? html`${setupSeconds} s` : ""}
              </div>
            </ha-clickable-list-item>
          `;
        })}
      </mwc-list>
    `;
  }

  private async _fetchManifests() {
    const manifests = {};
    for (const manifest of await fetchIntegrationManifests(this.hass)) {
      manifests[manifest.domain] = manifest;
    }
    this._manifests = manifests;
  }

  private async _fetchSetups() {
    const setups = await fetchIntegrationSetups(this.hass);
    this._setups = setups.sort((a, b) => {
      if (a.seconds === b.seconds) {
        return 0;
      }
      if (a.seconds === undefined) {
        return 1;
      }
      if (b.seconds === undefined) {
        return 1;
      }
      return b.seconds - a.seconds;
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-clickable-list-item {
        --mdc-list-item-meta-size: 64px;
        --mdc-typography-caption-font-size: 12px;
      }
      img {
        display: block;
        max-height: 40px;
        max-width: 40px;
      }
      div[slot="meta"] {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "integrations-startup-time": IntegrationsStartupTime;
  }
}
