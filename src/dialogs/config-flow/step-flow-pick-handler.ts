import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import Fuse from "fuse.js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../common/search/search-input";
import { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-icon-next";
import { domainToName } from "../../data/integration";
import { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { documentationUrl } from "../../util/documentation-url";
import { configFlowContentStyles } from "./styles";

interface HandlerObj {
  name: string;
  slug: string;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "handler-picked": {
      handler: string;
    };
  }
}

@customElement("step-flow-pick-handler")
class StepFlowPickHandler extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public handlers!: string[];

  @state() private _filter?: string;

  private _width?: number;

  private _height?: number;

  private _getHandlers = memoizeOne(
    (h: string[], filter?: string, _localize?: LocalizeFunc) => {
      const handlers: HandlerObj[] = h.map((handler) => ({
        name: domainToName(this.hass.localize, handler),
        slug: handler,
      }));

      if (filter) {
        const options: Fuse.IFuseOptions<HandlerObj> = {
          keys: ["name", "slug"],
          isCaseSensitive: false,
          minMatchCharLength: 2,
          threshold: 0.2,
        };
        const fuse = new Fuse(handlers, options);
        return fuse.search(filter).map((result) => result.item);
      }
      return handlers.sort((a, b) =>
        a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1
      );
    }
  );

  protected render(): TemplateResult {
    const handlers = this._getHandlers(
      this.handlers,
      this._filter,
      this.hass.localize
    );

    return html`
      <h2>${this.hass.localize("ui.panel.config.integrations.new")}</h2>
      <search-input
        autofocus
        .filter=${this._filter}
        @value-changed=${this._filterChanged}
        .label=${this.hass.localize("ui.panel.config.integrations.search")}
      ></search-input>
      <div
        style=${styleMap({
          width: `${this._width}px`,
          height: `${this._height}px`,
        })}
      >
        ${handlers.length
          ? handlers.map(
              (handler: HandlerObj) =>
                html`
                  <paper-icon-item
                    @click=${this._handlerPicked}
                    .handler=${handler}
                  >
                    <img
                      slot="item-icon"
                      loading="lazy"
                      src=${brandsUrl({
                        domain: handler.slug,
                        type: "icon",
                        useFallback: true,
                        darkOptimized: this.hass.selectedTheme?.dark,
                      })}
                      referrerpolicy="no-referrer"
                    />

                    <paper-item-body> ${handler.name} </paper-item-body>
                    <ha-icon-next></ha-icon-next>
                  </paper-icon-item>
                `
            )
          : html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.integrations.note_about_integrations"
                )}<br />
                ${this.hass.localize(
                  "ui.panel.config.integrations.note_about_website_reference"
                )}<a
                  href=${documentationUrl(
                    this.hass,
                    `/integrations/${
                      this._filter ? `#search/${this._filter}` : ""
                    }`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.home_assistant_website"
                  )}</a
                >.
              </p>
            `}
      </div>
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
    // Store the width and height so that when we search, box doesn't jump
    const div = this.shadowRoot!.querySelector("div")!;
    if (!this._width) {
      const width = div.clientWidth;
      if (width) {
        this._width = width;
      }
    }
    if (!this._height) {
      const height = div.clientHeight;
      if (height) {
        this._height = height;
      }
    }
  }

  private async _filterChanged(e) {
    this._filter = e.detail.value;
  }

  private async _handlerPicked(ev) {
    fireEvent(this, "handler-picked", {
      handler: ev.currentTarget.handler.slug,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      configFlowContentStyles,
      css`
        img {
          width: 40px;
          height: 40px;
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
        h2 {
          padding-right: 66px;
        }
        @media all and (max-height: 900px) {
          div {
            max-height: calc(100vh - 134px);
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
