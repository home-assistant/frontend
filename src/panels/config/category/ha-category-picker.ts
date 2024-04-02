import { mdiTag } from "@mdi/js";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../../../common/string/filter/sequence-matching";
import "../../../components/ha-combo-box";
import type { HaComboBox } from "../../../components/ha-combo-box";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import {
  CategoryRegistryEntry,
  createCategoryRegistryEntry,
  subscribeCategoryRegistry,
} from "../../../data/category_registry";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, ValueChangedEvent } from "../../../types";
import { showCategoryRegistryDetailDialog } from "./show-dialog-category-registry-detail";

type ScorableCategoryRegistryEntry = ScorableTextItem & CategoryRegistryEntry;

const ADD_NEW_ID = "___ADD_NEW___";
const NO_CATEGORIES_ID = "___NO_CATEGORIES___";
const ADD_NEW_SUGGESTION_ID = "___ADD_NEW_SUGGESTION___";

const rowRenderer: ComboBoxLitRenderer<CategoryRegistryEntry> = (item) =>
  html`<ha-list-item
    graphic="icon"
    class=${classMap({ "add-new": item.category_id === ADD_NEW_ID })}
  >
    ${item.icon
      ? html`<ha-icon slot="graphic" .icon=${item.icon}></ha-icon>`
      : html`<ha-svg-icon .path=${mdiTag} slot="graphic"></ha-svg-icon>`}
    ${item.name}
  </ha-list-item>`;

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

  @state() private _opened?: boolean;

  @state() private _categories?: CategoryRegistryEntry[];

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  protected hassSubscribeRequiredHostProps = ["scope"];

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

  private _suggestion?: string;

  private _init = false;

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  private _getCategories = memoizeOne(
    (
      categories: CategoryRegistryEntry[] | undefined,
      noAdd: this["noAdd"]
    ): CategoryRegistryEntry[] => {
      const result = categories ? [...categories] : [];
      if (!result?.length) {
        result.push({
          category_id: NO_CATEGORIES_ID,
          name: this.hass.localize(
            "ui.components.category-picker.no_categories"
          ),
          icon: null,
        });
      }

      return noAdd
        ? result
        : [
            ...result,
            {
              category_id: ADD_NEW_ID,
              name: this.hass.localize("ui.components.category-picker.add_new"),
              icon: "mdi:plus",
            },
          ];
    }
  );

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this.hass && this._categories) ||
      (this._init && changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      const categories = this._getCategories(this._categories, this.noAdd).map(
        (label) => ({
          ...label,
          strings: [label.name],
        })
      );
      this.comboBox.items = categories;
      this.comboBox.filteredItems = categories;
    }
  }

  protected render() {
    if (!this._categories) {
      return nothing;
    }
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .helper=${this.helper}
        item-value-path="category_id"
        item-id-path="category_id"
        item-label-path="name"
        .value=${this._value}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.category-picker.category")
          : this.label}
        .placeholder=${this.placeholder}
        .renderer=${rowRenderer}
        @filter-changed=${this._filterChanged}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._categoryChanged}
      >
      </ha-combo-box>
    `;
  }

  private _filterChanged(ev: CustomEvent): void {
    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value;
    if (!filterString) {
      this.comboBox.filteredItems = this.comboBox.items;
      return;
    }

    const filteredItems = fuzzyFilterSort<ScorableCategoryRegistryEntry>(
      filterString,
      target.items?.filter(
        (item) => ![NO_CATEGORIES_ID, ADD_NEW_ID].includes(item.category_id)
      ) || []
    );
    if (filteredItems?.length === 0) {
      if (this.noAdd) {
        this.comboBox.filteredItems = [
          {
            category_id: NO_CATEGORIES_ID,
            name: this.hass.localize("ui.components.category-picker.no_match"),
            icon: null,
          },
        ] as ScorableCategoryRegistryEntry[];
      } else {
        this._suggestion = filterString;
        this.comboBox.filteredItems = [
          {
            category_id: ADD_NEW_SUGGESTION_ID,
            name: this.hass.localize(
              "ui.components.category-picker.add_new_sugestion",
              { name: this._suggestion }
            ),
            icon: "mdi:plus",
          },
        ];
      }
    } else {
      this.comboBox.filteredItems = filteredItems;
    }
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _categoryChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;

    if (newValue === NO_CATEGORIES_ID) {
      newValue = "";
      this.comboBox.setInputValue("");
      return;
    }

    if (![ADD_NEW_SUGGESTION_ID, ADD_NEW_ID].includes(newValue)) {
      if (newValue !== this._value) {
        this._setValue(newValue);
      }
      return;
    }

    (ev.target as any).value = this._value;

    this.hass.loadFragmentTranslation("config");

    showCategoryRegistryDetailDialog(this, {
      scope: this.scope!,
      suggestedName: newValue === ADD_NEW_SUGGESTION_ID ? this._suggestion : "",
      createEntry: async (values) => {
        const category = await createCategoryRegistryEntry(
          this.hass,
          this.scope!,
          values
        );
        this._categories = [...this._categories!, category];
        this.comboBox.filteredItems = this._getCategories(
          this._categories,
          this.noAdd
        );
        await this.updateComplete;
        await this.comboBox.updateComplete;
        this._setValue(category.category_id);
        return category;
      },
    });

    this._suggestion = undefined;
    this.comboBox.setInputValue("");
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
