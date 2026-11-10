import type { ContextType } from "@lit/context";
import { mdiCheck } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import {
  fireEvent,
  type HASSDomEvent,
} from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import { internationalizationContext } from "../../../../data/context";
import {
  ESPHOME_CAPABILITY_ACCENTS,
  ESPHOME_CAPABILITY_ICONS,
  ESPHOME_CAPABILITY_TITLE_KEYS,
  getESPHomeSetupBannerState,
  getESPHomeSetupCapabilityIds,
  type ESPHomeCapabilityId,
  type ESPHomeSetupStatus,
} from "../../../../data/esphome_setup";

@customElement("ha-esphome-setup-banner")
export class HaESPHomeSetupBanner extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @property({ attribute: false }) public deviceName!: string;

  @property({ attribute: false }) public status: ESPHomeSetupStatus = {};

  protected render() {
    if (!this._i18n) {
      return nothing;
    }
    const localize = this._i18n.localize;
    const ids = getESPHomeSetupCapabilityIds(this.status);
    const bannerState = getESPHomeSetupBannerState(this.status);
    const title =
      bannerState === "continue"
        ? localize("ui.panel.config.devices.esphome.setup_continue_title", {
            name: this.deviceName,
          })
        : localize("ui.panel.config.devices.esphome.setup_title");
    const intro = localize("ui.panel.config.devices.esphome.setup_intro", {
      count: ids.length,
    });
    return html`
      <ha-card outlined>
        <div class="content">
          <div class="text">
            <h2>${title}</h2>
            <p>${intro}</p>
            <div class="actions">
              <ha-button @click=${this._setup}>
                ${localize("ui.panel.config.devices.esphome.setup_action")}
              </ha-button>
              <ha-button appearance="plain" @click=${this._later}>
                ${localize("ui.panel.config.devices.esphome.setup_later")}
              </ha-button>
            </div>
          </div>
          ${
            ids.length
              ? html`
                  <div class="pips">
                    ${ids.map((id) => this._renderPip(id))}
                  </div>
                `
              : nothing
          }
        </div>
      </ha-card>
    `;
  }

  private _renderPip(id: ESPHomeCapabilityId) {
    const localize = this._i18n!.localize;
    const completed = this.status[id] === "completed";
    return html`
      <div class="pip">
        <span
          class="pip-chip"
          style="--capability-accent: ${ESPHOME_CAPABILITY_ACCENTS[id]}"
        >
          <ha-svg-icon .path=${ESPHOME_CAPABILITY_ICONS[id]}></ha-svg-icon>
          ${
            completed
              ? html`
                  <span
                    class="pip-check"
                    role="img"
                    aria-label=${localize(
                      "ui.panel.config.devices.esphome.setup_status_completed"
                    )}
                  >
                    <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
                  </span>
                `
              : nothing
          }
        </span>
        <span class="pip-label">
          ${localize(ESPHOME_CAPABILITY_TITLE_KEYS[id])}
        </span>
      </div>
    `;
  }

  private _setup() {
    fireEvent(this, "esphome-setup");
  }

  private _later() {
    fireEvent(this, "esphome-setup-later");
  }

  static styles = css`
    ha-card {
      display: block;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-5);
      padding: var(--ha-space-5);
    }
    .text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ha-space-2);
      min-width: 0;
    }
    h2 {
      margin: 0;
      font-size: var(--ha-font-size-2xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
    }
    p {
      margin: 0;
      max-width: 48ch;
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-normal);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ha-space-1);
      margin-block-start: var(--ha-space-2);
    }
    .pips {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--ha-space-3) var(--ha-space-6);
      align-content: center;
    }
    .pip {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      min-width: 0;
    }
    .pip-chip {
      position: relative;
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--ha-border-radius-circle);
      color: var(--capability-accent);
    }
    .pip-chip::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background-color: var(--capability-accent);
      opacity: 0.12;
    }
    .pip-chip ha-svg-icon {
      --mdc-icon-size: 18px;
    }
    .pip-chip > ha-svg-icon {
      position: relative;
    }
    .pip-check {
      position: absolute;
      inset-inline-end: -2px;
      bottom: -2px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: var(--ha-border-radius-circle);
      background: var(--success-color);
      color: var(--ha-color-on-success-loud);
      border: 2px solid var(--card-background-color);
      box-sizing: border-box;
    }
    .pip-check ha-svg-icon {
      --mdc-icon-size: 10px;
    }
    .pip-label {
      min-width: 0;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
    }
    @media (min-width: 768px) {
      .content {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: var(--ha-space-8);
      }
      .text {
        flex: 1.05 1 256px;
      }
      .pips {
        flex: 1 1 192px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-esphome-setup-banner": HaESPHomeSetupBanner;
  }

  interface HASSDomEvents {
    "esphome-setup": undefined;
    "esphome-setup-later": undefined;
  }

  interface HTMLElementEventMap {
    "esphome-setup": HASSDomEvent<HASSDomEvents["esphome-setup"]>;
    "esphome-setup-later": HASSDomEvent<HASSDomEvents["esphome-setup-later"]>;
  }
}
