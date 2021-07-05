import { html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../components/demo-cards";

const CONFIGS = [
  {
    heading: "Without title",
    config: `
- type: iframe
  url: https://embed.windy.com/embed2.html
    `,
  },
  {
    heading: "With title",
    config: `
- type: iframe
  url: https://embed.windy.com/embed2.html
  title: Weather radar
    `,
  },
  {
    heading: "Height-Width 3:4",
    config: `
- type: iframe
  url: https://embed.windy.com/embed2.html
  aspect_ratio: 75%
    `,
  },
  {
    heading: "Height-Width 1:1",
    config: `
- type: iframe
  url: https://embed.windy.com/embed2.html
  aspect_ratio: 100%
    `,
  },
];

@customElement("demo-hui-iframe-card")
class DemoIframe extends LitElement {
  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-hui-iframe-card": DemoIframe;
  }
}
