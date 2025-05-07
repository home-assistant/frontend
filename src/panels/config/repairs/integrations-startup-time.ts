import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-list";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type {
  IntegrationManifest,
  IntegrationSetup,
} from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifests,
  fetchIntegrationSetups,
} from "../../../data/integration";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";

@customElement("integrations-startup-time")
class IntegrationsStartupTime extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _manifests?: Record<string, IntegrationManifest>;

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
      <ha-md-list>
        ${this._setups?.map((setup) => {
          const manifest = this._manifests && this._manifests[setup.domain];
          const docLink = manifest
            ? manifest.is_built_in
              ? documentationUrl(this.hass, `/integrations/${manifest.domain}`)
              : manifest.documentation
            : "";

          const setupSeconds = setup.seconds?.toFixed(2);
          return html`
            <ha-md-list-item .href=${docLink} type="link" target="_blank">
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
                slot="start"
              />
              <span>
                ${domainToName(this.hass.localize, setup.domain, manifest)}
              </span>
              <span slot="supporting-text">${setup.domain}</span>
              <div slot="end">
                ${setupSeconds ? html`${setupSeconds} s` : ""}
              </div>
            </ha-md-list-item>
          `;
        })}
      </ha-md-list>
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

  static styles = css`
    img {
      display: block;
      max-height: 40px;
      max-width: 40px;
      border-radius: 0;
    }
    div[slot="end"] {
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "integrations-startup-time": IntegrationsStartupTime;
  }
}
