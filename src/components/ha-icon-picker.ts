import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiStarFourPoints } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { AITaskController } from "../data/ai_task_controller";
import { customIcons } from "../data/custom_icons";
import type {
  IconSuggestionContext,
  IconSuggestionResult,
} from "../data/icon_suggestion";
import {
  generateIconSuggestionTask,
  normalizeSuggestedIcon,
  SHOWN_SUGGESTION_COUNT,
} from "../data/icon_suggestion";
import type { ValueChangedEvent } from "../types";
import "./ha-combo-box-item";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import "./ha-icon";
import "./ha-icon-button";
import "./skeleton/ha-skeleton-icon";
import "./skeleton/ha-skeleton-text";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

interface RankedIcon {
  item: PickerComboBoxItem;
  rank: number;
}

let ICONS: PickerComboBoxItem[] = [];
let ICONS_LOADED: Promise<void> | undefined;

interface IconData {
  name: string;
  keywords?: string[];
}

const createIconItem = (icon: IconData, prefix: string): PickerComboBoxItem => {
  const iconId = `${prefix}:${icon.name}`;
  const iconName = icon.name;
  const parts = iconName.split("-");
  const keywords = icon.keywords ?? [];
  const searchLabels: Record<string, string> = {
    iconName,
  };
  parts.forEach((part, index) => {
    searchLabels[`part${index}`] = part;
  });
  keywords.forEach((keyword, index) => {
    searchLabels[`keyword${index}`] = keyword;
  });
  return {
    id: iconId,
    primary: iconId,
    icon: iconId,
    search_labels: searchLabels,
    sorting_label: iconId,
  };
};

const LOADED_ICONSETS = new Set<string>();

const loadMdiIcons = async () => {
  const iconList = await import("../../build/mdi/iconList.json");
  ICONS = iconList.default.map((icon) => createIconItem(icon, "mdi"));
};

// Icon sets can register after the list was first loaded, for example from a
// dashboard resource, so each new picker adds the ones it does not have yet.
const loadMissingIconsets = async () => {
  const missing = Object.keys(customIcons).filter(
    (iconSet) => !LOADED_ICONSETS.has(iconSet)
  );
  if (!missing.length) {
    return;
  }
  missing.forEach((iconSet) => LOADED_ICONSETS.add(iconSet));
  const customIconItems = await Promise.all(missing.map(loadCustomIconItems));
  ICONS = [...ICONS, ...customIconItems.flat()].sort((a, b) =>
    caseInsensitiveStringCompare(a.id, b.id)
  );
};

