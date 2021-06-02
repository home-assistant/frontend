import { mdiArrowUpBoldCircle, mdiPlay, mdiPuzzle, mdiStop } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { atLeastVersion } from "../../../src/common/config/version";
import { navigate } from "../../../src/common/navigate";
import { compare } from "../../../src/common/string/compare";
import "../../../src/components/ha-card";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import "../components/hassio-card-content";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-addons")
class HassioAddons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  protected render(): TemplateResult {
    return html`<ha-card
      .header=${this.supervisor.localize("dashboard.addons")}
    >
      <div class="addons" ?narrow=${this.narrow}>
        ${this.supervisor.supervisor.addons.map(
          (addon) => html`<div
            class="addon"
            @click=${this._addonTapped}
            .addon=${addon}
          >
            <div class="icon">
              <div class="overlay">
                <ha-svg-icon
                  .title=${addon.state}
                  .path=${addon.state === "started" ? mdiPlay : mdiStop}
                >
                </ha-svg-icon>
              </div>
              ${addon.icon && atLeastVersion(this.hass.config.version, 0, 105)
                ? html`<img src="/api/hassio/addons/${addon.slug}/icon" />`
                : html`<ha-svg-icon .path=${mdiPuzzle}></ha-svg-icon>`}
            </div>
            <div class="name">${addon.name}</div>
          </div>`
        )}
      </div>
    </ha-card>`;
    return html`
      <div class="content">
        <h1>${this.supervisor.localize("dashboard.addons")}</h1>
        <div class="card-group">
          ${!this.supervisor.supervisor.addons?.length
            ? html`
                <ha-card>
                  <div class="card-content">
                    <button class="link" @click=${this._openStore}>
                      ${this.supervisor.localize("dashboard.no_addons")}
                    </button>
                  </div>
                </ha-card>
              `
            : this.supervisor.supervisor.addons
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
                          .showTopbar=${addon.update_available}
                          topbarClass="update"
                          .icon=${addon.update_available!
                            ? mdiArrowUpBoldCircle
                            : mdiPuzzle}
                          .iconTitle=${addon.state !== "started"
                            ? this.supervisor.localize(
                                "dashboard.addon_stopped"
                              )
                            : addon.update_available!
                            ? this.supervisor.localize(
                                "dashboard.addon_new_version"
                              )
                            : this.supervisor.localize(
                                "dashboard.addon_running"
                              )}
                          .iconClass=${addon.update_available
                            ? addon.state === "started"
                              ? "update"
                              : "update stopped"
                            : addon.state === "started"
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        .addons {
          display: grid;
          grid-template-columns: repeat(4, auto);
          padding-bottom: 16px;
        }
        .addons[narrow] {
          grid-template-columns: repeat(2, auto);
        }
        .addon {
          text-align: center;
          max-width: 100px;
          padding: 0 8px;
          cursor: pointer;
        }
        .icon > *:not(.overlay) {
          position: relative;
          max-height: 60px;
          max-width: 60px;
          margin: auto;
          --mdc-icon-size: 60px;
          display: flex;
        }
        .icon {
          margin-bottom: 4px;
        }
        .overlay {
          position: absolute;
          z-index: 2;
          --mdc-icon-size: 24px;
          color: var(--secondary-text-color);
          background-color: var(--secondary-background-color);
          opacity: 0.6;
          border-radius: 100%;
          margin-left: 12px;
          border: 1px var(--secondary-text-color) solid;
        }
      `,
    ];
  }

  private _addonTapped(ev: any): void {
    navigate(`/hassio/addon/${ev.currentTarget.addon.slug}/info`);
  }

  private _openStore(): void {
    navigate("/hassio/store");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addons": HassioAddons;
  }
}
