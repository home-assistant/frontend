import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { consume, type ContextType } from "@lit/context";
import { mdiMonitor } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityNameList } from "../../common/entity/compute_entity_name_display";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { supportsFeature } from "../../common/entity/supports-feature";
import {
  areasContext,
  configContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  internationalizationContext,
  statesContext,
} from "../../data/context";
import { UNAVAILABLE } from "../../data/entity/entity";
import {
  entityComboBoxKeys,
  type EntityComboBoxItem,
} from "../../data/entity/entity_picker";
import { domainToName } from "../../data/integration";
import {
  BROWSER_PLAYER,
  MediaPlayerEntityFeature,
} from "../../data/media-player";
import "../entity/state-badge";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import type { PickerComboBoxSearchFn } from "../ha-picker-combo-box";
import "../ha-svg-icon";

@customElement("ha-media-player-picker")
export class HaMediaPlayerPicker extends LitElement {
  @property() public value?: string;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @consume({ context: floorsContext, subscribe: true })
  private _floors!: ContextType<typeof floorsContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  protected render() {
    return html`
      <ha-generic-picker
        .value=${this.value}
        .getItems=${this._getPlayerItems}
        .rowRenderer=${this._playerRowRenderer}
        .searchFn=${this._playerSearchFn}
        .searchKeys=${entityComboBoxKeys}
        .notFoundLabel=${this._notFoundPlayerLabel}
        .popoverPlacement=${"top-end"}
        .hideClearIcon=${true}
        @value-changed=${this._valueChanged}
      >
        <slot name="field" slot="field" @click=${this.open}></slot>
      </ha-generic-picker>
    `;
  }

  public open(ev?: Event): void {
    this._picker?.open(ev, { selectedValue: this.value });
  }

  private _getPlayerItems = () =>
    this._getPlayerItemsMemoized(
      this._states,
      this._entities,
      this._devices,
      this._areas,
      this._floors,
      this._i18n
    );

  private _getPlayerItemsMemoized = memoizeOne(
    (
      states: ContextType<typeof statesContext>,
      entities: ContextType<typeof entitiesContext>,
      devices: ContextType<typeof devicesContext>,
      areas: ContextType<typeof areasContext>,
      floors: ContextType<typeof floorsContext>,
      i18n: ContextType<typeof internationalizationContext>
    ): EntityComboBoxItem[] => {
      const webBrowserLabel = i18n.localize(
        "ui.components.media-browser.web-browser"
      );
      const lang = i18n.language || "en";
      const isRTL = i18n.translationMetadata.translations[lang]?.isRTL || false;

      return [
        {
          id: BROWSER_PLAYER,
          primary: webBrowserLabel,
          icon_path: mdiMonitor,
          search_labels: {
            entityName: webBrowserLabel,
            friendlyName: webBrowserLabel,
            deviceName: null,
            areaName: null,
            domainName: null,
            entityId: BROWSER_PLAYER,
          },
        },
        ...Object.values(states)
          .filter(this._filterPlayerEntities)
          .map<EntityComboBoxItem>((stateObj) => {
            const friendlyName = computeStateName(stateObj);
            const [entityName, deviceName, areaName] = computeEntityNameList(
              stateObj,
              [{ type: "entity" }, { type: "device" }, { type: "area" }],
              entities,
              devices,
              areas,
              floors
            );
            const entityId = stateObj.entity_id;
            const domainName = domainToName(
              i18n.localize,
              computeDomain(entityId)
            );
            const primary = entityName || deviceName || entityId;
            const secondary = [areaName, entityName ? deviceName : undefined]
              .filter(Boolean)
              .join(isRTL ? " ◂ " : " ▸ ");

            return {
              id: entityId,
              primary,
              secondary,
              disabled: stateObj.state === UNAVAILABLE,
              domain_name: domainName,
              sorting_label: [primary, secondary].filter(Boolean).join("_"),
              search_labels: {
                entityName: entityName || null,
                deviceName: deviceName || null,
                areaName: areaName || null,
                domainName: domainName || null,
                friendlyName: friendlyName || null,
                entityId,
              },
              stateObj,
            };
          }),
      ];
    }
  );

  private _filterPlayerEntities = (entity: HassEntity): boolean =>
    computeStateDomain(entity) === "media_player" &&
    supportsFeature(entity, MediaPlayerEntityFeature.BROWSE_MEDIA) &&
    !this._entities[entity.entity_id]?.hidden;

  private _playerRowRenderer: RenderItemFunction<EntityComboBoxItem> = (
    item,
    index
  ) => html`
    <div
      style=${styleMap({
        width: "100%",
        borderTop: index === 0 ? undefined : "1px solid var(--divider-color)",
      })}
    >
      <ha-combo-box-item type="button" compact .disabled=${item.disabled}>
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
        ${item.stateObj && this._hassConfig.userData?.showEntityIdPicker
          ? html`
              <span slot="supporting-text" class="code">
                ${item.stateObj.entity_id}
              </span>
            `
          : nothing}
      </ha-combo-box-item>
    </div>
  `;

  private _playerSearchFn: PickerComboBoxSearchFn<EntityComboBoxItem> = (
    search,
    filteredItems
  ) => {
    const index = filteredItems.findIndex(
      (item) => item.stateObj?.entity_id === search || item.id === search
    );

    if (index === -1) {
      return filteredItems;
    }

    const [exactMatch] = filteredItems.splice(index, 1);
    filteredItems.unshift(exactMatch);
    return filteredItems;
  };

  private _notFoundPlayerLabel = (search: string) =>
    this._i18n.localize("ui.components.entity.entity-picker.no_match", {
      term: html`<b>${search}</b>`,
    });

  private _valueChanged(ev: CustomEvent<{ value: string }>): void {
    ev.stopPropagation();
    const { value } = ev.detail;
    if (!value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    ha-generic-picker {
      --ha-generic-picker-width: min(360px, calc(100vw - 32px));
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-player-picker": HaMediaPlayerPicker;
  }
}
