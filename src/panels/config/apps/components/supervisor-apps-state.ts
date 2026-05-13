import { consume, type ContextType } from "@lit/context";
import { mdiHelpCircle } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-svg-icon";
import { internationalizationContext } from "../../../../data/context";
import type { AddonState } from "../../../../data/hassio/addon";

@customElement("supervisor-apps-state")
class SupervisorAppsState extends LitElement {
  @property() public state: Exclude<AddonState, null> = "unknown";

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected render(): TemplateResult {
    return html`
      ${this.state === "unknown"
        ? html`<ha-svg-icon .path=${mdiHelpCircle}></ha-svg-icon>`
        : html` <div class="dot state-${this.state}"></div> `}
      <span
        >${this._i18n.localize(
          `ui.panel.config.apps.dashboard.capability.state.${this.state}`
        )}</span
      >
    `;
  }

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-2);
      color: var(--ha-color-text-secondary);
      font-size: var(--ha-font-size-m);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--ha-color-on-neutral-normal);
      flex-shrink: 0;
    }
    .dot.state-started {
      background-color: var(--ha-color-green-80);
      animation: state-dot-pulse 1.8s infinite;
    }
    .dot.state-startup {
      background-color: var(--ha-color-on-warning-normal);
    }
    .dot.state-error {
      background-color: var(--ha-color-on-danger-normal);
    }
    ha-svg-icon {
      --mdc-icon-size: 20px;
    }
    @keyframes state-dot-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(var(--rgb-success-color), 0.6);
      }
      100% {
        box-shadow: 0 0 0 6px rgba(var(--rgb-success-color), 0);
      }
    }
    @media (prefers-reduced-motion) {
      .dot.state-started {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-apps-state": SupervisorAppsState;
  }
}