const loadCustomIconItems = async (
  iconsetPrefix: string
): Promise<PickerComboBoxItem[]> => {
  try {
    const getIconList = customIcons[iconsetPrefix].getIconList;
    if (typeof getIconList !== "function") {
      return [];
    }
    const iconList = await getIconList();
    return iconList.map((icon) => createIconItem(icon, iconsetPrefix));
  } catch (_err) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to load icon list for ${iconsetPrefix} iconset`);
    return [];
  }
};

const SUGGESTION_PREFIX = "suggestion:";
const SUGGESTION_STATUS_ID = "___suggestion_status___";
const SUGGESTION_SKELETON_ID = "___suggestion_skeleton___";

type SuggestionState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "done"; icons: string[] };

const rowRenderer: RenderItemFunction<PickerComboBoxItem> = (item) => {
  if (item.id === SUGGESTION_SKELETON_ID) {
    return html`
      <ha-combo-box-item>
        <ha-skeleton-icon slot="start"></ha-skeleton-icon>
        <ha-skeleton-text></ha-skeleton-text>
      </ha-combo-box-item>
    `;
  }
  if (item.id === SUGGESTION_STATUS_ID) {
    return html`<ha-combo-box-item>${item.primary}</ha-combo-box-item>`;
  }
  return html`
    <ha-combo-box-item>
      <ha-icon .icon=${item.icon ?? item.id} slot="start"></ha-icon>
      ${item.icon ?? item.id}
    </ha-combo-box-item>
  `;
};

@customElement("ha-icon-picker")
export class HaIconPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean }) public invalid = false;

  // What the icon is for, so AI can suggest icons
  @property({ attribute: false })
  public suggestionContext?: IconSuggestionContext;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state() private _suggestion?: SuggestionState;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  private _getIconPickerItems = () =>
    this._itemsWithSuggestions(ICONS, this._suggestion);

  // Only created for pickers that can suggest, the others never ask for AI
  private _aiTask?: AITaskController;

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (this.suggestionContext && !this._aiTask) {
      this._aiTask = new AITaskController(this);
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_suggestion")) {
      this._picker?.refreshItems({
        scrollToTop: true,
        clearSearch: this._suggestion?.status === "loading",
      });
    }
  }

  protected render(): TemplateResult {
    const canSuggest =
      !!this.suggestionContext && !!this._aiTask?.canGenerateData;
    return html`
      <ha-generic-picker
        allow-custom-value
        no-sort
        .getItems=${this._getIconPickerItems}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .errorMessage=${this.errorMessage}
        .invalid=${this.invalid}
        .rowRenderer=${rowRenderer}
        .icon=${this._icon}
        .label=${this.label}
        .value=${this._value}
        .searchFn=${this._filterIcons}
        @value-changed=${this._valueChanged}
      >
        <slot name="start"></slot>
        ${
          canSuggest
            ? html`<ha-icon-button
                slot="search-actions"
                class=${this._suggestion?.status === "loading" ? "suggesting" : ""}
                .path=${mdiStarFourPoints}
                .label=${this._localize("ui.components.icon_picker.suggest")}
                @click=${this._suggest}
              ></ha-icon-button>`
            : nothing
        }
      </ha-generic-picker>
    `;
  }

  private _itemsWithSuggestions = memoizeOne(
    (
      icons: PickerComboBoxItem[],
      suggestion: SuggestionState | undefined
    ): (PickerComboBoxItem | string)[] => {
      if (!suggestion) {
        return icons;
      }
      let rows: PickerComboBoxItem[];
      if (suggestion.status === "loading") {
        rows = [{ id: SUGGESTION_SKELETON_ID, primary: "", disabled: true }];
      } else if (suggestion.status === "done" && suggestion.icons.length) {
        rows = suggestion.icons.map((icon) => ({
          id: `${SUGGESTION_PREFIX}${icon}`,
          primary: icon,
          icon,
        }));
      } else {
        const status =
          suggestion.status === "failed"
            ? "suggestion_failed"
            : "no_suggestions";
        rows = [
          {
            id: SUGGESTION_STATUS_ID,
            primary: this._localize(`ui.components.icon_picker.${status}`),
            disabled: true,
          },
        ];
      }
      return [
        this._localize("ui.components.icon_picker.suggested"),
        ...rows,
        this._localize("ui.components.icon_picker.all_icons"),
        ...icons,
      ];
    }
  );

  // Filter can take a significant chunk of frame (up to 3-5 ms)
  private _filterIcons = memoizeOne(
    (
      filter: string,
      filteredItems: PickerComboBoxItem[],
      _allItems: PickerComboBoxItem[]
    ): PickerComboBoxItem[] => {
      const normalizedFilter = filter.toLowerCase().replace(/\s+/g, "-");
      // The full list also holds the suggestions and their section titles
      const iconItems = ICONS.length ? ICONS : filteredItems;

      if (!normalizedFilter.length) {
        return iconItems;
      }

      const rankedItems: RankedIcon[] = [];

      // Filter and rank such that exact matches rank higher, and prefer icon name matches over keywords
      for (const item of iconItems) {
        const iconName = (item.id.split(":")[1] || item.id).toLowerCase();
        const parts = iconName.split("-");
        const keywords = item.search_labels
          ? Object.values(item.search_labels)
              .filter((v): v is string => v !== null)
              .map((v) => v.toLowerCase())
          : [];
        const id = item.id.toLowerCase();

        if (parts.includes(normalizedFilter)) {
          rankedItems.push({ item, rank: 1 });
        } else if (keywords.includes(normalizedFilter)) {
          rankedItems.push({ item, rank: 2 });
        } else if (id.includes(normalizedFilter)) {
          rankedItems.push({ item, rank: 3 });
        } else if (keywords.some((word) => word.includes(normalizedFilter))) {
          rankedItems.push({ item, rank: 4 });
        }
      }

      return rankedItems
        .sort((itemA, itemB) => itemA.rank - itemB.rank)
        .map((item) => item.item);
    }
  );

  protected firstUpdated() {
    ICONS_LOADED = (ICONS_LOADED ?? loadMdiIcons()).then(loadMissingIconsets);
    ICONS_LOADED.then(() => this._picker?.refreshItems());
  }

  private async _suggest() {
    if (!this.suggestionContext || this._suggestion?.status === "loading") {
      return;
    }
    this._suggestion = { status: "loading" };
    try {
      const task = generateIconSuggestionTask(this.suggestionContext);
      const result =
        await this._aiTask!.generateData<IconSuggestionResult>(task);
      await ICONS_LOADED;
      const existing = new Set(ICONS.map((item) => item.id));
      const icons = (result.data.icons ?? [])
        .map(normalizeSuggestedIcon)
        .filter((icon) => existing.has(icon));
      this._suggestion = {
        status: "done",
        icons: [...new Set(icons)].slice(0, SHOWN_SUGGESTION_COUNT),
      };
    } catch (_err) {
      this._suggestion = { status: "failed" };
    }
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;
    this._setValue(
      value?.startsWith(SUGGESTION_PREFIX)
        ? value.slice(SUGGESTION_PREFIX.length)
        : value
    );
  }

  private _setValue(value: string) {
    this.value = value;
    fireEvent(
      this,
      "value-changed",
      { value: this._value },
      {
        bubbles: false,
        composed: false,
      }
    );
  }

  private get _icon() {
    return this.value?.length ? this.value : this.placeholder;
  }

  private get _value() {
    return this.value || "";
  }

  static styles = css`
    ha-generic-picker {
      width: 100%;
      display: block;
    }
    ha-icon-button.suggesting {
      color: var(--primary-color);
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      50% {
        opacity: 0.4;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      ha-icon-button.suggesting {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-picker": HaIconPicker;
  }
}
