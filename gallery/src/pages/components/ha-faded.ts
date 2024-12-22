import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-faded";
import "../../../../src/components/ha-markdown";
import { LONG_TEXT } from "../../data/text";

const SMALL_TEXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

@customElement("demo-components-ha-faded")
export class DemoHaFaded extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="ha-faded demo">
        <div class="card-content">
          <h3>Long text directly as slotted content</h3>
          <ha-faded>${LONG_TEXT}</ha-faded>
          <h3>Long text with slotted element</h3>
          <ha-faded><span>${LONG_TEXT}</span></ha-faded>
          <h3>No text</h3>
          <ha-faded><span></span></ha-faded>
          <h3>Smal text</h3>
          <ha-faded><span>${SMALL_TEXT}</span></ha-faded>
          <h3>Long text in markdown</h3>
          <ha-faded>
            <ha-markdown .content=${LONG_TEXT}> </ha-markdown>
          </ha-faded>
          <h3>Missing 1px from hiding</h3>
          <ha-faded faded-height="87">
            <span>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              laoreet velit ut elit volutpat, eget ultrices odio lacinia. In
              imperdiet malesuada est, nec sagittis metus ultricies quis. Sed
              nisl ex, convallis porttitor ante quis, hendrerit tristique justo.
              Mauris pharetra venenatis augue, eu maximus sem cursus in. Quisque
              sed consequat risus. Suspendisse facilisis ligula a odio
              consectetur condimentum. Curabitur vehicula elit nec augue mollis,
              et volutpat massa dictum. Nam pellentesque auctor rutrum.
              Suspendisse elit est, sodales vel diam nec, porttitor faucibus
              massa. Ut pretium ac orci eu pharetra.
            </span>
          </ha-faded>
          <h3>1px over hiding point</h3>
          <ha-faded faded-height="85">
            <span>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              laoreet velit ut elit volutpat, eget ultrices odio lacinia. In
              imperdiet malesuada est, nec sagittis metus ultricies quis. Sed
              nisl ex, convallis porttitor ante quis, hendrerit tristique justo.
              Mauris pharetra venenatis augue, eu maximus sem cursus in. Quisque
              sed consequat risus. Suspendisse facilisis ligula a odio
              consectetur condimentum. Curabitur vehicula elit nec augue mollis,
              et volutpat massa dictum. Nam pellentesque auctor rutrum.
              Suspendisse elit est, sodales vel diam nec, porttitor faucibus
              massa. Ut pretium ac orci eu pharetra.
            </span>
          </ha-faded>
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-faded": DemoHaFaded;
  }
}
