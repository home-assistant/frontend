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
import { atLeastVersion } from "../../../src/common/config/version";

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
                          .title=${addon.name}
                          .description=${addon.description}
                          available
                          .showTopbar=${addon.installed !== addon.version}
                          topbarClass="update"
                          .icon=${addon.installed !== addon.version
                            ? "hassio:arrow-up-bold-circle"
                            : "hassio:puzzle"}
                          .iconTitle=${addon.state !== "started"
                            ? "Add-on is stopped"
                            : addon.installed !== addon.version
                            ? "New version available"
                            : "Add-on is running"}
                          .iconClass=${addon.installed &&
                          addon.installed !== addon.version
                            ? addon.state === "started"
                              ? "update"
                              : "update stopped"
                            : addon.installed && addon.state === "started"
                            ? "running"
                            : "stopped"}
                          .iconImage=${atLeastVersion(
                            this.hass.connection.haVersion,
                            0,
                            105
                          ) && addon.icon
                            ? `/api/hassio/addons/${addon.slug}/icon`
                            : undefined}
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

  private _addonTapped(ev: any): void {
    navigate(this, `/hassio/addon/${ev.currentTarget.addon.slug}`);
  }

  private _openStore(): void {
    navigate(this, "/hassio/store");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addons": HassioAddons;
  }
}
