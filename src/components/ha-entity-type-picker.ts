import type { ContextType } from "@lit/context";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { fireEvent } from "../common/dom/fire_event";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { computeRTL } from "../common/util/compute_rtl";
import { internationalizationContext, statesContext } from "../data/context";
import { NO_DEVICE_CLASS } from "../data/entity/device_class";
import {
  computeEntityTypeNames,
  entityTypeKey,
  FIXED_ENTITY_TYPE_ICONS,
  parseEntityType,
  sortDeviceClasses,
  usedEntityTypes,
} from "../data/entity/entity_type";
import { domainToName } from "../data/integration";
import "./chips/ha-chip-set";
import "./chips/ha-input-chip";
import "./ha-combo-box-item";
import "./ha-domain-icon";
import "./ha-generic-picker";
import type {
  PickerComboBoxItem,
  PickerComboBoxSearchFn,
} from "./ha-picker-combo-box";
import { DEFAULT_SEARCH_KEYS } from "./ha-picker-combo-box";
import "./ha-tree-indicator";

interface EntityTypeComboBoxItem extends PickerComboBoxItem {
  last?: boolean;
}

const SEARCH_KEYS = [
  ...DEFAULT_SEARCH_KEYS,
  { name: "search_labels.domain", weight: 5 },
];

const isDeviceClassOf = (
  item: PickerComboBoxItem | undefined,
  domain: string
) => {
  if (!item) {
    return false;
  }
  const type = parseEntityType(item.id);
  return type.domain === domain && type.deviceClass !== undefined;
};

// Flags the last device class of each domain so its tree line ends there.
const markLastDeviceClasses = (
  items: PickerComboBoxItem[]
): EntityTypeComboBoxItem[] =>
  items.map((item, index) => {
    const { domain, deviceClass } = parseEntityType(item.id);
    if (!deviceClass) {
      return item;
    }
    return { ...item, last: !isDeviceClassOf(items[index + 1], domain) };
  });

@customElement("ha-entity-type-picker")
export class HaEntityTypePicker extends LitElement {
  @property({ attribute: false }) public value?: string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @consume({ context: statesContext, subscribe: true })
  private _states?: ContextType<typeof statesContext>;

  private _titlesLoaded = false;

  protected willUpdate() {
    if (this._titlesLoaded || !this._i18n) {
      return;
    }
    this._titlesLoaded = true;
    this._i18n.loadBackendTranslation("title");
  }

  private _chipLabels = memoizeOne(computeEntityTypeNames);

  private _items = memoizeOne(
    (
      states: ContextType<typeof statesContext>,
      localize: LocalizeFunc,
      language: string
    ): PickerComboBoxItem[] => {
      // A section keeps following its types, so a device class is offered even
      // when it is the only one of its domain today.
      const types = usedEntityTypes(states, false);
      const domains = [...types.keys()]
        .map((domain) => ({ domain, name: domainToName(localize, domain) }))
        .sort((a, b) => stringCompare(a.name, b.name, language));

      return domains.flatMap(({ domain, name }) => [
        { id: domain, primary: name },
        ...sortDeviceClasses(
          localize,
          domain,
          types
            .get(domain)!
            .filter((deviceClass) => deviceClass !== NO_DEVICE_CLASS),
          language
        ).map(({ deviceClass, name: deviceClassName }) => ({
          id: entityTypeKey(domain, deviceClass),
          primary: deviceClassName,
          search_labels: { domain: name },
        })),
      ]);
    }
  );

  private _availableItems = memoizeOne(
    (items: PickerComboBoxItem[], value: string[]) => {
      const selectedDomains = new Set(
        value.filter((key) => !parseEntityType(key).deviceClass)
      );
      return markLastDeviceClasses(
        items.filter(
          (item) =>
            !value.includes(item.id) &&
            !selectedDomains.has(parseEntityType(item.id).domain)
        )
      );
    }
  );

  private _getItems = () => {
    if (!this._states || !this._i18n) {
      return [];
    }
    const items = this._items(
      this._states,
      this._i18n.localize,
      this._i18n.locale.language
    );
    return this._availableItems(items, this.value ?? []);
  };

