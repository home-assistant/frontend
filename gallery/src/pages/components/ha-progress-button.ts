import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import { mdiHomeAssistant } from "../../../../src/resources/home-assistant-logo-svg";

@customElement("demo-components-ha-progress-button")
export class DemoHaProgressButton extends LitElement {
  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <ha-card header="ha-progress-button in ${mode}">
              <div class="card-content">
                <ha-progress-button @click=${this._clickedSuccess}>
                  Success
                </ha-progress-button>
                <ha-progress-button @click=${this._clickedFail}>
                  Fail
                </ha-progress-button>
                <ha-progress-button size="small" @click=${this._clickedSuccess}>
                  small
                </ha-progress-button>
                <ha-progress-button
                  appearance="filled"
                  @click=${this._clickedSuccess}
                >
                  filled
                </ha-progress-button>
                <ha-progress-button
                  appearance="plain"
                  @click=${this._clickedSuccess}
                >
                  plain
                </ha-progress-button>
                <ha-progress-button
                  variant="warning"
                  @click=${this._clickedSuccess}
                >
                  warning
                </ha-progress-button>
                <ha-progress-button
                  variant="neutral"
                  @click=${this._clickedSuccess}
                  label="with icon"
                  .iconPath=${mdiHomeAssistant}
                >
                  With Icon
                </ha-progress-button>
                <ha-progress-button progress @click=${this._clickedSuccess}>
                  progress
                </ha-progress-button>
                <ha-progress-button disabled @click=${this._clickedSuccess}>
                  disabled
                </ha-progress-button>
              </div>
            </ha-card>
          </div>
        `
      )}
    `;
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    applyThemesOnElement(
      this.shadowRoot!.querySelector(".dark"),
      {
        default_theme: "default",
        default_dark_theme: "default",
        themes: {},
        darkMode: true,
        theme: "default",
      },
      undefined,
      undefined,
      true
    );
  }

  private async _clickedSuccess(ev: CustomEvent): Promise<void> {
    console.log("Clicked success");
    const button = ev.currentTarget as any;
    button.progress = true;

    setTimeout(() => {
      button.actionSuccess();
      button.progress = false;
    }, 1000);
  }

  private async _clickedFail(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    setTimeout(() => {
      button.actionError();
      button.progress = false;
    }, 1000);
  }

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
    }
    .dark,
    .light {
      display: block;
      background-color: var(--primary-background-color);
      padding: 0 50px;
    }
    .button {
      padding: unset;
    }
    ha-card {
      margin: 24px auto;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .card-content div {
      display: flex;
      gap: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-progress-button": DemoHaProgressButton;
  }
}
