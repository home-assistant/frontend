import { consume, type ContextType } from "@lit/context";
import {
  mdiChevronDown,
  mdiChevronUp,
  mdiFilterVariantRemove,
  mdiShape,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { createRef, ref } from "lit/directives/ref";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { computeRTL } from "../common/util/compute_rtl";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { internationalizationContext, statesContext } from "../data/context";
import {
  computeDeviceClassName,
  NO_DEVICE_CLASS,
} from "../data/entity/device_class";
import {
  entityTypeKey,
  parseEntityType,
  usedEntityTypes,
} from "../data/entity/entity_type";
import { domainToName } from "../data/integration";
import "./ha-domain-icon";
import "./ha-expansion-panel";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-tree-indicator";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";

// Core picks this one from the battery level, so it has no usable default.
const FIXED_TYPE_ICONS: Record<string, string> = {
  "sensor/battery": "mdi:battery",
};

interface TypeRow {
  key: string;
  domain: string;
  deviceClass?: string;
  name: string;
  deviceClasses?: string[];
  expanded?: boolean;
  last?: boolean;
}

@customElement("ha-filter-entity-types")
export class HaFilterEntityTypes extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: statesContext, subscribe: true })
  @state()
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  @state()
  private _i18n!: ContextType<typeof internationalizationContext>;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _filter?: string;

  @state() private _expandedDomains = new Set<string>();

  @query("ha-list-selectable") private _list?: HaListSelectable;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  private _badgeTypes?: Map<string, string[]>;

  protected render() {
    const count = this.value?.length
      ? this._count(this.value, this._badgeTypes!)
      : 0;

    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.components.filter-entity-types.caption")}
          ${
            count
              ? html`<div class="badge">${count}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${this._panel.showContent ? this._renderContent() : nothing}
    `;
  }

  private _renderContent() {
    const rows = this._rows(
      this._states,
      this._localize,
      this._i18n.locale.language,
      this._filter,
      this._expandedDomains
    );
    const rtl = computeRTL(
      this._i18n.language,
      this._i18n.translationMetadata.translations
    );

    return html`<div class="content" ${ref(this._content)}>
      <ha-input-search
        appearance="outlined"
        .value=${this._filter}
        @input=${this._handleSearchChange}
      >
      </ha-input-search>
      <ha-list-selectable
        multi
        controlled
        aria-label=${this._localize("ui.components.filter-entity-types.caption")}
        @ha-list-item-selected=${this._handleItemToggled}
        @ha-list-item-deselected=${this._handleItemToggled}
      >
        ${repeat(
          rows,
          (row) => row.key,
          (row) => this._renderRow(row, rtl)
        )}
      </ha-list-selectable>
    </div>`;
  }

  private _renderRow(row: TypeRow, rtl: boolean) {
    const selected = this._isSelected(row);
    const expandable = !!row.deviceClasses?.length;

    return html`
      <ha-list-item-option
        appearance="checkbox"
        selection-position="end"
        class=${classMap({ child: !!row.deviceClass, rtl })}
        .value=${row.key}
        .selected=${selected}
        .indeterminate=${!selected && this._isPartiallySelected(row)}
      >
        ${
          row.deviceClass
            ? html`<ha-tree-indicator
                slot="start"
                .end=${!!row.last}
              ></ha-tree-indicator>`
            : nothing
        }
        ${
          row.deviceClass === NO_DEVICE_CLASS
            ? html`<ha-svg-icon slot="start" .path=${mdiShape}></ha-svg-icon>`
            : html`<ha-domain-icon
                slot="start"
                .icon=${FIXED_TYPE_ICONS[row.key]}
                .domain=${row.domain}
                .deviceClass=${row.deviceClass}
                .state=${row.domain === "binary_sensor" ? "on" : undefined}
                ?brand-fallback=${!row.deviceClass}
              ></ha-domain-icon>`
        }
        <span slot="headline">${row.name}</span>
        ${
          expandable
            ? html`<ha-icon-button
                slot="end"
                data-domain=${row.domain}
                .path=${row.expanded ? mdiChevronUp : mdiChevronDown}
                .label=${this._localize(
                  row.expanded
                    ? "ui.components.filter-entity-types.collapse"
                    : "ui.components.filter-entity-types.expand"
                )}
                @click=${this._toggleDomain}
                @keydown=${this._handleChevronKeydown}
              ></ha-icon-button>`
            : nothing
        }
      </ha-list-item-option>
    `;
  }

  private _types = memoizeOne(usedEntityTypes);

  // A selected domain counts for the classes it stands for, so that collapsing
  // the last one does not drop the count to one.
  private _count = memoizeOne(
    (value: string[], types: Map<string, string[]>): number =>
      value.reduce((count, key) => {
        const { domain, deviceClass } = parseEntityType(key);
        return (
          count +
          (deviceClass ? 1 : Math.max(types.get(domain)?.length ?? 0, 1))
        );
      }, 0)
  );

  private _rows = memoizeOne(
    (
      states: ContextType<typeof statesContext>,
      localize: LocalizeFunc,
      language: string | undefined,
      filter: string | undefined,
      expandedDomains: Set<string>
    ): TypeRow[] => {
      const types = this._types(states);

      const domains = [...types.keys()]
        .map((domain) => ({ domain, name: domainToName(localize, domain) }))
        .sort((a, b) => stringCompare(a.name, b.name, language));

      const rows: TypeRow[] = [];

      for (const { domain, name } of domains) {
        const deviceClasses = types
          .get(domain)!
          .map((deviceClass) => ({
            deviceClass,
            name: this._deviceClassName(localize, domain, deviceClass),
          }))
          .sort((a, b) => {
            if (a.deviceClass === NO_DEVICE_CLASS) {
              return 1;
            }
            if (b.deviceClass === NO_DEVICE_CLASS) {
              return -1;
            }
            return stringCompare(a.name, b.name, language);
          });

        const matchingClasses = deviceClasses.filter((entry) =>
          this._matches(filter, entry.deviceClass, entry.name)
        );
        const domainMatches = this._matches(filter, domain, name);

        if (!domainMatches && !matchingClasses.length) {
          continue;
        }

        // Only a search that matched nothing but device classes unfolds them.
        const revealed = !!filter && !domainMatches;
        const expanded = revealed || expandedDomains.has(domain);

        rows.push({
          key: domain,
          domain,
          name,
          deviceClasses: deviceClasses.map((entry) => entry.deviceClass),
          expanded,
        });

        if (!deviceClasses.length || !expanded) {
          continue;
        }

        const children = revealed ? matchingClasses : deviceClasses;

        children.forEach((entry, index) => {
          rows.push({
            key: entityTypeKey(domain, entry.deviceClass),
            domain,
            deviceClass: entry.deviceClass,
            name: entry.name,
            last: index === children.length - 1,
          });
        });
      }

      return rows;
    }
  );

  private _deviceClassName(
    localize: LocalizeFunc,
    domain: string,
    deviceClass: string
  ): string {
    return deviceClass === NO_DEVICE_CLASS
      ? localize("ui.components.filter-entity-types.no_device_class")
      : computeDeviceClassName(localize, domain, deviceClass);
  }

  private _matches(
    filter: string | undefined,
    slug: string,
    name: string
  ): boolean {
    return (
      !filter ||
      slug.toLowerCase().includes(filter) ||
      name.toLowerCase().includes(filter)
    );
  }

  private _isSelected(row: TypeRow): boolean {
    const value = this.value;
    if (!value?.length) {
      return false;
    }
    return value.includes(row.domain) || value.includes(row.key);
  }

  private _isPartiallySelected(row: TypeRow): boolean {
    if (row.deviceClass || !this.value?.length) {
      return false;
    }
    return this.value.some(
      (key) => parseEntityType(key).domain === row.domain && key !== row.domain
    );
  }

  public willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);

    // While closed, the badge reuses the classes it last saw rather than
    // rescanning every entity on each state change.
    if (this._panel.showContent || !this._badgeTypes) {
      this._badgeTypes = this._types(this._states);
    }

    if (changed.has("expanded") && this.expanded) {
      this._expandedDomains = new Set(
        (this.value ?? [])
          .map((key) => parseEntityType(key))
          .filter((type) => type.deviceClass)
          .map((type) => type.domain)
      );
    }
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  // The list activates the focused row on Enter and Space, which would select
  // the domain instead of expanding it.
  private _handleChevronKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.stopPropagation();
    }
  }

  private _toggleDomain(ev: Event) {
    ev.stopPropagation();
    const { domain } = (ev.currentTarget as HTMLElement).dataset;
    if (!domain) {
      return;
    }
    const expandedDomains = new Set(this._expandedDomains);
    if (!expandedDomains.delete(domain)) {
      expandedDomains.add(domain);
    }
    this._expandedDomains = expandedDomains;
  }

  private _handleItemToggled(ev: CustomEvent<number>) {
    // The list indexes its items by registration order, which a search reorders,
    // so read the key off the clicked option instead.
    const option = this._list?.items[ev.detail] as HaListItemOption | undefined;
    const key = option?.value;
    if (!key) {
      return;
    }
    const { domain, deviceClass } = parseEntityType(key);

    const value = new Set(this.value ?? []);
    const siblings = (this._types(this._states).get(domain) ?? []).map(
      (entry) => entityTypeKey(domain, entry)
    );

    // Drops the classes the domain no longer exposes too, so that a stale key
    // can never sit next to the domain that covers it.
    const selectDomain = () => {
      value.forEach((selected) => {
        if (parseEntityType(selected).domain === domain) {
          value.delete(selected);
        }
      });
      value.add(domain);
    };

    if (!deviceClass) {
      if (!value.delete(domain)) {
        selectDomain();
      }
    } else if (value.delete(domain)) {
      siblings.forEach((sibling) => {
        if (sibling !== key) {
          value.add(sibling);
        }
      });
    } else if (!value.delete(key)) {
      value.add(key);
      if (siblings.length && siblings.every((sibling) => value.has(sibling))) {
        selectDomain();
      }
    }

    this.value = [...value];
    fireEvent(this, "data-table-filter-changed", {
      value: this.value.length ? this.value : undefined,
      items: undefined,
    });
  }

  private _clearFilter(ev: Event) {
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
        /* The list scrolls through its own container, not through the host. */
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
          margin-inline-end: initial;
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
        /* Keeps a row that carries the chevron as tall as one that does not. */
        ha-list-item-option {
          --ha-row-item-padding-block: var(--ha-space-2);
        }
        ha-list-item-option ha-icon-button {
          --ha-icon-button-size: 32px;
        }
        .child::part(base) {
          padding-inline-start: 48px;
        }
        ha-tree-indicator {
          width: 56px;
          position: absolute;
          top: 0px;
          left: 0px;
        }
        .rtl ha-tree-indicator {
          right: 0px;
          left: initial;
          transform: scaleX(-1);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-entity-types": HaFilterEntityTypes;
  }
}
