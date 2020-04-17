import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-spinner/paper-spinner-lite";
import * as Fuse from "fuse.js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { styleMap } from "lit-html/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../common/search/search-input";
import "../../components/ha-icon-next";
import { HomeAssistant } from "../../types";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

interface HandlerObj {
  name: string;
  slug: string;
}

@customElement("step-flow-pick-handler")
class StepFlowPickHandler extends LitElement {
  public flowConfig!: FlowConfig;

  @property() public hass!: HomeAssistant;

  @property() public handlers!: string[];

  @property() public showAdvanced?: boolean;

  @property() private filter?: string;

  private _width?: number;

  private _getHandlers = memoizeOne((h: string[], filter?: string) => {
    const handlers: HandlerObj[] = h.map((handler) => {
      return {
        name: this.hass.localize(`component.${handler}.title`) || handler,
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

  protected render(): TemplateResult {
    const handlers = this._getHandlers(this.handlers, this.filter);

    return html`
      <h2>${this.hass.localize("ui.panel.config.integrations.new")}</h2>
      <search-input
        autofocus
        .filter=${this.filter}
        @value-changed=${this._filterChanged}
      ></search-input>
      <div
        style=${styleMap({ width: `${this._width}px` })}
        class=${classMap({ advanced: Boolean(this.showAdvanced) })}
      >
        ${handlers.map(
          (handler: HandlerObj) =>
            html`
              <paper-icon-item
                @click=${this._handlerPicked}
                .handler=${handler}
              >
                <img
                  slot="item-icon"
                  loading="lazy"
                  src="https://brands.home-assistant.io/_/${handler.slug}/icon.png"
                  referrerpolicy="no-referrer"
                />

                <paper-item-body>
                  ${handler.name}
                </paper-item-body>
                <ha-icon-next></ha-icon-next>
              </paper-icon-item>
            `
        )}
      </div>
      ${this.showAdvanced
        ? html`
            <p>
              ${this.hass.localize(
                "ui.panel.config.integrations.note_about_integrations"
              )}<br />
              ${this.hass.localize(
                "ui.panel.config.integrations.note_about_website_reference"
              )}<a
                href="https://www.home-assistant.io/integrations/"
                target="_blank"
                rel="noreferrer"
                >${this.hass.localize(
                  "ui.panel.config.integrations.home_assistant_website"
                )}</a
              >.
            </p>
          `
        : ""}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    setTimeout(
      () => this.shadowRoot!.querySelector("search-input")!.focus(),
      0
    );
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    // Store the width so that when we search, box doesn't jump
    if (!this._width) {
      const width = this.shadowRoot!.querySelector("div")!.clientWidth;
      if (width) {
        this._width = width;
      }
    }
  }

  private async _filterChanged(e) {
    this.filter = e.detail.value;
  }

  private async _handlerPicked(ev) {
    fireEvent(this, "flow-update", {
      stepPromise: this.flowConfig.createFlow(
        this.hass,
        ev.currentTarget.handler.slug
      ),
    });
  }

  static get styles(): CSSResult[] {
    return [
      configFlowContentStyles,
      css`
        img {
          max-width: 40px;
          max-height: 40px;
        }
        search-input {
          display: block;
          margin: -12px 16px 0;
        }
        ha-icon-next {
          margin-right: 8px;
        }
        div {
          overflow: auto;
          max-height: 600px;
        }
        @media all and (max-height: 1px) {
          div {
            max-height: calc(100vh - 205px);
          }
          div.advanced {
            max-height: calc(100vh - 300px);
          }
        }
        paper-icon-item {
          cursor: pointer;
          margin-bottom: 4px;
        }
        p {
          text-align: center;
          padding: 16px;
          margin: 0;
        }
        p > a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-pick-handler": StepFlowPickHandler;
  }
}
