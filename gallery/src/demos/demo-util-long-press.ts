import "@material/mwc-button";
import { customElement, html, LitElement, TemplateResult } from "lit-element";
import "../../../src/components/ha-card";
import { ActionHandlerEvent } from "../../../src/data/lovelace";
import { actionHandler } from "../../../src/panels/lovelace/common/directives/action-handler-directive";

@customElement("demo-util-long-press")
export class DemoUtilLongPress extends LitElement {
  protected render(): TemplateResult {
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

            <div>Try pressing and scrolling too!</div>
          </ha-card>
        `
      )}
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
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