  // Keeps the domain above the device classes that match, so the tree stays
  // readable while searching, and lists the domains by their best match.
  // Items the search adds itself, like the "no match" placeholder, are kept
  // after the list.
  private _searchFn: PickerComboBoxSearchFn<PickerComboBoxItem> = (
    _search,
    filteredItems,
    allItems
  ) => {
    const matchedIds = new Set(filteredItems.map((item) => item.id));
    const matchedDomains = new Set(
      filteredItems.map((item) => parseEntityType(item.id).domain)
    );
    const ordered = [...matchedDomains].flatMap((matchedDomain) =>
      allItems.filter((item) => {
        const { domain, deviceClass } = parseEntityType(item.id);
        return (
          domain === matchedDomain && (!deviceClass || matchedIds.has(item.id))
        );
      })
    );
    const allIds = new Set(allItems.map((item) => item.id));
    const extras = filteredItems.filter((item) => !allIds.has(item.id));
    return [...markLastDeviceClasses(ordered), ...extras];
  };

  private _rowRenderer: RenderItemFunction<EntityTypeComboBoxItem> = (item) => {
    const { deviceClass } = parseEntityType(item.id);
    const rtl = this._i18n
      ? computeRTL(
          this._i18n.language,
          this._i18n.translationMetadata.translations
        )
      : false;
    return html`
      <ha-combo-box-item
        style=${
          deviceClass
            ? "--ha-combo-box-item-padding-inline-start: var(--ha-space-12);"
            : ""
        }
      >
        ${
          deviceClass
            ? html`
                <ha-tree-indicator
                  style=${styleMap({
                    width: "var(--ha-space-12)",
                    position: "absolute",
                    top: "0",
                    height: "100%",
                    left: rtl ? undefined : "var(--ha-space-1)",
                    right: rtl ? "var(--ha-space-1)" : undefined,
                    transform: rtl ? "scaleX(-1)" : "",
                  })}
                  .end=${item.last}
                  slot="start"
                ></ha-tree-indicator>
              `
            : nothing
        }
        ${this._renderIcon(item.id, "start")}
        <span slot="headline">${item.primary}</span>
      </ha-combo-box-item>
    `;
  };

  private _renderIcon(key: string, slot: "start" | "icon") {
    const { domain, deviceClass } = parseEntityType(key);
    return html`
      <ha-domain-icon
        slot=${slot}
        .icon=${FIXED_ENTITY_TYPE_ICONS[key]}
        .domain=${domain}
        .deviceClass=${deviceClass}
        .state=${domain === "binary_sensor" ? "on" : undefined}
        ?brand-fallback=${!deviceClass}
      ></ha-domain-icon>
    `;
  }

  protected render() {
    const localize = this._i18n?.localize;
    const value = this.value ?? [];
    const chipLabels = localize ? this._chipLabels(localize, value) : undefined;

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      ${
        value.length && chipLabels
          ? html`
              <ha-chip-set>
                ${repeat(
                  value,
                  (key) => key,
                  (key) => {
                    const label = chipLabels.get(key)!;
                    return html`
                      <ha-input-chip
                        data-key=${key}
                        .label=${label}
                        .disabled=${this.disabled}
                        @remove=${this._removeItem}
                        selected
                      >
                        ${this._renderIcon(key, "icon")} ${label}
                      </ha-input-chip>
                    `;
                  }
                )}
              </ha-chip-set>
            `
          : nothing
      }
      <ha-generic-picker
        .helper=${this.helper}
        .disabled=${this.disabled}
        .value=${""}
        .addButtonLabel=${localize?.("ui.components.entity-type-picker.add")}
        .getItems=${this._getItems}
        .rowRenderer=${this._rowRenderer}
        .searchFn=${this._searchFn}
        .searchKeys=${SEARCH_KEYS}
        .emptyLabel=${localize?.("ui.components.entity-type-picker.no_types")}
        no-sort
        @value-changed=${this._itemAdded}
      ></ha-generic-picker>
    `;
  }

  private _itemAdded(ev: CustomEvent<{ value?: string }>) {
    ev.stopPropagation();
    const key = ev.detail.value;
    if (!key) {
      return;
    }
    const { domain, deviceClass } = parseEntityType(key);
    const value = (this.value ?? []).filter(
      (selected) => deviceClass || parseEntityType(selected).domain !== domain
    );
    this._setValue([...value, key]);
  }

  private _removeItem(ev: Event) {
    ev.stopPropagation();
    const key = (ev.currentTarget as HTMLElement).dataset.key;
    this._setValue((this.value ?? []).filter((selected) => selected !== key));
  }

  private _setValue(value: string[]) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    :host {
      display: block;
    }
    label {
      display: block;
      margin-bottom: var(--ha-space-2);
      font-weight: var(--ha-font-weight-medium);
    }
    ha-generic-picker {
      display: block;
      width: 100%;
    }
    ha-chip-set {
      padding: var(--ha-space-2) 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-type-picker": HaEntityTypePicker;
  }
}
