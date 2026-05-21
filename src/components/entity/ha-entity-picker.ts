import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiPlus, mdiShape } from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import { computeEntityPickerDisplay } from "../../common/entity/compute_entity_name_display";
import { isValidEntityId } from "../../common/entity/valid_entity_id";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import {
  entityComboBoxKeys,
  getEntities,
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
import "../ha-button";
import "../ha-combo-box-item";
import "../ha-icon";
import "../ha-picker-field";
import type { PickerValueRenderer } from "../ha-picker-field";
import "../ha-picker-popover";
import "../ha-picker-search-list";
import type { PickerSearchFn } from "../ha-picker-search-list";
import "../ha-svg-icon";
import "./state-badge";

@customElement("ha-entity-picker")
export class HaEntityPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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

  @query(".trigger") private _trigger?: HTMLElement;

  @state() private _pickerOpen = false;

  @state() private _pendingEntityId?: string;

  // Commit fires on @closed (after the hide animation) to avoid flicker.
  private _pendingValue?: string;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (
      this._pendingEntityId &&
      changedProperties.has("hass") &&
      this.hass.states !== changedProperties.get("hass")?.states &&
      this.hass.states[this._pendingEntityId]
    ) {
      this._setValue(this._pendingEntityId);
      this._pendingEntityId = undefined;
    }
  }

  protected firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    // Load title translations so it is available when the combo-box opens
    this.hass.loadBackendTranslation("title");
  }

  private _findExtraOption(value: string | undefined) {
    return value
      ? this.extraOptions?.find((opt) => opt.id === value)
      : undefined;
  }

  private _renderExtraOptionStart(extraOption: EntitySelectorExtraOption) {
    const stateObj = extraOption.entity_id
      ? this.hass.states[extraOption.entity_id]
      : undefined;
    if (stateObj) {
      return html`
        <state-badge
          slot="start"
          .stateObj=${stateObj}
          .hass=${this.hass}
        ></state-badge>
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

    const stateObj = this.hass.states[entityId];

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
      this.hass,
      stateObj
    );

    return html`
      <state-badge
        .hass=${this.hass}
        .stateObj=${stateObj}
        slot="start"
      ></state-badge>
      <span slot="headline">${primary}</span>
      <span slot="supporting-text">${secondary}</span>
    `;
  };

  private get _showEntityId() {
    return this.showEntityId || this.hass.userData?.showEntityIdPicker;
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
                .hass=${this.hass}
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

  private _getCreateActions = memoizeOne(
    (
      localize: this["hass"]["localize"],
      createDomains: this["createDomains"]
    ): EntityComboBoxItem[] => {
      if (!createDomains?.length) {
        return [];
      }
      this.hass.loadFragmentTranslation("config");
      return createDomains.map((domain) => ({
        id: `__create-helper__${domain}`,
        primary: localize("ui.components.entity.entity-picker.create_helper", {
          domain: isHelperDomain(domain)
            ? localize(
                `ui.panel.config.helpers.types.${domain as HelperDomain}`
              ) || domain
            : domainToName(localize, domain),
        }),
        secondary: localize("ui.components.entity.entity-picker.new_entity"),
        icon_path: mdiPlus,
        onSelect: ({ close }) => {
          close();
          this._openCreateHelper(domain);
        },
      }));
    }
  );

  private _openCreateHelper(domain: string) {
    showHelperDetailDialog(this, {
      domain,
      dialogClosedCallback: (item) => {
        if (!item.entityId) return;
        if (this.hass.states[item.entityId]) {
          this._setValue(item.entityId);
        } else {
          this._pendingEntityId = item.entityId;
        }
      },
    });
  }

  private _getEntitiesMemoized = memoizeOne(getEntities);

  private _getItems = () => {
    const items = this._getEntitiesMemoized(
      this.hass,
      this.includeDomains,
      this.excludeDomains,
      this.entityFilter,
      this.includeDeviceClasses,
      this.includeUnitOfMeasurement,
      this.includeEntities,
      this.excludeEntities,
      this.value
    );
    if (this.extraOptions?.length) {
      const resolvedExtras = this.extraOptions.map((opt) => ({
        ...opt,
        stateObj: opt.entity_id ? this.hass.states[opt.entity_id] : undefined,
      }));
      return [...resolvedExtras, ...items];
    }
    return items;
  };

  private _shouldHideClearIcon() {
    return !!this._findExtraOption(this.value)?.hide_clear;
  }

  protected render() {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.entity.entity-picker.placeholder");
    const items = this._getItems();
    const actions = this._getCreateActions(
      this.hass.localize,
      this.createDomains
    );
    const hideClearIcon = this.hideClearIcon || this._shouldHideClearIcon();

    return html`
      <div class="picker">
        <div class="trigger" @click=${this._openPicker}>
          <slot name="trigger">
            <ha-picker-field
              type="button"
              compact
              .label=${this.label}
              .placeholder=${placeholder}
              .value=${this.value}
              .valueRenderer=${this._valueRenderer}
              .required=${this.required}
              .disabled=${this.disabled}
              .helper=${this.helper}
              .hideClearIcon=${hideClearIcon}
              ?autofocus=${this.autofocus}
              @clear=${this._clear}
            ></ha-picker-field>
          </slot>
        </div>
        <ha-picker-popover
          .open=${this._pickerOpen}
          .anchor=${this._trigger ?? null}
          .label=${this.label ?? ""}
          @closed=${this._handlePickerClosed}
        >
          <ha-picker-search-list
            autofocus
            .items=${items}
            .value=${this.value}
            .searchKeys=${entityComboBoxKeys}
            .searchFn=${this._searchFn}
            .rowRenderer=${this._rowRenderer}
            .actions=${actions}
            .searchPlaceholder=${this.searchLabel ??
            this.hass.localize("ui.common.search")}
            .notFoundLabel=${this._notFoundLabel}
            @item-selected=${this._handleItemSelected}
          ></ha-picker-search-list>
        </ha-picker-popover>
      </div>
    `;
  }

  private _searchFn: PickerSearchFn<EntityComboBoxItem> = (
    search,
    filteredItems
  ) => {
    const index = filteredItems.findIndex(
      (item) => item.stateObj?.entity_id === search
    );
    if (index === -1) {
      return filteredItems;
    }
    const [exactMatch] = filteredItems.splice(index, 1);
    filteredItems.unshift(exactMatch);
    return filteredItems;
  };

  public async open() {
    await this.updateComplete;
    this._openPicker();
  }

  private _openPicker = () => {
    if (this.disabled) return;
    this._pickerOpen = true;
  };

  private _handlePickerClosed = () => {
    if (this._pendingValue !== undefined) {
      const pending = this._pendingValue;
      this._pendingValue = undefined;
      this._setValue(pending);
    }
    this._pickerOpen = false;
  };

  private _handleItemSelected = (
    ev: HASSDomEvent<{ id: string; index: number; newTab?: boolean }>
  ) => {
    ev.stopPropagation();
    const value = ev.detail.id;
    if (!isValidEntityId(value) && !this._findExtraOption(value)) {
      this._pickerOpen = false;
      return;
    }
    this._pendingValue = value;
    this._pickerOpen = false;
  };

  private _clear() {
    this._setValue(undefined);
  }

  private _setValue(value: string | undefined) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }

  private _notFoundLabel = (search: string) =>
    this.hass.localize("ui.components.entity.entity-picker.no_match", {
      term: html`<b>‘${search}’</b>`,
    });

  static styles = css`
    :host {
      display: block;
    }
    .picker {
      position: relative;
    }
    ha-picker-field {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-picker": HaEntityPicker;
  }
}
