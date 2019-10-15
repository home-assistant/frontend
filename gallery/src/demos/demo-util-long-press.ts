import { html, LitElement, TemplateResult } from "lit-element";
import "@material/mwc-button";

import "../../../src/components/ha-card";
import { longPress } from "../../../src/panels/lovelace/common/directives/long-press-directive";

export class DemoUtilLongPress extends LitElement {
  protected render(): TemplateResult | void {
    return html`
      ${this.renderStyle()}
      ${[1, 2, 3].map(
        () => html`
          <ha-card>
            <mwc-button
              @ha-click="${this._handleClick}"
              @ha-hold="${this._handleHold}"
              .longPress="${longPress()}"
            >
              (long) press me!
            </mwc-button>

            <textarea></textarea>

            <div>(try pressing and scrolling too!)</div>
          </ha-card>
        `
      )}
    `;
  }

  private _handleClick(ev: Event) {
    this._addValue(ev, "tap");
  }

  private _handleHold(ev: Event) {
    this._addValue(ev, "hold");
  }

  private _addValue(ev: Event, value: string) {
    const area = (ev.currentTarget as HTMLElement)
      .nextElementSibling! as HTMLTextAreaElement;
    const now = new Date().toTimeString().split(" ")[0];
    area.value += `${now}: ${value}\n`;
    area.scrollTop = area.scrollHeight;
  }

  private renderStyle() {
    return html`
      <style>
        ha-card {
          width: 200px;
          margin: calc(42vh - 140px) auto;
          padding: 8px;
          text-align: center;
        }
        ha-card:first-of-type {
          margin-top: 16px;
        }
        ha-card:last-of-type {
          margin-bottom: 16px;
        }

        textarea {
          height: 50px;
        }
      </style>
    `;
  }
}

customElements.define("demo-util-long-press", DemoUtilLongPress);
