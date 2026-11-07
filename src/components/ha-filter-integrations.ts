import type { ContextType } from "@lit/context";
import { mdiFilterVariantRemove } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { arrayWith, arrayWithout } from "../common/array/array-with";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { internationalizationContext, manifestsContext } from "../data/context";
import type { IntegrationManifest } from "../data/integration";
import { domainToName } from "../data/integration";
import "./ha-domain-icon";
import "./ha-expansion-panel";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";

@customElement("ha-filter-integrations")
export class HaFilterIntegrations extends LitElement {
  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: manifestsContext, subscribe: true })
  @state()
  private _manifests?: ContextType<typeof manifestsContext>;

  private _manifestList = memoizeOne(
    (manifests: ContextType<typeof manifestsContext>) =>
      Object.values(manifests)
  );

  @state() private _filter?: string;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  protected render() {
    const manifests = this._manifests
      ? this._manifestList(this._manifests)
      : undefined;

    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.panel.config.integrations.caption")}
          ${
            this.value?.length
              ? html`<div class="badge">${this.value?.length}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`<div class="content" ${ref(this._content)}>
              ${
                manifests
                  ? html`<ha-input-search
                        appearance="outlined"
                        .value=${this._filter}
                        @input=${this._handleSearchChange}
                      >
                      </ha-input-search>
                      <ha-list-selectable
                        multi
                        aria-label=${this._localize(
                          "ui.panel.config.integrations.caption"
                        )}
                        @ha-list-item-selected=${this._handleItemToggled}
                        @ha-list-item-deselected=${this._handleItemToggled}
                      >
                        ${repeat(
                          this._integrations(
                            this._localize,
                            manifests,
                            this._filter,
                            this._i18n.locale.language
                          ),
                          (i) => i.domain,
                          (integration) =>
                            html`<ha-list-item-option
                              appearance="checkbox"
                              selection-position="end"
                              .value=${integration.domain}
                              .selected=${
                                this.value?.includes(integration.domain) ??
                                false
                              }
                            >
                              <ha-domain-icon
                                slot="start"
                                .domain=${integration.domain}
                                brand-fallback
                              ></ha-domain-icon>
                              <span slot="headline">${integration.name}</span>
                            </ha-list-item-option>`
                        )}
                      </ha-list-selectable>`
                  : nothing
              }
            </div>`
          : nothing
      }
    `;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  protected firstUpdated() {
    this._i18n.loadBackendTranslation("title");
  }

  private _integrations = memoizeOne(
    (
      localize: LocalizeFunc,
      manifest: IntegrationManifest[],
      filter: string | undefined,
      language: string
    ) =>
      manifest
        .map((mnfst) => ({
          ...mnfst,
          name: domainToName(localize, mnfst.domain, mnfst),
        }))
        .filter(
          (mnfst) =>
            (!mnfst.integration_type ||
              !["entity", "system", "hardware"].includes(
                mnfst.integration_type
              )) &&
            (!filter ||
              mnfst.name.toLowerCase().includes(filter) ||
              mnfst.domain.toLowerCase().includes(filter))
        )
        .sort((a, b) => stringCompare(a.name, b.name, language))
  );

  private _handleItemToggled(
    ev: HASSDomEvent<number> & HASSDomCurrentTargetEvent<HaListSelectable>
  ) {
    const domain = (
      ev.currentTarget.items[ev.detail] as HaListItemOption | undefined
    )?.value;
    if (!domain) {
      return;
    }

    this.value =
      ev.type === "ha-list-item-selected"
        ? arrayWith(this.value, domain)
        : arrayWithout(this.value, domain);

    fireEvent(this, "data-table-filter-changed", {
      value: this.value.length ? this.value : undefined,
      items: undefined,
    });
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  private _handleSearchChange(ev: InputEvent) {
    const target = ev.target as HaInputSearch;
    this._filter = (target.value ?? "").toLowerCase();
  }

  static get styles(): CSSResultGroup {
    return [
      filterPanelStyles,
      css`
        ha-list-selectable {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        ha-list-selectable::part(base) {
          flex: 1;
          min-height: 0;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .header ha-icon-button {
          margin-inline-start: auto;
          margin-inline-end: 8px;
        }
        .badge {
          display: inline-block;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: 0;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        ha-input-search {
          display: block;
          padding: var(--ha-space-1) var(--ha-space-2) 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-integrations": HaFilterIntegrations;
  }
}
