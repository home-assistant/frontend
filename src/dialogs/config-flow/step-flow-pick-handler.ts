import "@material/mwc-list/mwc-check-list-item";
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
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import "../../common/search/search-input";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-icon-next";
import { getConfigEntries } from "../../data/config_entries";
import { domainToName } from "../../data/integration";
import { showZWaveJSAddNodeDialog } from "../../panels/config/integrations/integration-panels/zwave_js/show-dialog-zwave_js-add-node";
import { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import { documentationUrl } from "../../util/documentation-url";
import { configFlowContentStyles } from "./styles";

interface HandlerObj {
  name: string;
  slug: string;
  is_add?: boolean;
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

    const addDeviceRows: HandlerObj[] = ["zha", "zwave_js"]
      .filter((domain) => isComponentLoaded(this.hass, domain))
      .map((domain) => ({
        name: this.hass.localize(
          `ui.panel.config.integrations.add_${domain}_device`
        ),
        slug: domain,
        is_add: true,
      }))
      .sort((a, b) => caseInsensitiveStringCompare(a.name, b.name));

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
        class="container"
        style=${styleMap({
          width: `${this._width}px`,
          height: `${this._height}px`,
        })}
      >
        ${addDeviceRows.length
          ? html`
              ${addDeviceRows.map((handler) => this._renderRow(handler))}
              <div class="divider"></div>
            `
          : ""}
        ${handlers.length
          ? handlers.map((handler) => this._renderRow(handler))
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

  private _renderRow(handler: HandlerObj) {
    return html`
      <mwc-list-item
        graphic="medium"
        .hasMeta=${!handler.is_add}
        .handler=${handler}
        @click=${this._handlerPicked}
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
        <span>${handler.name}</span>
        ${handler.is_add ? "" : html`<ha-icon-next slot="meta"></ha-icon-next>`}
      </mwc-list-item>
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
    if (!changedProps.has("handlers")) {
      return;
    }
    // Wait until list item initialized
    const firstListItem = this.shadowRoot!.querySelector("mwc-list-item")!;
    firstListItem.updateComplete.then(() => {
      // Store the width and height so that when we search, box doesn't jump
      const div = this.shadowRoot!.querySelector("div.container")!;
      this._width = div.clientWidth;
      this._height = div.clientHeight;
    });
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
    const handler: HandlerObj = ev.currentTarget.handler;

    if (handler.is_add) {
      if (handler.slug === "zwave_js") {
        const entries = await getConfigEntries(this.hass);
        const entry = entries.find((ent) => ent.domain === "zwave_js");

        if (!entry) {
          return;
        }

        showZWaveJSAddNodeDialog(this, {
          entry_id: entry.entry_id,
        });
      } else if (handler.slug === "zha") {
        navigate("/config/zha/add");
      }

      // This closes dialog.
      fireEvent(this, "flow-update");
      return;
    }

    fireEvent(this, "handler-picked", {
      handler: handler.slug,
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
          margin-top: 8px;
        }
        .divider {
          margin: 8px 0;
          border-top: 1px solid var(--divider-color);
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
