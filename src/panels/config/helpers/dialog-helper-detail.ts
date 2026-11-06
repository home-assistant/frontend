import { mdiAlertOutline } from "@mdi/js";
import Fuse from "fuse.js";
import type { HassConfig } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { stringCompare } from "../../../common/string/compare";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-area-picker";
import "../../../components/ha-button";
import "../../../components/ha-combo-box-item";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-domain-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-picker-combo-box";
import type {
  HaPickerComboBox,
  PickerComboBoxIndexSelectedDetail,
  PickerComboBoxItem,
} from "../../../components/ha-picker-combo-box";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { getConfigFlowHandlers } from "../../../data/config_flow";
import { createCounter } from "../../../data/counter";
import {
  fetchEntityRegistry,
  getExtendedEntityRegistryEntry,
  updateEntitiesArea,
  type EntityRegistryEntry,
} from "../../../data/entity/entity_registry";
import { createInputBoolean } from "../../../data/input_boolean";
import { createInputButton } from "../../../data/input_button";
import { createInputDateTime } from "../../../data/input_datetime";
import { createInputNumber } from "../../../data/input_number";
import { createInputSelect } from "../../../data/input_select";
import { createInputText } from "../../../data/input_text";
import {
  domainToName,
  fetchIntegrationManifest,
  type IntegrationManifest,
} from "../../../data/integration";
import { createSchedule } from "../../../data/schedule";
import { createTimer } from "../../../data/timer";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../../../resources/fuseMultiTerm";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import type {
  Helper,
  HelperCategory,
  HelperDomain,
  HelperFormItem,
} from "./const";
import {
  getHelperCategory,
  HELPER_CATEGORIES,
  isHelperDomain,
  isKnownHelperDomain,
} from "./const";
import type { ShowDialogHelperDetailParams } from "./show-dialog-helper-detail";

type HelperCreators = Record<
  HelperDomain,
  {
    create: (
      hass: HomeAssistant,
      // Not properly typed because there is currently a mismatch for this._item between:
      // 1. Type passed to form should be Helper
      // 2. Type received by creator should be MutableParams version
      // The two are not compatible.
      params: any
    ) => Promise<Helper>;
    import: () => Promise<unknown>;
    alias?: string[];
  }
>;

const HELPERS: HelperCreators = {
  input_boolean: {
    create: createInputBoolean,
    import: () => import("./forms/ha-input_boolean-form"),
    alias: ["switch", "toggle"],
  },
  input_button: {
    create: createInputButton,
    import: () => import("./forms/ha-input_button-form"),
  },
  input_text: {
    create: createInputText,
    import: () => import("./forms/ha-input_text-form"),
  },
  input_number: {
    create: createInputNumber,
    import: () => import("./forms/ha-input_number-form"),
  },
  input_datetime: {
    create: createInputDateTime,
    import: () => import("./forms/ha-input_datetime-form"),
  },
  input_select: {
    create: createInputSelect,
    import: () => import("./forms/ha-input_select-form"),
    alias: ["select", "dropdown"],
  },
  counter: {
    create: createCounter,
    import: () => import("./forms/ha-counter-form"),
  },
  timer: {
    create: createTimer,
    import: () => import("./forms/ha-timer-form"),
    alias: ["countdown"],
  },
  schedule: {
    create: createSchedule,
    import: () => import("./forms/ha-schedule-form"),
  },
};

interface HelperPickerItem extends PickerComboBoxItem {
  category: HelperCategory;
  loaded: boolean;
}

const HELPER_SEARCH_KEYS: FuseWeightedKey[] = [
  { name: "primary", weight: 10 },
  { name: "search_labels.aliases", weight: 8 },
  { name: "id", weight: 4 },
  { name: "secondary", weight: 2 },
];

@customElement("dialog-helper-detail")
export class DialogHelperDetail extends DirtyStateProviderMixin<
  { item?: HelperFormItem; area?: string } | undefined
