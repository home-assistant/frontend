import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../src/resources/styles";

@customElement("supervisor-connectivity")
class SupervisorConnectivity extends LitElement {
  @property({ attribute: false }) public supervisor!: Supervisor;

  protected render(): TemplateResult {
    if (
      !this.supervisor.network.host_internet &&
      this.supervisor.network.supervisor_internet
    ) {
      return html``;
    }

    return html`<div class="connectivity">
      <span>The supervisor has lost connectivity.</span>
    </div>`;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .connectivity {
          position: fixed;
          bottom: 0;
          height: 32px;
          width: 100vw;
          background-color: var(--error-color);
          color: var(--primary-text-color);
          font-weight: 500;
          display: flex;
          align-items: center;
        }
        span {
          padding-left: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-connectivity": SupervisorConnectivity;
  }
}
