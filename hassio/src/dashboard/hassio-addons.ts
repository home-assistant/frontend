import "@polymer/paper-card/paper-card";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { HomeAssistant } from "../../../src/types";
import { HassioAddonInfo } from "../../../src/data/hassio";
import { navigate } from "../../../src/common/navigate";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import "../components/hassio-card-content";

@customElement("hassio-addons")
class HassioAddons extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addons!: HassioAddonInfo[];

  protected render(): TemplateResult | void {
    return html`
      <div class="content card-group">
        <div class="title">Add-ons</div>
        ${!this.addons.length
          ? html`
              <paper-card>
                <div class="card-content">
                  You don't have any add-ons installed yet. Head over to
                  <a href="#" @click=${this.openStore}>the add-on store</a> to
                  get started!
                </div>
              </paper-card>
            `
          : ""}
        ${this.addons
          .sort((a, b) => (a.name > b.name ? 1 : -1))
          .map(
            (addon) => html`
              <paper-card .addon=${addon} @click=${this.addonTapped}>
                <div class="card-content">
                  <hassio-card-content
                    .hass=${this.hass}
                    .title=${addon.name}
                    .description=${addon.description}
                    .available=${addon.available}
                    .icon=${this.computeIcon(addon)}
                    .iconTitle=${this.computeIconTitle(addon)}
                    .iconClass=${this.computeIconClass(addon)}
                  ></hassio-card-content>
                </div>
              </paper-card>
            `
          )}
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        paper-card {
          cursor: pointer;
        }
      `,
    ];
  }

  computeIcon(addon: HassioAddonInfo) {
    return addon.installed !== addon.version
      ? "hassio:arrow-up-bold-circle"
      : "hassio:puzzle";
  }

  computeIconTitle(addon: HassioAddonInfo) {
    if (addon.installed !== addon.version) return "New version available";
    return addon.state === "started"
      ? "Add-on is running"
      : "Add-on is stopped";
  }

  computeIconClass(addon: HassioAddonInfo) {
    if (addon.installed !== addon.version) return "update";
    return addon.state === "started" ? "running" : "";
  }

  addonTapped(ev) {
    navigate(this, `/hassio/addon/${ev.currentTarget.addon.slug}`);
  }

  openStore() {
    navigate(this, "/hassio/store");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addons": HassioAddons;
  }
}
