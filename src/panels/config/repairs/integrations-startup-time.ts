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
import "../../../components/ha-list-new";
import "../../../components/ha-list-item-new";

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
      <ha-list-new>
        ${this._setups?.map((setup) => {
          const manifest = this._manifests && this._manifests[setup.domain];
          const docLink = manifest
            ? manifest.is_built_in
              ? documentationUrl(this.hass, `/integrations/${manifest.domain}`)
              : manifest.documentation
            : "";

          const setupSeconds = setup.seconds?.toFixed(2);
          return html`
            <ha-list-item-new href=${docLink} target="_blank">
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
              <span slot="headline">
                ${domainToName(this.hass.localize, setup.domain, manifest)}
              </span>
              <span slot="supporting-text">${setup.domain}</span>
              <div slot="end">
                ${setupSeconds ? html`${setupSeconds} s` : ""}
              </div>
            </ha-list-item-new>
          `;
        })}
      </ha-list-new>
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
      img {
        display: block;
        max-height: 40px;
        max-width: 40px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "integrations-startup-time": IntegrationsStartupTime;
  }
}
