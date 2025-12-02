import { mdiButtonCursor, mdiHome } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import "../../../../src/components/ha-badge";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import { mdiHomeAssistant } from "../../../../src/resources/home-assistant-logo-svg";

const badges: {
  type?: "badge" | "button";
  label?: string;
  iconOnly?: boolean;
  slot?: TemplateResult;
  iconSlot?: TemplateResult;
}[] = [
  {
    slot: html`<span>Badge</span>`,
  },
  {
    type: "badge",
    label: "Badge",
    iconSlot: html`<ha-svg-icon slot="icon" .path=${mdiHome}></ha-svg-icon>`,
    slot: html`<span>Badge</span>`,
  },
  {
    type: "button",
    label: "Button",
    iconSlot: html`<ha-svg-icon
      slot="icon"
      .path=${mdiButtonCursor}
    ></ha-svg-icon>`,
    slot: html`<span>Button</span>`,
  },
  {
    type: "button",
    label: "Label only",
    iconSlot: html`<ha-svg-icon
      slot="icon"
      .path=${mdiButtonCursor}
    ></ha-svg-icon>`,
  },
  {
    type: "button",
    label: "Label",
    slot: html`<span>Button no label</span>`,
  },
  {
    label: "Icon only",
    iconOnly: true,
    iconSlot: html`<ha-svg-icon
      slot="icon"
      .path=${mdiHomeAssistant}
    ></ha-svg-icon>`,
  },
];

@customElement("demo-components-ha-badge")
export class DemoHaBadge extends LitElement {
  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <ha-card header="ha-badge ${mode} demo">
              <div class="card-content">
                ${badges.map(
                  (badge) => html`
                    <ha-badge
                      .type=${badge.type || undefined}
                      .label=${badge.label}
                      .iconOnly=${badge.iconOnly || false}
                    >
                      ${badge.iconSlot} ${badge.slot}
                    </ha-badge>
                  `
                )}
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
    ha-card {
      margin: 24px auto;
    }
    .card-content {
      display: flex;
      gap: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-badge": DemoHaBadge;
  }
}
