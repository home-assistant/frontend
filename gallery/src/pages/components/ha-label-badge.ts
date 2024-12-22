import { html, css, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-label-badge";
import "../../../../src/components/ha-card";

const colors = ["#03a9f4", "#ffa600", "#43a047"];

const badges: {
  label?: string;
  description?: string;
  image?: string;
}[] = [
  {
    label: "label",
  },
  {
    label: "label",
    description: "Description",
  },
  {
    description: "Description",
  },
  {
    label: "label",
    description: "Description",
    image: "/images/living_room.png",
  },
  {
    description: "Description",
    image: "/images/living_room.png",
  },
  {
    label: "label",
    image: "/images/living_room.png",
  },
  {
    image: "/images/living_room.png",
  },
  {
    label: "big label",
  },
  {
    label: "big label",
    description: "Description",
  },
  {
    label: "big label",
    description: "Description",
    image: "/images/living_room.png",
  },
];

@customElement("demo-components-ha-label-badge")
export class DemoHaLabelBadge extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="card-content">
          ${badges.map(
            (badge) => html`
              <ha-label-badge
                style="--ha-label-badge-color: ${colors[
                  Math.floor(Math.random() * colors.length)
                ]}"
                .label=${badge.label}
                .description=${badge.description}
                .image=${badge.image}
              >
              </ha-label-badge>
            `
          )}
        </div>
      </ha-card>
      <ha-card>
        <div class="card-content">
          ${badges.map(
            (badge) => html`
              <div class="badge">
                <ha-label-badge
                  style="--ha-label-badge-color: ${colors[
                    Math.floor(Math.random() * colors.length)
                  ]}"
                  .label=${badge.label}
                  .description=${badge.description}
                  .image=${badge.image}
                >
                </ha-label-badge>
                <pre>${JSON.stringify(badge, null, 2)}</pre>
              </div>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      pre {
        margin-left: 16px;
        background-color: var(--markdown-code-background-color);
        padding: 8px;
      }
      .badge {
        display: flex;
        flex-direction: row;
        margin-bottom: 16px;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-label-badge": DemoHaLabelBadge;
  }
}
