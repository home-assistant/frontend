import { mdiPlus } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-svg-icon";
import "@home-assistant/hac/button";

@customElement("demo-components-hac-button")
export class DemoHacButton extends LitElement {
  protected render() {
    return html`
      ${(["filled", "outlined", "plain"] as const).map(
        (appearance) => html`
          <div class="row">
            <hac-button .appearance=${appearance}>Button</hac-button>
            <hac-button .appearance=${appearance}>
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              With icon
            </hac-button>
            <hac-button .appearance=${appearance} disabled>Disabled</hac-button>
          </div>
        `
      )}
      <div class="row">
        <hac-button-close></hac-button-close>
        <hac-button-close disabled></hac-button-close>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--ha-space-4);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ha-space-4);
      margin-bottom: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-hac-button": DemoHacButton;
  }
}
