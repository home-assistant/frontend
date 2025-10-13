import { mdiTag, mdiPlus } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-generic-picker";
import type { HaGenericPicker } from "../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import type { PickerValueRenderer } from "../../../components/ha-picker-field";
import "../../../components/ha-svg-icon";
import type { CategoryRegistryEntry } from "../../../data/category_registry";
import {
  createCategoryRegistryEntry,
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { showCategoryRegistryDetailDialog } from "./show-dialog-category-registry-detail";

const ADD_NEW_ID = "___ADD_NEW___";
const NO_CATEGORIES_ID = "___NO_CATEGORIES___";

@customElement("ha-category-picker")
export class HaCategoryPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public scope?: string;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() private _categories?: CategoryRegistryEntry[];

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  protected hassSubscribeRequiredHostProps = ["scope"];

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeCategoryRegistry(
        this.hass.connection,
        this.scope!,
        (categories) => {
          this._categories = categories;
        }
      ),
    ];
  }

  private _categoryMap = memoizeOne(
    (
      categories: CategoryRegistryEntry[] | undefined
    ): Map<string, CategoryRegistryEntry> => {
      if (!categories) {
        return new Map();
      }
      return new Map(
        categories.map((category) => [category.category_id, category])
      );
    }
  );

  private _computeValueRenderer = memoizeOne(
    (categories: CategoryRegistryEntry[] | undefined): PickerValueRenderer =>
      (value) => {
        const category = this._categoryMap(categories).get(value);

        if (!category) {
          return html`
            <ha-svg-icon slot="start" .path=${mdiTag}></ha-svg-icon>
            <span slot="headline">${value}</span>
          `;
        }

        return html`
          ${category.icon
            ? html`<ha-icon slot="start" .icon=${category.icon}></ha-icon>`
            : html`<ha-svg-icon slot="start" .path=${mdiTag}></ha-svg-icon>`}
          <span slot="headline">${category.name}</span>
        `;
      }
  );

  private _getCategories = memoizeOne(
    (categories: CategoryRegistryEntry[] | undefined): PickerComboBoxItem[] => {
      if (!categories || categories.length === 0) {
        return [
          {
            id: NO_CATEGORIES_ID,
            primary: this.hass.localize(
              "ui.components.category-picker.no_categories"
            ),
            icon_path: mdiTag,
          },
        ];
      }

      const items = categories.map<PickerComboBoxItem>((category) => ({
        id: category.category_id,
        primary: category.name,
        icon: category.icon || undefined,
        icon_path: category.icon ? undefined : mdiTag,
        sorting_label: category.name,
        search_labels: [category.name, category.category_id].filter(
          (v): v is string => Boolean(v)
        ),
      }));

      return items;
    }
  );

  private _getItems = () => this._getCategories(this._categories);

  private _allCategoryNames = memoizeOne(
    (categories?: CategoryRegistryEntry[]) => {
      if (!categories) {
        return [];
      }
      return [
        ...new Set(
          categories
            .map((category) => category.name.toLowerCase())
            .filter(Boolean) as string[]
        ),
      ];
    }
  );

  private _getAdditionalItems = (
    searchString?: string
  ): PickerComboBoxItem[] => {
    if (this.noAdd) {
      return [];
    }

    const allCategoryNames = this._allCategoryNames(this._categories);

    if (
      searchString &&
      !allCategoryNames.includes(searchString.toLowerCase())
    ) {
      return [
        {
          id: ADD_NEW_ID + searchString,
          primary: this.hass.localize(
            "ui.components.category-picker.add_new_sugestion",
            {
              name: searchString,
            }
          ),
          icon_path: mdiPlus,
        },
      ];
    }

    return [
      {
        id: ADD_NEW_ID,
        primary: this.hass.localize("ui.components.category-picker.add_new"),
        icon_path: mdiPlus,
      },
    ];
  };

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.category-picker.category");

    const valueRenderer = this._computeValueRenderer(this._categories);

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .notFoundLabel=${this.hass.localize(
          "ui.components.category-picker.no_match"
        )}
        .placeholder=${placeholder}
        .value=${this.value}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .valueRenderer=${valueRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();

    const value = ev.detail.value;

    if (value === NO_CATEGORIES_ID) {
      return;
    }

    if (!value) {
      this._setValue(undefined);
      return;
    }

    if (value.startsWith(ADD_NEW_ID)) {
      this.hass.loadFragmentTranslation("config");

      const suggestedName = value.substring(ADD_NEW_ID.length);

      showCategoryRegistryDetailDialog(this, {
        scope: this.scope!,
        suggestedName: suggestedName,
        createEntry: async (values) => {
          const category = await createCategoryRegistryEntry(
            this.hass,
            this.scope!,
            values
          );
          this._setValue(category.category_id);
          return category;
        },
      });

      return;
    }

    this._setValue(value);
  }

  private _setValue(value?: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-category-picker": HaCategoryPicker;
  }
}
