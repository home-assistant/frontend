import type { ContextType } from "@lit/context";
import { mdiPlus, mdiTag } from "@mdi/js";
import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, html } from "lit";
import type { TemplateResult, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../common/decorators/consume";
import { transform } from "../../../common/decorators/transform";
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
import {
  apiContext,
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import type {
  HomeAssistantConnection,
  HomeAssistantInternationalization,
  ValueChangedEvent,
} from "../../../types";
import { showCategoryRegistryDetailDialog } from "./show-dialog-category-registry-detail";

const ADD_NEW_ID = "___ADD_NEW___";

@customElement("ha-category-picker")
export class HaCategoryPicker extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: (value) => value?.connection,
  })
  private _connection?: Connection;

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

  @state() private _pendingCategoryId?: string;

  private _unsubCategories?: UnsubscribeFunc;

  private _categoriesConnection?: Connection;

  private _categoriesScope?: string;

  public connectedCallback() {
    super.connectedCallback();
    this._subscribeCategories();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeCategories();
  }

  protected willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (
      changedProperties.has("scope") &&
      this.scope !== this._categoriesScope
    ) {
      this._categories = undefined;
    }
    if (
      this._pendingCategoryId &&
      changedProperties.has("_categories") &&
      this._categories?.some((c) => c.category_id === this._pendingCategoryId)
    ) {
      this._setValue(this._pendingCategoryId);
      this._pendingCategoryId = undefined;
    }
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (
      changedProperties.has("_connection") ||
      changedProperties.has("scope")
    ) {
      this._subscribeCategories();
    }
  }

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  private _subscribeCategories() {
    if (
      this._connection === this._categoriesConnection &&
      this.scope === this._categoriesScope
    ) {
      return;
    }
    this._unsubscribeCategories();
    if (!this._connection || !this.scope || !this.isConnected) {
      return;
    }
    const scope = this.scope;
    this._categoriesConnection = this._connection;
    this._categoriesScope = scope;
    this._unsubCategories = subscribeCategoryRegistry(
      this._connection,
      scope,
      (categories) => {
        if (this._categoriesScope === scope) {
          this._categories = categories;
        }
      }
    );
  }

  private _unsubscribeCategories() {
    this._unsubCategories?.();
    this._unsubCategories = undefined;
    this._categoriesConnection = undefined;
    this._categoriesScope = undefined;
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
          ${
            category.icon
              ? html`<ha-icon slot="start" .icon=${category.icon}></ha-icon>`
              : html`<ha-svg-icon slot="start" .path=${mdiTag}></ha-svg-icon>`
          }
          <span slot="headline">${category.name}</span>
        `;
      }
  );

  private _getCategories = memoizeOne(
    (
      categories: CategoryRegistryEntry[] | undefined
    ): PickerComboBoxItem[] | undefined => {
      if (!categories) {
        return undefined;
      }

      const items = categories.map<PickerComboBoxItem>((category) => ({
        id: category.category_id,
        primary: category.name,
        icon: category.icon || undefined,
        icon_path: category.icon ? undefined : mdiTag,
        sorting_label: category.name,
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
          primary: this._i18n.localize(
            "ui.components.category-picker.add_new_suggestion",
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
        primary: this._i18n.localize("ui.components.category-picker.add_new"),
        icon_path: mdiPlus,
      },
    ];
  };

  protected render(): TemplateResult {
    const valueRenderer = this._computeValueRenderer(this._categories);

    return html`
      <ha-generic-picker
        .autofocus=${this.autofocus}
        .label=${this.label}
        .placeholder=${this.placeholder}
        .value=${this.value}
        .notFoundLabel=${this._notFoundLabel}
        .emptyLabel=${this._i18n.localize(
          "ui.components.category-picker.no_categories"
        )}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .valueRenderer=${valueRenderer}
        .unknownItemText=${this._i18n.localize(
          "ui.components.category-picker.unknown"
        )}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();

    const value = ev.detail.value;

    if (!value) {
      this._setValue(undefined);
      return;
    }

    if (value.startsWith(ADD_NEW_ID)) {
      this._i18n.loadFragmentTranslation("config");

      const suggestedName = value.substring(ADD_NEW_ID.length);

      showCategoryRegistryDetailDialog(this, {
        scope: this.scope!,
        suggestedName: suggestedName,
        createEntry: async (values) => {
          const category = await createCategoryRegistryEntry(
            this._api.callWS,
            this.scope!,
            values
          );
          if (
            this._categories?.some(
              (c) => c.category_id === category.category_id
            )
          ) {
            this._setValue(category.category_id);
          } else {
            this._pendingCategoryId = category.category_id;
          }
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

  private _notFoundLabel = (search: string) =>
    this._i18n.localize("ui.components.category-picker.no_match", {
      term: html`<b>‘${search}’</b>`,
    });
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-category-picker": HaCategoryPicker;
  }
}
