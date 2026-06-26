import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { consume, type ContextType } from "@lit/context";
import { mdiPlus, mdiShape } from "@mdi/js";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeEntityPickerDisplay } from "../../common/entity/compute_entity_name_display";
import { isValidEntityId } from "../../common/entity/valid_entity_id";
import type { RelatedIdSets } from "../../common/search/related-context";
import type { LocalizeFunc } from "../../common/translations/localize";
import {
  configContext,
  internationalizationContext,
  registriesContext,
  relatedContext,
  statesContext,
} from "../../data/context";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import {
  entityComboBoxKeys,
  getEntities,
  markEntitiesRelated,
  sortEntitiesByRelatedRank,
  type EntityComboBoxItem,
} from "../../data/entity/entity_picker";
import { domainToName } from "../../data/integration";
import type { EntitySelectorExtraOption } from "../../data/selector";
import {
  isHelperDomain,
  type HelperDomain,
} from "../../panels/config/helpers/const";
import { showHelperDetailDialog } from "../../panels/config/helpers/show-dialog-helper-detail";
import type { HomeAssistant } from "../../types";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import "../ha-icon";
import type { HaGenericPicker } from "../ha-generic-picker";
import type { PickerComboBoxSearchFn } from "../ha-picker-combo-box";
import type { PickerValueRenderer } from "../ha-picker-field";
import "../ha-svg-icon";
import "./state-badge";

const CREATE_ID = "___create-new-entity___";

