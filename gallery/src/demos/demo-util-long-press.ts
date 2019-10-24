import { html, LitElement, TemplateResult } from "lit-element";
import "@material/mwc-button";

import "../../../src/components/ha-card";
import { actionHandler } from "../../../src/panels/lovelace/common/directives/action-handler-directive";
import { HASSDomEvent } from "../../../src/common/dom/fire_event";
import { ActionHandlerEvent } from "../../../src/data/lovelace";

export class DemoUtilLongPress extends LitElement {
  protected render(): TemplateResult | void {
    return html`
      ${this.renderStyle()}
      ${[1, 2, 3].map(
        () => html`
          <ha-card>
            <mwc-button
              @action=${this._handleAction}
              .actionHandler=${actionHandler({})}
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

  private _handleAction(ev: HASSDomEvent<ActionHandlerEvent>) {
    this._addValue(ev, ev.detail.action!);
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
