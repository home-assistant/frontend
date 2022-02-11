import Fuse from "fuse.js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../common/search/search-input";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-icon-next";
import { domainToName } from "../../data/integration";
import { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { documentationUrl } from "../../util/documentation-url";
import { configFlowContentStyles } from "./styles";
import "@material/mwc-list/mwc-list-item";
import { afterNextRender } from "../../common/util/render-status";

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

  @property() public initialFilter?: string;

  @state() private _filter?: string;

  private _width?: number;

  private _height?: number;

  private _filterHandlers = memoizeOne(
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
        caseInsensitiveStringCompare(a.name, b.name)
      );
    }
  );

  protected render(): TemplateResult {
    const handlers = this._getHandlers();

    return html`
      <h2>${this.hass.localize("ui.panel.config.integrations.new")}</h2>
      <search-input
        .hass=${this.hass}
        autofocus
        .filter=${this._filter}
        @value-changed=${this._filterChanged}
        .label=${this.hass.localize("ui.panel.config.integrations.search")}
        @keypress=${this._maybeSubmit}
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
                  <mwc-list-item
                    graphic="medium"
                    hasMeta
                    @click=${this._handlerPicked}
                    .handler=${handler}
                  >
                    <img
                      slot="graphic"
                      loading="lazy"
                      src=${brandsUrl({
                        domain: handler.slug,
                        type: "icon",
                        useFallback: true,
                        darkOptimized: this.hass.themes?.darkMode,
                      })}
                      referrerpolicy="no-referrer"
                    />

                    ${handler.name}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </mwc-list-item>
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

  public willUpdate(changedProps: PropertyValues): void {
    if (this._filter === undefined && this.initialFilter !== undefined) {
      this._filter = this.initialFilter;
    }
    super.willUpdate(changedProps);
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
    if (!this._width || !this._height) {
      this.updateComplete.then(() => {
        afterNextRender(() => {
          const boundingRect =
            this.shadowRoot!.querySelector("div")!.getBoundingClientRect();
          this._width = boundingRect.width;
          this._height = boundingRect.height;
        });
      });
    }
  }

  private _getHandlers() {
    return this._filterHandlers(
      this.handlers,
      this._filter,
      this.hass.localize
    );
  }

  private async _filterChanged(e) {
    this._filter = e.detail.value;
  }

  private async _handlerPicked(ev) {
    fireEvent(this, "handler-picked", {
      handler: ev.currentTarget.handler.slug,
    });
  }

  private _maybeSubmit(ev: KeyboardEvent) {
    if (ev.key !== "Enter") {
      return;
    }

    const handlers = this._getHandlers();

    if (handlers.length > 0) {
      fireEvent(this, "handler-picked", {
        handler: handlers[0].slug,
      });
    }
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
          margin: 8px 16px 0;
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
