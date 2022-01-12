import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";

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

@customElement("demo-lovelace-iframe-card")
class DemoIframe extends LitElement {
  @query("demo-cards") private _demos!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    provideHass(this._demos);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-iframe-card": DemoIframe;
  }
}
