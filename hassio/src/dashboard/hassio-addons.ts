import { mdiArrowUpBoldCircle, mdiPuzzle } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { atLeastVersion } from "../../../src/common/config/version";
import { navigate } from "../../../src/common/navigate";
import { compare } from "../../../src/common/string/compare";
import "../../../src/components/ha-card";
import { HassioAddonInfo } from "../../../src/data/hassio/addon";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import "../components/hassio-card-content";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-addons")
class HassioAddons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addons?: HassioAddonInfo[];

  protected render(): TemplateResult {
    return html`
      <div class="content">
        <h1>Add-ons</h1>
        <div class="card-group">
          ${!this.addons?.length
            ? html`
                <ha-card>
                  <div class="card-content">
                    You don't have any add-ons installed yet. Head over to
                    <button class="link" @click=${this._openStore}>
                      the add-on store
                    </button>
                    to get started!
                  </div>
                </ha-card>
              `
            : this.addons
                .sort((a, b) => compare(a.name, b.name))
                .map(
                  (addon) => html`
                    <ha-card .addon=${addon} @click=${this._addonTapped}>
                      <div class="card-content">
                        <hassio-card-content
                          .hass=${this.hass}
                          .title=${addon.name}
                          .description=${addon.description}
                          available
                          .showTopbar=${addon.installed !== addon.version}
                          topbarClass="update"
                          .icon=${addon.installed !== addon.version
                            ? mdiArrowUpBoldCircle
                            : mdiPuzzle}
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
                            this.hass.config.version,
                            0,
                            105
                          ) && addon.icon
                            ? `/api/hassio/addons/${addon.slug}/icon`
                            : undefined}
                        ></hassio-card-content>
                      </div>
                    </ha-card>
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
        ha-card {
          cursor: pointer;
        }
      `,
    ];
  }

  private _addonTapped(ev: any): void {
    navigate(this, `/hassio/addon/${ev.currentTarget.addon.slug}/info`);
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
