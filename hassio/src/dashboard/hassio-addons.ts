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
import { HassioAddonInfo } from "../../../src/data/hassio/addon";
import { navigate } from "../../../src/common/navigate";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import "../components/hassio-card-content";

@customElement("hassio-addons")
class HassioAddons extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addons?: HassioAddonInfo[];

  protected render(): TemplateResult {
    return html`
      <div class="content">
        <h1>Add-ons</h1>
        <div class="card-group">
          ${!this.addons
            ? html`
                <paper-card>
                  <div class="card-content">
                    You don't have any add-ons installed yet. Head over to
                    <a href="#" @click=${this._openStore}>the add-on store</a>
                    to get started!
                  </div>
                </paper-card>
              `
            : this.addons
                .sort((a, b) => (a.name > b.name ? 1 : -1))
                .map(
                  (addon) => html`
                    <paper-card .addon=${addon} @click=${this._addonTapped}>
                      <div class="card-content">
                        <hassio-card-content
                          .hass=${this.hass}
                          title=${addon.name}
                          description=${addon.description}
                          ?available=${addon.available}
                          ?UpdateAvailable=${addon.installed !== addon.version}
                          icon=${this._computeIcon(addon)}
                          .iconTitle=${this._computeIconTitle(addon)}
                          .iconClass=${this._computeIconClass(addon)}
                          .iconImage=${this._computeIconImageURL(addon)}
                        ></hassio-card-content>
                      </div>
                    </paper-card>
                  `
                )}
        </div>
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

  private _computeIcon(addon: HassioAddonInfo): string {
    return addon.installed !== addon.version
      ? "hassio:arrow-up-bold-circle"
      : "hassio:puzzle";
  }

  private _computeIconTitle(addon: HassioAddonInfo): string {
    if (addon.state !== "started") {
      return "Add-on is stopped";
    }
    if (addon.installed !== addon.version) {
      return "New version available";
    }
    return "Add-on is running";
  }

  private _computeIconClass(addon: HassioAddonInfo): string {
    if (addon.installed) {
      return addon.state === "started" ? "running" : "stopped";
    }
    if (addon.installed !== addon.version) {
      return "update";
    }
    return "";
  }

  private _addonTapped(ev: any): void {
    navigate(this, `/hassio/addon/${ev.currentTarget.addon.slug}`);
  }

  private _openStore(): void {
    navigate(this, "/hassio/store");
  }

  private get _computeHA105plus(): boolean {
    const [major, minor] = this.hass.config.version.split(".", 2);
    return Number(major) > 0 || (major === "0" && Number(minor) >= 105);
  }

  private _computeIconImageURL(addon: HassioAddonInfo): string | undefined {
    if (this._computeHA105plus && addon.icon) {
      return `/api/hassio/addons/${addon.slug}/icon`;
    }
    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addons": HassioAddons;
  }
}