>()(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _item?: HelperFormItem;

  @state() private _area?: string;

  @state() private _open = false;

  @state() private _shown = false;

  @state() private _domain?: string;

  @state() private _error?: string;

  @state() private _submitting = false;

  @state() private _helperFlows?: string[];

  @state() private _loading = false;

  private _category?: HelperCategory;

  @query("ha-picker-combo-box") private _comboBox?: HaPickerComboBox;

  private _pendingConfigFlow?: {
    startFlowHandler: string;
    manifest: IntegrationManifest;
    dialogClosedCallback?: ShowDialogHelperDetailParams["dialogClosedCallback"];
    navigateToResult?: boolean;
  };

  private _params?: ShowDialogHelperDetailParams;

  public async showDialog(params: ShowDialogHelperDetailParams): Promise<void> {
    this._params = params;
    this._domain = params.domain;
    this._item = params.item;
    this._area = undefined;
    this._category = undefined;
    if (this._domain && this._domain in HELPERS) {
      this._loading = true;
      try {
        await HELPERS[this._domain].import();
        this._initDirtyTracking(
          { type: "deep" },
          { item: this._item, area: undefined }
        );
      } finally {
        this._loading = false;
      }
    }
    this._open = true;
    await this.updateComplete;
    this.hass.loadFragmentTranslation("config");
    const flows = await getConfigFlowHandlers(this.hass, "helper");
    await this.hass.loadBackendTranslation("title", flows, true);
    // Ensure the titles are loaded before we render the flows.
    this._helperFlows = flows;

    await this.updateComplete;
    this._focusPicker();
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    const oldHass = changedProps.get("hass");
    if (
      oldHass &&
      (oldHass.localize !== this.hass.localize ||
        oldHass.config !== this.hass.config)
    ) {
      this._comboBox?.refreshItems();
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogShown(ev: Event): void {
    if (ev.eventPhase !== Event.AT_TARGET) {
      return;
    }
    this._shown = true;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._shown = false;
    this._error = undefined;
    this._domain = undefined;
    this._params = undefined;
    this._category = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });

    if (this._pendingConfigFlow) {
      const pendingConfigFlow = this._pendingConfigFlow;
      this._pendingConfigFlow = undefined;
      showConfigFlowDialog(this, {
        startFlowHandler: pendingConfigFlow.startFlowHandler,
        manifest: pendingConfigFlow.manifest,
        dialogClosedCallback: pendingConfigFlow.dialogClosedCallback,
        navigateToResult: pendingConfigFlow.navigateToResult,
      });
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    let content: TemplateResult;
    let footer: TemplateResult | typeof nothing = nothing;
    let showPicker = false;

    if (this._domain && !this._loading) {
      content = html`
        <div class="form" @value-changed=${this._valueChanged}>
          ${this._error ? html`<div class="error">${this._error}</div>` : ""}
          ${dynamicElement(`ha-${this._domain}-form`, {
            hass: this.hass,
            item: this._item,
            new: true,
            autofocus: true,
          })}
          <ha-area-picker
            .value=${this._area}
            .disabled=${this._submitting}
            @value-changed=${this._areaChanged}
          ></ha-area-picker>
        </div>
      `;
      footer = html`
        <ha-dialog-footer slot="footer">
          ${
            this._params?.domain
              ? nothing
              : html`<ha-button
                  slot="secondaryAction"
                  appearance="plain"
                  @click=${this._goBack}
                  .disabled=${this._submitting}
                >
                  ${this.hass!.localize("ui.common.back")}
                </ha-button>`
          }
          <ha-button
            slot="primaryAction"
            @click=${this._createItem}
            .disabled=${this._submitting}
          >
            ${this.hass!.localize("ui.panel.config.helpers.dialog.create")}
          </ha-button>
        </ha-dialog-footer>
      `;
    } else if (this._loading || this._helperFlows === undefined) {
      content = html`<ha-spinner></ha-spinner>`;
    } else {
      showPicker = true;
      content = html`
        <ha-picker-combo-box
          autofocus
          mode="dialog"
          .shown=${this._shown}
          no-sort
          .label=${this.hass.localize(
            "ui.panel.config.integrations.search_helper"
          )}
          .getItems=${this._getItems}
          .rowRenderer=${this._renderHelperRow}
          .sections=${this._getSections(
            this._helperFlows,
            this.hass.localize,
            this.hass.config,
            this.hass.locale.language
          )}
          .selectedSection=${this._category}
          @index-selected=${this._helperPicked}
        ></ha-picker-combo-box>
      `;
    }

    return html`
      <ha-dialog
        class=${showPicker ? "picker" : ""}
        .flexContent=${showPicker}
        .open=${this._open}
        .preventScrimClose=${this.isDirtyState}
        header-title=${
          this._domain
            ? this.hass.localize(
                "ui.panel.config.helpers.dialog.create_platform",
                {
                  platform:
                    (isHelperDomain(this._domain) &&
                      this.hass.localize(
                        `ui.panel.config.helpers.types.${
                          this._domain as HelperDomain
                        }`
                      )) ||
                    this._domain,
                }
              )
            : this.hass.localize("ui.panel.config.helpers.dialog.create_helper")
        }
        @after-show=${this._dialogShown}
        @closed=${this._dialogClosed}
      >
        ${content} ${footer}
      </ha-dialog>
    `;
  }

  private _getHelperItems = memoizeOne(
    (
      flowHelpers: string[],
      localize: LocalizeFunc,
      config: HassConfig,
      language: string
    ): HelperPickerItem[] => {
      const domains = [
        ...(Object.keys(HELPERS) as HelperDomain[]),
        ...flowHelpers,
      ];
      return domains
        .map((domain) => {
          const helperDomain = isHelperDomain(domain) ? domain : undefined;
          return {
            id: domain,
            primary:
              (helperDomain &&
                localize(`ui.panel.config.helpers.types.${helperDomain}`)) ||
              domainToName(localize, domain),
            secondary: isKnownHelperDomain(domain)
              ? localize(
                  `ui.panel.config.helpers.dialog.descriptions.${domain}`
                )
              : undefined,
            category: getHelperCategory(domain),
            // Only OG helpers need to be loaded prior adding one
            loaded: !helperDomain || isComponentLoaded(config, domain),
            search_labels: {
              aliases: helperDomain
                ? (HELPERS[helperDomain].alias?.join(" ") ?? null)
                : null,
            },
          };
        })
        .sort((a, b) => stringCompare(a.primary, b.primary, language));
    }
  );

  // Only offer the categories that have helpers.
  private _getSections = memoizeOne(
    (
      flowHelpers: string[],
      localize: LocalizeFunc,
      config: HassConfig,
      language: string
    ) => {
      const items = this._getHelperItems(
        flowHelpers,
        localize,
        config,
        language
      );
      return HELPER_CATEGORIES.filter((category) =>
        items.some((item) => item.category === category)
      ).map((category) => ({
        id: category,
        label: localize(
          `ui.panel.config.helpers.dialog.categories.${category}`
        ),
      }));
    }
  );

  private _fuseIndex = memoizeOne((items: HelperPickerItem[]) =>
    Fuse.createIndex(HELPER_SEARCH_KEYS, items)
  );

  private _getItems = (
    search?: string,
    section?: string
  ): (HelperPickerItem | string)[] => {
    this._category = section as HelperCategory | undefined;
    const allItems = this._getHelperItems(
      this._helperFlows ?? [],
      this.hass.localize,
      this.hass.config,
      this.hass.locale.language
    );
    const items = search
      ? multiTermSortedSearch(
          allItems,
          search,
          (item) => item.id,
          this._fuseIndex(allItems)
        )
      : allItems;

    if (this._category) {
      return items.filter((item) => item.category === this._category);
    }

    // Group by category, keeping the search order within each one.
    return HELPER_CATEGORIES.flatMap((category) => {
      const categoryItems = items.filter((item) => item.category === category);
      return categoryItems.length
        ? [
            this.hass.localize(
              `ui.panel.config.helpers.dialog.categories.${category}`
            ),
            ...categoryItems,
          ]
        : [];
    });
  };

  private _renderHelperRow = (item: PickerComboBoxItem) => {
    const { id: domain, primary, secondary, loaded } = item as HelperPickerItem;
    return html`
      <ha-combo-box-item>
        <ha-domain-icon
          slot="start"
          style="margin: var(--ha-space-1);"
          .domain=${domain}
          brand-fallback
        ></ha-domain-icon>
        <span slot="headline">${primary}</span>
        ${
          secondary
            ? html`<span slot="supporting-text">${secondary}</span>`
            : nothing
        }
        ${
          loaded
            ? html`<ha-icon-next slot="end"></ha-icon-next>`
            : html`<ha-svg-icon
                  slot="end"
                  .id="icon-${domain}"
                  .path=${mdiAlertOutline}
                  @click=${stopPropagation}
                ></ha-svg-icon>
                <ha-tooltip slot="end" .for="icon-${domain}">
                  ${this.hass.localize(
                    "ui.dialogs.helper_settings.platform_not_loaded",
                    { platform: domain }
                  )}
                </ha-tooltip>`
        }
      </ha-combo-box-item>
    `;
  };

  private _valueChanged(ev: CustomEvent): void {
    this._item = ev.detail.value;
    this._updateDirtyState({ item: this._item, area: this._area });
  }

  private async _createItem(): Promise<void> {
    if (!this._domain || !this._item) {
      return;
    }
    const domain = this._domain;
    const params = this._params;
    const area = this._area;
    this._submitting = true;
    this._error = "";
    try {
      const createdEntity = await HELPERS[domain].create(this.hass, this._item);
      // The dialog was closed or reopened while waiting
      if (this._params !== params) {
        return;
      }
      let entityId: string | undefined;
      if (createdEntity.id && (area || params?.navigateToResult)) {
        entityId = await this._findEntityId(domain, createdEntity.id);
        if (area) {
          entityId = await this._saveArea(entityId, area);
        }
        if (this._params !== params) {
          return;
        }
      }
      if (params?.dialogClosedCallback && createdEntity.id) {
        params.dialogClosedCallback({
          flowFinished: true,
          entityId: entityId ?? `${domain}.${createdEntity.id}`,
        });
      }
      this._markDirtyStateClean();
      this.closeDialog();
      if (params?.navigateToResult && entityId) {
        showMoreInfoDialog(this, { entityId });
      }
    } catch (err: any) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _findEntityId(
    domain: string,
    uniqueId: string
  ): Promise<string | undefined> {
    const isCreated = (entry: EntityRegistryEntry) =>
      entry.platform === domain && entry.unique_id === uniqueId;
    try {
      // The entity ID usually matches the helper ID, unless it was taken
      const entry = await getExtendedEntityRegistryEntry(
        this.hass,
        `${domain}.${uniqueId}`
      ).catch(() => undefined);
      if (entry && isCreated(entry)) {
        return entry.entity_id;
      }
      return (await fetchEntityRegistry(this.hass.connection)).find(isCreated)
        ?.entity_id;
    } catch (_err) {
      return undefined;
    }
  }

  private async _saveArea(
    entityId: string | undefined,
    areaId: string
  ): Promise<string | undefined> {
    let error = "Entity not found";
    if (entityId) {
      try {
        return (await updateEntitiesArea(this.hass, [entityId], areaId))[
          entityId
        ];
      } catch (err: unknown) {
        error = (err as { message?: string })?.message ?? "Unknown error";
      }
    }
    showAlertDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.integrations.config_flow.error_saving_entity",
        { error }
      ),
    });
    return entityId;
  }

  private _areaChanged(ev: ValueChangedEvent<string | undefined>): void {
    ev.stopPropagation();
    this._area = ev.detail.value || undefined;
    this._updateDirtyState({ item: this._item, area: this._area });
  }

  private async _helperPicked(
    ev: HASSDomEvent<PickerComboBoxIndexSelectedDetail>
  ): Promise<void> {
    ev.stopPropagation();
    const { id: domain, loaded } = ev.detail.item as HelperPickerItem;
    if (!loaded) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.dialogs.helper_settings.platform_not_loaded",
          { platform: domain }
        ),
      });
      return;
    }

    if (domain in HELPERS) {
      this._loading = true;
      try {
        await HELPERS[domain].import();
        this._domain = domain;
        this._initDirtyTracking(
          { type: "deep" },
          { item: this._item, area: undefined }
        );
      } finally {
        this._loading = false;
      }
    } else {
      this._pendingConfigFlow = {
        startFlowHandler: domain,
        manifest: await fetchIntegrationManifest(this.hass, domain),
        dialogClosedCallback: this._params?.dialogClosedCallback,
        navigateToResult: this._params?.navigateToResult,
      };
      this.closeDialog();
    }
  }

  private async _goBack() {
    this._domain = undefined;
    this._item = undefined;
    this._area = undefined;
    this._error = undefined;
    await this.updateComplete;
    this._focusPicker();
  }

  private async _focusPicker() {
    await this._comboBox?.updateComplete;
    this._comboBox?.focus();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        /* Keep the size steady while the list is filtered. Small screens
           show the dialog fullscreen, which this would override. */
        @media all and (min-width: 451px) and (min-height: 501px) {
          ha-dialog.picker {
            --ha-dialog-min-height: min(620px, 90vh);
          }
        }
        ha-icon-next {
          width: var(--ha-space-6);
        }
        ha-tooltip {
          pointer-events: auto;
        }
        .form {
          padding: var(--ha-space-6);
        }
        .form ha-area-picker {
          display: block;
          margin-top: var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-helper-detail": DialogHelperDetail;
  }
}
