import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { until } from "lit/directives/until";
import memoizeOne from "memoize-one";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-spinner";
import "../../../../components/search-input";
import { isUnavailableState } from "../../../../data/entity";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { CustomBadgeEntry } from "../../../../data/lovelace_custom_cards";
import {
  CUSTOM_TYPE_PREFIX,
  customBadges,
  getCustomBadgeEntry,
} from "../../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../../types";
import {
  calcUnusedEntities,
  computeUsedEntities,
} from "../../common/compute-unused-entities";
import { tryCreateBadgeElement } from "../../create-element/create-badge-element";
import type { LovelaceBadge } from "../../types";
import { getBadgeStubConfig } from "../get-badge-stub-config";
import { coreBadges } from "../lovelace-badges";
import type { Badge, BadgePickTarget } from "../types";

interface BadgeElement {
  badge: Badge;
  element: TemplateResult;
}

@customElement("hui-badge-picker")
export class HuiBadgePicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public suggestedBadges?: string[];

  @state()
  @storage({
    key: "dashboardBadgeClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  private _clipboard?: LovelaceBadgeConfig;

  @state() private _badges: BadgeElement[] = [];

  public lovelace?: LovelaceConfig;

  public badgePicked?: (badgeConf: LovelaceBadgeConfig) => void;

  @state() private _filter = "";

  @state() private _width?: number;

  @state() private _height?: number;

  private _unusedEntities?: string[];

  private _usedEntities?: string[];

  private _filterBadges = memoizeOne(
    (badgeElements: BadgeElement[], filter?: string): BadgeElement[] => {
      if (!filter) {
        return badgeElements;
      }
      let badges = badgeElements.map(
        (badgeElement: BadgeElement) => badgeElement.badge
      );
      const options: IFuseOptions<Badge> = {
        keys: ["type", "name", "description"],
        isCaseSensitive: false,
        minMatchCharLength: Math.min(filter.length, 2),
        threshold: 0.2,
        ignoreDiacritics: true,
      };
      const fuse = new Fuse(badges, options);
      badges = fuse.search(filter).map((result) => result.item);
      return badgeElements.filter((badgeElement: BadgeElement) =>
        badges.includes(badgeElement.badge)
      );
    }
  );

  private _suggestedBadges = memoizeOne(
    (badgeElements: BadgeElement[]): BadgeElement[] =>
      badgeElements.filter(
        (badgeElement: BadgeElement) => badgeElement.badge.isSuggested
      )
  );

  private _customBadges = memoizeOne(
    (badgeElements: BadgeElement[]): BadgeElement[] =>
      badgeElements.filter(
        (badgeElement: BadgeElement) =>
          badgeElement.badge.isCustom && !badgeElement.badge.isSuggested
      )
  );

  private _otherBadges = memoizeOne(
    (badgeElements: BadgeElement[]): BadgeElement[] =>
      badgeElements.filter(
        (badgeElement: BadgeElement) =>
          !badgeElement.badge.isSuggested && !badgeElement.badge.isCustom
      )
  );

  protected render() {
    if (
      !this.hass ||
      !this.lovelace ||
      !this._unusedEntities ||
      !this._usedEntities
    ) {
      return nothing;
    }

    const suggestedBadges = this._suggestedBadges(this._badges);
    const otherBadges = this._otherBadges(this._badges);
    const customBadgesItems = this._customBadges(this._badges);

    return html`
      <search-input
        .hass=${this.hass}
        .filter=${this._filter}
        @value-changed=${this._handleSearchChange}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.edit_badge.search_badgess"
        )}
      ></search-input>
      <div
        id="content"
        style=${styleMap({
          width: this._width ? `${this._width}px` : "auto",
          height: this._height ? `${this._height}px` : "auto",
        })}
      >
        <div class="badges-container">
          ${this._filter
            ? this._filterBadges(this._badges, this._filter).map(
                (badgeElement: BadgeElement) => badgeElement.element
              )
            : html`
                ${suggestedBadges.length > 0
                  ? html`
                      <div class="badges-container-header">
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.badge.generic.suggested_badges`
                        )}
                      </div>
                    `
                  : nothing}
                ${this._renderClipboardBadge()}
                ${suggestedBadges.map(
                  (badgeElement: BadgeElement) => badgeElement.element
                )}
                ${suggestedBadges.length > 0
                  ? html`
                      <div class="badges-container-header">
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.badge.generic.other_badges`
                        )}
                      </div>
                    `
                  : nothing}
                ${otherBadges.map(
                  (badgeElement: BadgeElement) => badgeElement.element
                )}
                ${customBadgesItems.length > 0
                  ? html`
                      <div class="badges-container-header">
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.badge.generic.custom_badges`
                        )}
                      </div>
                    `
                  : nothing}
                ${customBadgesItems.map(
                  (badgeElement: BadgeElement) => badgeElement.element
                )}
              `}
        </div>
        <div class="badges-container">
          <div
            class="badge manual"
            @click=${this._badgePicked}
            .config=${{ type: "" }}
          >
            <div class="badge-header">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.badge.generic.manual`
              )}
            </div>
            <div class="preview description">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.badge.generic.manual_description`
              )}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass) {
      return true;
    }

    if (oldHass.locale !== this.hass!.locale) {
      return true;
    }

    return false;
  }

  protected firstUpdated(): void {
    if (!this.hass || !this.lovelace) {
      return;
    }

    const usedEntities = computeUsedEntities(this.lovelace);
    const unusedEntities = calcUnusedEntities(this.hass, usedEntities);

    this._usedEntities = [...usedEntities].filter(
      (eid) =>
        this.hass!.states[eid] &&
        !isUnavailableState(this.hass!.states[eid].state)
    );
    this._unusedEntities = [...unusedEntities].filter(
      (eid) =>
        this.hass!.states[eid] &&
        !isUnavailableState(this.hass!.states[eid].state)
    );

    this._loadBages();
  }

  private _loadBages() {
    let badges = coreBadges.map<Badge>((badge) => ({
      name: this.hass!.localize(
        `ui.panel.lovelace.editor.badge.${badge.type}.name`
      ),
      description: this.hass!.localize(
        `ui.panel.lovelace.editor.badge.${badge.type}.description`
      ),
      isSuggested: this.suggestedBadges?.includes(badge.type) || false,
      ...badge,
    }));

    badges = badges.sort((a, b) => {
      if (a.isSuggested && !b.isSuggested) {
        return -1;
      }
      if (!a.isSuggested && b.isSuggested) {
        return 1;
      }
      return stringCompare(
        a.name || a.type,
        b.name || b.type,
        this.hass?.language
      );
    });

    if (customBadges.length > 0) {
      badges = badges.concat(
        customBadges
          .map((cbadge: CustomBadgeEntry) => ({
            type: cbadge.type,
            name: cbadge.name,
            description: cbadge.description,
            showElement: cbadge.preview,
            isCustom: true,
          }))
          .sort((a, b) =>
            stringCompare(
              a.name || a.type,
              b.name || b.type,
              this.hass?.language
            )
          )
      );
    }
    this._badges = badges.map((badge) => ({
      badge: badge,
      element: html`${until(
        this._renderBadgeElement(badge),
        html`
          <div class="badge spinner">
            <ha-spinner></ha-spinner>
          </div>
        `
      )}`,
    }));
  }

  private _renderClipboardBadge() {
    if (!this._clipboard) {
      return nothing;
    }

    return html` ${until(
      this._renderBadgeElement(
        {
          type: this._clipboard.type,
          showElement: true,
          isCustom: false,
          name: this.hass!.localize(
            "ui.panel.lovelace.editor.badge.generic.paste"
          ),
          description: `${this.hass!.localize(
            "ui.panel.lovelace.editor.badge.generic.paste_description",
            {
              type: this._clipboard.type,
            }
          )}`,
        },
        this._clipboard
      ),
      html`
        <div class="badge spinner">
          <ha-spinner></ha-spinner>
        </div>
      `
    )}`;
  }

  private _handleSearchChange(ev: CustomEvent) {
    const value = ev.detail.value;

    if (!value) {
      // Reset when we no longer filter
      this._width = undefined;
      this._height = undefined;
    } else if (!this._width || !this._height) {
      // Save height and width so the dialog doesn't jump while searching
      const div = this.shadowRoot!.getElementById("content");
      if (div && !this._width) {
        const width = div.clientWidth;
        if (width) {
          this._width = width;
        }
      }
      if (div && !this._height) {
        const height = div.clientHeight;
        if (height) {
          this._height = height;
        }
      }
    }

    this._filter = value;
  }

  private _badgePicked(ev: Event): void {
    const config: LovelaceBadgeConfig = (ev.currentTarget! as BadgePickTarget)
      .config;

    fireEvent(this, "config-changed", { config });
  }

  private _tryCreateBadgeElement(badge: LovelaceBadgeConfig) {
    const element = tryCreateBadgeElement(badge) as LovelaceBadge;
    element.hass = this.hass;
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildBadge(element, badge);
      },
      { once: true }
    );
    return element;
  }

  private _rebuildBadge(
    badgeElToReplace: LovelaceBadge,
    config: LovelaceBadgeConfig
  ): void {
    let newBadgeEl: LovelaceBadge;
    try {
      newBadgeEl = this._tryCreateBadgeElement(config);
    } catch (_err: any) {
      return;
    }
    if (badgeElToReplace.parentElement) {
      badgeElToReplace.parentElement!.replaceChild(
        newBadgeEl,
        badgeElToReplace
      );
    }
  }

  private async _renderBadgeElement(
    badge: Badge,
    config?: LovelaceBadgeConfig
  ): Promise<TemplateResult> {
    let { type } = badge;
    const { showElement, isCustom, name, description } = badge;
    const customBadge = isCustom ? getCustomBadgeEntry(type) : undefined;
    if (isCustom) {
      type = `${CUSTOM_TYPE_PREFIX}${type}`;
    }

    let element: LovelaceBadge | undefined;
    let badgeConfig: LovelaceBadgeConfig = config ?? { type };

    if (this.hass && this.lovelace) {
      if (!config) {
        badgeConfig = await getBadgeStubConfig(
          this.hass,
          type,
          this._unusedEntities!,
          this._usedEntities!
        );
      }

      if (showElement) {
        try {
          element = this._tryCreateBadgeElement(badgeConfig);
        } catch (_err: any) {
          element = undefined;
        }
      }
    }

    return html`
      <div class="badge">
        <div
          class="overlay"
          @click=${this._badgePicked}
          .config=${badgeConfig}
        ></div>
        <div class="badge-header">
          ${customBadge
            ? `${this.hass!.localize(
                "ui.panel.lovelace.editor.badge_picker.custom_badge"
              )}: ${customBadge.name || customBadge.type}`
            : name}
        </div>
        <div
          class="preview ${classMap({
            description: !element || element.tagName === "HUI-ERROR-BADGE",
          })}"
        >
          ${element && element.tagName !== "HUI-ERROR-BADGE"
            ? element
            : customBadge
              ? customBadge.description ||
                this.hass!.localize(
                  `ui.panel.lovelace.editor.badge_picker.no_description`
                )
              : description}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        search-input {
          display: block;
          --mdc-shape-small: var(--badge-picker-search-shape);
          margin: var(--badge-picker-search-margin);
        }

        .badges-container-header {
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          padding: 12px 8px 4px 8px;
          margin: 0;
          grid-column: 1 / -1;
        }

        .badges-container {
          display: grid;
          grid-gap: 8px 8px;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          margin-top: 20px;
        }

        .badge {
          height: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          border-radius: var(--ha-card-border-radius, 12px);
          background: var(--primary-background-color, #fafafa);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          border: var(--ha-card-border-width, 1px) solid
            var(--ha-card-border-color, var(--divider-color));
        }

        .badge-header {
          color: var(--ha-card-header-color, var(--primary-text-color));
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-bold);
          letter-spacing: -0.012em;
          line-height: var(--ha-line-height-condensed);
          padding: 12px 16px;
          display: block;
          text-align: center;
          background: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          border-bottom: 1px solid var(--divider-color);
        }

        .preview {
          pointer-events: none;
          margin: 20px;
          flex-grow: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .description {
          text-align: center;
        }

        .spinner {
          align-items: center;
          justify-content: center;
        }

        .overlay {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 1;
          box-sizing: border-box;
          border-radius: var(--ha-card-border-radius, 12px);
        }

        .manual {
          grid-column: 1 / -1;
          max-width: none;
        }

        .icon {
          position: absolute;
          top: 8px;
          right: 8px;
          inset-inline-start: 8px;
          inset-inline-end: 8px;
          border-radius: 50%;
          --mdc-icon-size: 16px;
          line-height: 16px;
          box-sizing: border-box;
          color: var(--text-primary-color);
          padding: 4px;
        }
        .icon.custom {
          background: var(--warning-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-badge-picker": HuiBadgePicker;
  }
}
