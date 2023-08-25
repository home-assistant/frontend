import { mdiDoorOpen, mdiLock, mdiLockOff } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { domainIcon } from "../../../common/entity/domain_icon";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-outlined-icon-button";
import { UNAVAILABLE } from "../../../data/entity";
import {
  LockEntity,
  LockEntityFeature,
  callProtectedLockService,
} from "../../../data/lock";
import type { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/ha-more-info-state-header";
import "../components/lock/ha-more-info-lock-toggle";

@customElement("more-info-lock")
class MoreInfoLock extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LockEntity;

  private async _open() {
    callProtectedLockService(this, this.hass, this.stateObj!, "open");
  }

  private async _lock() {
    callProtectedLockService(this, this.hass, this.stateObj!, "lock");
  }

  private async _unlock() {
    callProtectedLockService(this, this.hass, this.stateObj!, "unlock");
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const supportsOpen = supportsFeature(this.stateObj, LockEntityFeature.OPEN);

    const color = stateColorCss(this.stateObj);
    const style = {
      "--icon-color": color,
    };

    const isJammed = this.stateObj.state === "jammed";

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls" style=${styleMap(style)}>
        ${
          this.stateObj.state === "jammed"
            ? html`
                <div class="status">
                  <span></span>
                  <div class="icon">
                    <ha-svg-icon
                      .path=${domainIcon("lock", this.stateObj)}
                    ></ha-svg-icon>
                  </div>
                </div>
              `
            : html`
                <ha-more-info-lock-toggle
                  .stateObj=${this.stateObj}
                  .hass=${this.hass}
                >
                </ha-more-info-lock-toggle>
              `
        }
        ${
          supportsOpen || isJammed
            ? html`
                <div class="buttons">
                  ${supportsOpen
                    ? html`
                        <ha-outlined-icon-button
                          .disabled=${this.stateObj.state === UNAVAILABLE}
                          .title=${this.hass.localize(
                            "ui.dialogs.more_info_control.lock.open"
                          )}
                          .ariaLabel=${this.hass.localize(
                            "ui.dialogs.more_info_control.lock.open"
                          )}
                          @click=${this._open}
                        >
                          <ha-svg-icon .path=${mdiDoorOpen}></ha-svg-icon>
                        </ha-outlined-icon-button>
                      `
                    : nothing}
                  ${isJammed
                    ? html`
                        <ha-outlined-icon-button
                          .title=${this.hass.localize(
                            "ui.dialogs.more_info_control.lock.lock"
                          )}
                          .ariaLabel=${this.hass.localize(
                            "ui.dialogs.more_info_control.lock.lock"
                          )}
                          @click=${this._lock}
                        >
                          <ha-svg-icon .path=${mdiLock}></ha-svg-icon>
                        </ha-outlined-icon-button>
                        <ha-outlined-icon-button
                          .title=${this.hass.localize(
                            "ui.dialogs.more_info_control.lock.unlock"
                          )}
                          .ariaLabel=${this.hass.localize(
                            "ui.dialogs.more_info_control.lock.unlock"
                          )}
                          @click=${this._unlock}
                        >
                          <ha-svg-icon .path=${mdiLockOff}></ha-svg-icon>
                        </ha-outlined-icon-button>
                      `
                    : nothing}
                </div>
              `
            : nothing
        }
          </div>
      </div>
      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        extra-filters="code_format"
      ></ha-attributes>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        .status {
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: center;
          height: 45vh;
          max-height: 320px;
          min-height: 200px;
        }
        .status .icon {
          position: relative;
          --mdc-icon-size: 80px;
          animation: pulse 1s infinite;
          color: var(--icon-color);
          border-radius: 50%;
          width: 144px;
          height: 144px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .status .icon::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          border-radius: 50%;
          background-color: var(--icon-color);
          transition: background-color 180ms ease-in-out;
          opacity: 0.2;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-lock": MoreInfoLock;
  }
}
