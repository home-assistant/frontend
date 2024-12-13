import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators";
import type { DataEntryFlowStepExternal } from "../data/data_entry_flow";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import { HaForm } from "../components/ha-form/ha-form";

@customElement("ha-auth-external")
export class HaAuthExternal extends HaForm {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false }) public stepTitle?: string;

  @property({ attribute: false }) public step!: DataEntryFlowStepExternal;

  protected render(): TemplateResult {
    return html`
      <h2>${this.stepTitle}</h2>
      <div class="content">
        ${this.localize("ui.panel.page-authorize.external.description")}
        <div class="open-button">
          <a href=${this.step.url} target="_blank" rel="opener">
            <mwc-button raised>
              ${this.localize("ui.panel.page-authorize.external.open_site")}
            </mwc-button>
          </a>
        </div>
      </div>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    const source = window.open(this.step.url);
    window.addEventListener("message", async (message: MessageEvent) => {
      if (
        message.origin === window.location.origin &&
        message.source === source &&
        message.data.type === "externalCallback"
      ) {
        fireEvent(this, "step-finished");
      }
    });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .open-button {
          text-align: center;
          padding: 24px 0;
        }
        .open-button a {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-external": HaAuthExternal;
  }
  interface HASSDomEvents {
    "step-finished": undefined;
  }
}