@customElement("ha-entity-picker")
export class HaEntityPicker extends LitElement {
  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property({ type: Boolean, attribute: "show-entity-id" })
  public showEntityId = false;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: String, attribute: "search-label" })
  public searchLabel?: string;

  @property({ attribute: false }) public createDomains?: string[];

  /**
   * Show entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * Show only entities with these unit of measuments.
   * @type {Array}
   * @attr include-unit-of-measurement
   */
  @property({ type: Array, attribute: "include-unit-of-measurement" })
  public includeUnitOfMeasurement?: string[];

  /**
   * List of allowed entities to show.
   * @type {Array}
   * @attr include-entities
   */
  @property({ type: Array, attribute: "include-entities" })
  public includeEntities?: string[];

  /**
   * List of entities to be excluded.
   * @type {Array}
   * @attr exclude-entities
   */
  @property({ type: Array, attribute: "exclude-entities" })
  public excludeEntities?: string[];

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  /**
   * Extra options shown alongside entities. The `id` is used as the value
   * when the option is selected (it does not need to be a valid entity id).
   */
  @property({ attribute: false })
  public extraOptions?: EntitySelectorExtraOption[];

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @property({ attribute: "add-button", type: Boolean })
  public addButton = false;

  @property({ attribute: "add-button-label" }) public addButtonLabel?: string;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  @state() private _pendingEntityId?: string;

  @state()
  @consume({ context: relatedContext, subscribe: true })
  private _relatedIdSets?: RelatedIdSets;

  private get _hasRelatedContext(): boolean {
    const related = this._relatedIdSets;
    return (
      !!related &&
      (related.entities.size > 0 ||
        related.devices.size > 0 ||
        related.areas.size > 0)
    );
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (
      this._pendingEntityId &&
      changedProperties.has("_states") &&
      this._states[this._pendingEntityId]
    ) {
      this._setValue(this._pendingEntityId);
      this._pendingEntityId = undefined;
    }
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    // Load title translations so it is available when the combo-box opens
    this._i18n.loadBackendTranslation("title");
  }

  private _findExtraOption(value: string | undefined) {
    return value
      ? this.extraOptions?.find((opt) => opt.id === value)
      : undefined;
  }

  private _renderExtraOptionStart(extraOption: EntitySelectorExtraOption) {
    const stateObj = extraOption.entity_id
      ? this._states[extraOption.entity_id]
      : undefined;
    if (stateObj) {
      return html`
        <state-badge slot="start" .stateObj=${stateObj}></state-badge>
      `;
    }
    if (extraOption.icon_path) {
      return html`
        <ha-svg-icon
          slot="start"
          .path=${extraOption.icon_path}
          style="margin: 0 4px"
        ></ha-svg-icon>
      `;
    }
    if (extraOption.icon) {
      return html`<ha-icon slot="start" .icon=${extraOption.icon}></ha-icon>`;
    }
    return nothing;
  }

  private _valueRenderer: PickerValueRenderer = (value) => {
    const entityId = value || "";

    const extraOption = this._findExtraOption(entityId);
    if (extraOption) {
      return html`
        ${this._renderExtraOptionStart(extraOption)}
        <span slot="headline">${extraOption.primary}</span>
        ${extraOption.secondary
          ? html`<span slot="supporting-text">${extraOption.secondary}</span>`
          : nothing}
      `;
    }

    const stateObj = this._states[entityId];

    if (!stateObj) {
      return html`
        <ha-svg-icon
          slot="start"
          .path=${mdiShape}
          style="margin: 0 4px"
        ></ha-svg-icon>
        <span slot="headline">${entityId}</span>
      `;
    }

    const { primary, secondary } = computeEntityPickerDisplay(
      {
        ...this._registries,
        language: this._i18n.language,
        translationMetadata: this._i18n.translationMetadata,
      },
      stateObj
    );

    return html`
      <state-badge .stateObj=${stateObj} slot="start"></state-badge>
      <span slot="headline">${primary}</span>
      <span slot="supporting-text">${secondary}</span>
    `;
  };

  private get _showEntityId() {
    return this.showEntityId || this._config.userData?.showEntityIdPicker;
  }

  private _rowRenderer: RenderItemFunction<EntityComboBoxItem> = (
    item,
    index
  ) => {
    const showEntityId = this._showEntityId;

    return html`
      <ha-combo-box-item type="button" compact .borderTop=${index !== 0}>
        ${item.icon_path
          ? html`
              <ha-svg-icon
                slot="start"
                style="margin: 0 4px"
                .path=${item.icon_path}
              ></ha-svg-icon>
            `
          : html`
              <state-badge
                slot="start"
                .stateObj=${item.stateObj}
              ></state-badge>
            `}
        <span slot="headline">${item.primary}</span>
        ${item.secondary
          ? html`<span slot="supporting-text">${item.secondary}</span>`
          : nothing}
        ${item.stateObj && showEntityId
          ? html`
              <span slot="supporting-text" class="code">
                ${item.stateObj.entity_id}
              </span>
            `
          : nothing}
        ${item.domain_name && !showEntityId
          ? html`
              <div slot="trailing-supporting-text" class="domain">
                ${item.domain_name}
              </div>
            `
          : nothing}
      </ha-combo-box-item>
    `;
  };

  private _getAdditionalItems = () =>
    this._getCreateItems(this._i18n.localize, this.createDomains);

  private _getCreateItems = memoizeOne(
    (localize: LocalizeFunc, createDomains: this["createDomains"]) => {
      if (!createDomains?.length) {
        return [];
      }
      this._i18n.loadFragmentTranslation("config");
      return createDomains.map((domain) => {
        const primary = localize(
          "ui.components.entity.entity-picker.create_helper",
          {
            domain: isHelperDomain(domain)
              ? localize(
                  `ui.panel.config.helpers.types.${domain as HelperDomain}`
                ) || domain
              : domainToName(localize, domain),
          }
        );

        return {
          id: CREATE_ID + domain,
          primary: primary,
          secondary: localize("ui.components.entity.entity-picker.new_entity"),
          icon_path: mdiPlus,
        } satisfies EntityComboBoxItem;
      });
    }
  );

  private _getEntitiesMemoized = memoizeOne(
    (
      states: ContextType<typeof statesContext>,
      registries: ContextType<typeof registriesContext>,
      i18n: ContextType<typeof internationalizationContext>,
      includeDomains?: string[],
      excludeDomains?: string[],
      entityFilter?: HaEntityPickerEntityFilterFunc,
      includeDeviceClasses?: string[],
      includeUnitOfMeasurement?: string[],
      includeEntities?: string[],
      excludeEntities?: string[],
      value?: string
    ) =>
      getEntities(
        {
          states,
          ...registries,
          language: i18n.language,
          translationMetadata: i18n.translationMetadata,
          localize: i18n.localize,
        },
        {
          includeDomains,
          excludeDomains,
          entityFilter,
          includeDeviceClasses,
          includeUnitOfMeasurement,
          includeEntities,
          excludeEntities,
          value,
        }
      )
  );

  private _sortByRelatedContext = memoizeOne(
    (
      items: EntityComboBoxItem[],
      related: RelatedIdSets,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      language: string
    ): EntityComboBoxItem[] =>
      sortEntitiesByRelatedRank(
        markEntitiesRelated(items, related, entities, devices),
        language
      )
  );

  private _getItems = () => {
    const entityItems = this._getEntitiesMemoized(
      this._states,
      this._registries,
      this._i18n,
      this.includeDomains,
      this.excludeDomains,
      this.entityFilter,
      this.includeDeviceClasses,
      this.includeUnitOfMeasurement,
      this.includeEntities,
      this.excludeEntities,
      this.value
    );
    const sortedItems = this._hasRelatedContext
      ? this._sortByRelatedContext(
          entityItems,
          this._relatedIdSets!,
          this._registries.entities,
          this._registries.devices,
          this._i18n.locale.language
        )
      : entityItems;
    if (this.extraOptions?.length) {
      const resolvedExtras = this.extraOptions.map((opt) => ({
        ...opt,
        stateObj: opt.entity_id ? this._states[opt.entity_id] : undefined,
      }));
      return [...resolvedExtras, ...sortedItems];
    }
    return sortedItems;
  };

  private _shouldHideClearIcon() {
    return !!this._findExtraOption(this.value)?.hide_clear;
  }

  protected render() {
    const placeholder =
      this.placeholder ??
      this._i18n.localize("ui.components.entity.entity-picker.placeholder");

    return html`
      <ha-generic-picker
        .disabled=${this.disabled}
        .autofocus=${this.autofocus}
        .allowCustomValue=${this.allowCustomEntity}
        .required=${this.required}
        .label=${this.label}
        .placeholder=${placeholder}
        .helper=${this.helper}
        .value=${this.addButton ? undefined : this.value}
        .searchLabel=${this.searchLabel}
        .notFoundLabel=${this._notFoundLabel}
        .rowRenderer=${this._rowRenderer}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .hideClearIcon=${this.hideClearIcon || this._shouldHideClearIcon()}
        .searchFn=${this._searchFn}
        .valueRenderer=${this._valueRenderer}
        .searchKeys=${entityComboBoxKeys}
        .noSort=${this._hasRelatedContext}
        use-top-label
        .addButtonLabel=${this.addButton
          ? (this.addButtonLabel ??
            this._i18n.localize("ui.components.entity.entity-picker.add"))
          : undefined}
        .unknownItemText=${this._i18n.localize(
          "ui.components.entity.entity-picker.unknown"
        )}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _searchFn: PickerComboBoxSearchFn<EntityComboBoxItem> = (
    search,
    filteredItems
  ) => {
    // Float related items to the top by closeness, keeping search relevance
    // order within each tier.
    const items = this._hasRelatedContext
      ? sortEntitiesByRelatedRank(filteredItems)
      : filteredItems;

    // If there is exact match for entity id, put it first
    const index = items.findIndex(
      (item) => item.stateObj?.entity_id === search
    );
    if (index === -1) {
      return items;
    }

    const [exactMatch] = items.splice(index, 1);
    items.unshift(exactMatch);
    return items;
  };

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  private _valueChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (!value) {
      this._setValue(undefined);
      return;
    }

    if (value.startsWith(CREATE_ID)) {
      const domain = value.substring(CREATE_ID.length);

      showHelperDetailDialog(this, {
        domain,
        dialogClosedCallback: (item) => {
          if (item.entityId) {
            if (this._states[item.entityId]) {
              this._setValue(item.entityId);
            } else {
              this._pendingEntityId = item.entityId;
            }
          }
        },
      });
      return;
    }

    if (!isValidEntityId(value) && !this._findExtraOption(value)) {
      return;
    }

    this._setValue(value);
  }

  private _setValue(value: string | undefined) {
    this.value = value;

    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }

  private _notFoundLabel = (search: string) =>
    this._i18n.localize("ui.components.entity.entity-picker.no_match", {
      term: html`<b>‘${search}’</b>`,
    });
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-picker": HaEntityPicker;
  }
}
