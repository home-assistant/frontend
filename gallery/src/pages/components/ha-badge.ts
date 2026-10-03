import { mdiButtonCursor, mdiHome } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-badge";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import { mdiHomeAssistant } from "../../../../src/resources/home-assistant-logo-svg";
import { THEME_COMPARISON_PANELS } from "../../components/demo-theme-comparison";

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
      <demo-theme-comparison>
        ${THEME_COMPARISON_PANELS.map(
          ({ slot }) => html`
            <ha-card slot=${slot}>
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
          `
        )}
      </demo-theme-comparison>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-card {
      margin: 0;
      width: 100%;
    }
    .card-content {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-badge": DemoHaBadge;
  }
}
