import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-spinner/paper-spinner-lite";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { HomeAssistant } from "../../types";
import { createConfigFlow } from "../../data/config_entries";
import { fireEvent } from "../../common/dom/fire_event";
import memoizeOne from "memoize-one";
import * as Fuse from "fuse.js";

import "../../components/ha-icon-next";
import "../../common/search/search-input";

interface HandlerObj {
  name: string;
  slug: string;
}

@customElement("step-flow-pick-handler")
class StepFlowPickHandler extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public handlers!: string[];
  @property() private filter?: string;

  private _getHandlers = memoizeOne((h: string[], filter?: string) => {
    const handlers: HandlerObj[] = h.map((handler) => {
      return {
        name: this.hass.localize(`component.${handler}.config.title`),
        slug: handler,
      };
    });

    if (filter) {
      const options: Fuse.FuseOptions<HandlerObj> = {
        keys: ["name", "slug"],
        caseSensitive: false,
        minMatchCharLength: 2,
        threshold: 0.2,
      };
      const fuse = new Fuse(handlers, options);
      return fuse.search(filter);
    }
    return handlers.sort((a, b) =>
      a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1
    );
  });

  protected render(): TemplateResult | void {
    const handlers = this._getHandlers(this.handlers, this.filter);

    return html`
      <h2>${this.hass.localize("ui.panel.config.integrations.new")}</h2>
      <div>
        <search-input
          .filter=${this.filter}
          @value-changed=${this._filterChanged}
        ></search-input>
        ${handlers.map(
          (handler: HandlerObj) =>
            html`
              <paper-item @click=${this._handlerPicked} .handler=${handler}>
                <paper-item-body>
                  ${handler.name}
                </paper-item-body>
                <ha-icon-next></ha-icon-next>
              </paper-item>
            `
        )}
      </div>
    `;
  }

  private async _filterChanged(e) {
    this.filter = e.detail.value;
  }

  private async _handlerPicked(ev) {
    fireEvent(this, "flow-update", {
      stepPromise: createConfigFlow(this.hass, ev.currentTarget.handler.slug),
    });
  }

  static get styles(): CSSResult {
    return css`
      h2 {
        margin-bottom: 2px;
        padding-left: 16px;
      }
      div {
        overflow: auto;
        max-height: 600px;
      }
      paper-item {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-pick-handler": StepFlowPickHandler;
  }
}
