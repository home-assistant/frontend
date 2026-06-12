import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume, type ContextType } from "@lit/context";
import {
  mdiAlert,
  mdiAlertOctagon,
  mdiCodeBraces,
  mdiFormatListBulleted,
  mdiMenuDown,
  mdiShape,
} from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { until } from "lit/directives/until";
import { ensureArray } from "../../../../common/array/ensure-array";
import { transform } from "../../../../common/decorators/transform";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { isTemplate } from "../../../../common/string/has-template";
import "../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-svg-icon";
import { showTargetDetailsDialog } from "../../../../components/target-picker/dialog/show-dialog-target-details";
import type { ConfigEntry } from "../../../../data/config_entries";
import {
  apiContext,
  configEntriesContext,
  internationalizationContext,
  labelsContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import {
  deviceMeetsTargetSelector,
  entityMeetsTargetSelector,
  type TargetSelector,
} from "../../../../data/selector";
import { extractFromTarget, type TargetType } from "../../../../data/target";
import { showMoreInfoDialog } from "../../../../dialogs/more-info/show-ha-more-info-dialog";
import { getTargetIcon } from "./get_target_icon";
import { getTargetText } from "./get_target_text";

@customElement("ha-automation-row-targets")
export class HaAutomationRowTargets extends LitElement {
  @property({ attribute: false })
  public target?: HassServiceTarget;

  @property({ attribute: false })
  public targetRequired = false;

  @property({ attribute: false })
  public selector?: TargetSelector;

  @property({ type: Boolean })
  public interactive = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  @transform<ConfigEntry[], Record<string, ConfigEntry>>({
    transformer: function (value) {
      return value
        ? Object.fromEntries(value.map((entry) => [entry.entry_id, entry]))
        : undefined;
    },
  })
  private _configEntryLookup?: Record<string, ConfigEntry>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  private _countCache = new Map<
    string,
    Promise<number | undefined> | number | undefined
  >();

  private _rerenderCount = true;

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      changedProps.has("target") ||
      changedProps.has("selector") ||
      changedProps.has("_registries")
    ) {
      this._rerenderCount = true;
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    this._rerenderCount = false;
  }

  private _countMatchingEntities(referencedEntities: string[]): number {
    const targetSelector = this.selector;
    const hasEntityFilter = !!targetSelector?.target?.entity;
    const hasDeviceFilter = !!targetSelector?.target?.device;

    if (!hasEntityFilter && !hasDeviceFilter) {
      return referencedEntities.length;
    }

    const entityRegistry = hasDeviceFilter
      ? Object.values(this._registries.entities)
      : [];

    return referencedEntities.filter((entityId) => {
      if (hasEntityFilter) {
        const stateObj = this._states[entityId];
        if (!entityMeetsTargetSelector(stateObj, targetSelector!)) {
          return false;
        }
      }
      if (hasDeviceFilter) {
        const deviceId = this._registries.entities[entityId]?.device_id;
        if (deviceId) {
          const device = this._registries.devices[deviceId];
          if (
            device &&
            !deviceMeetsTargetSelector(
              this._states,
              entityRegistry,
              device,
              targetSelector!
            )
          ) {
            return false;
          }
        }
      }
      return true;
    }).length;
  }

  private _renderCount(
    targetType: "floor" | "area" | "device" | "label",
    targetId: string
  ) {
    const key = `${targetType}:${targetId}`;
    let fallback = " (-)";
    if (!this._countCache.has(key) || this._rerenderCount) {
      if (typeof this._countCache.get(key) === "number") {
        fallback = ` (${this._countCache.get(key)})`;
      }
      this._countCache.set(
        key,
        extractFromTarget(
          this._api.callWS,
          {
            [`${targetType}_id`]: [targetId],
          },
          false,
          this.selector?.target?.primary_entities_only
        )
          .then((result) =>
            this._countMatchingEntities(result.referenced_entities)
          )
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error("Error counting target entities", err);
            return undefined;
          })
      );
    }

    if (this._countCache.get(key) instanceof Promise) {
      return until(
        (this._countCache.get(key) as Promise<number | undefined>)!.then(
          (count) => {
            this._countCache.set(key, count);
            return count === undefined ? nothing : html` (${count})`;
          }
        ),
        fallback
      );
    }

    if (typeof this._countCache.get(key) === "number") {
      return ` (${this._countCache.get(key)})`;
    }
    return nothing;
  }

  protected render() {
    const length = Object.keys(this.target || {}).length;
    if (!length) {
      return this._renderTargetBadge(
        this.targetRequired
          ? html`<ha-svg-icon .path=${mdiAlertOctagon}></ha-svg-icon>`
          : nothing,
        this._i18n.localize(
          "ui.panel.config.automation.editor.target_summary.no_target"
        ),
        false,
        this.targetRequired
      );
    }
    const totalLength = Object.values(this.target || {}).reduce(
      (acc, val) => acc + ensureArray(val).length,
      0
    );

    if (totalLength <= 5) {
      const targets = Object.entries(this.target!).reduce<
        ["floor" | "area" | "device" | "entity" | "label", string][]
      >((acc, [targetType, targetId]) => {
        const type = targetType.replace("_id", "") as
          | "floor"
          | "area"
          | "device"
          | "entity"
          | "label";
        return [
          ...acc,
          ...ensureArray(targetId).map((id): [typeof type, string] => [
            type,
            id,
          ]),
        ];
      }, []);

      return targets.map(
        ([targetType, targetId]) =>
          html`<span class="target-wrapper">
            ${this._renderTarget(targetType, targetId)}
          </span>`
      );
    }

    const rows = Object.entries(this.target!)
      .reduce<["floor" | "area" | "device" | "entity" | "label", string][]>(
        (acc, [targetType, targetId]) => {
          const type = targetType.replace("_id", "") as
            | "floor"
            | "area"
            | "device"
            | "entity"
            | "label";
          return [
            ...acc,
            ...ensureArray(targetId).map((id): [typeof type, string] => [
              type,
              id,
            ]),
          ];
        },
        []
      )
      .sort(([typeA], [typeB]) => {
        const order = ["entity", "device", "area", "floor", "label"];
        return order.indexOf(typeA) - order.indexOf(typeB);
      });

    let lastTargetType: string | null = null;

    return html`
      <ha-dropdown
        @wa-select=${this._handleTargetSelect}
        @click=${stopPropagation}
        @keydown=${stopPropagation}
      >
        <button slot="trigger" class="target">
          <ha-svg-icon .path=${mdiFormatListBulleted}></ha-svg-icon>
          <div class="label">
            ${this._i18n.localize(
              "ui.panel.config.automation.editor.target_summary.targets",
              {
                count: totalLength,
              }
            )}
          </div>
          <ha-svg-icon .path=${mdiMenuDown}></ha-svg-icon>
        </button>
        ${rows.map(([targetType, targetId]) => {
          const content = html`${lastTargetType !== null &&
          lastTargetType !== targetType
            ? html`<wa-divider></wa-divider>`
            : nothing}
          ${!lastTargetType || lastTargetType !== targetType
            ? html`<h3>
                ${this._i18n.localize(
                  `ui.panel.config.automation.editor.target_summary.types.${targetType}`
                )}
              </h3>`
            : nothing}
          ${this._renderTarget(targetType, targetId, true)}`;
          lastTargetType = targetType;
          return content;
        })}
      </ha-dropdown>
    `;
  }

  private _getLabel = (id: string) =>
    this._labelRegistry?.find(({ label_id }) => label_id === id);

  private _checkTargetExists(
    targetType: "floor" | "area" | "device" | "entity" | "label",
    targetId: string
  ): boolean {
    if (targetType === "floor") {
      return !!this._registries.floors[targetId];
    }
    if (targetType === "area") {
      return !!this._registries.areas[targetId];
    }
    if (targetType === "device") {
      return !!this._registries.devices[targetId];
    }
    if (targetType === "entity") {
      return !!this._states[targetId];
    }
    if (targetType === "label") {
      return !!this._getLabel(targetId);
    }
    return false;
  }

  private _renderTargetBadge(
    icon: TemplateResult | typeof nothing,
    label: string,
    warning = false,
    error = false,
    targetId?: string,
    targetType?: string,
    countTemplate: unknown = nothing
  ) {
    if (!this.interactive || !targetId || !targetType) {
      return html`<div
        class=${classMap({
          target: true,
          warning,
          error,
        })}
        .targetId=${targetId}
        .targetType=${targetType}
        .label=${label}
      >
        ${icon}
        <div class="label">${label}${countTemplate}</div>
      </div>`;
    }

    return html`<button
      class=${classMap({
        target: true,
        warning,
        error,
      })}
      .targetId=${targetId}
      .targetType=${targetType}
      .label=${label}
      @click=${this._handleTargetClick}
      @keydown=${this._handleTargetKeydown}
    >
      ${icon}
      <div class="label">${label}${countTemplate}</div>
    </button>`;
  }

  private _renderTarget(
    targetType: "floor" | "area" | "device" | "entity" | "label",
    targetId: string,
    dropdownOption = false
  ) {
    let icon: string | undefined;
    let label: string;
    let warning = false;
    let badgeTargetId: string | undefined = targetId;
    let badgeTargetType: string | undefined = targetType;
    let countTemplate: unknown = nothing;

    if (targetType === "entity" && ["all", "none"].includes(targetId)) {
      icon = mdiShape;
      label = this._i18n.localize(
        `ui.panel.config.automation.editor.target_summary.${targetId as "all" | "none"}_entities`
      );
      badgeTargetId = undefined;
      badgeTargetType = undefined;
    } else if (isTemplate(targetId)) {
      // Check if the target is a template
      icon = mdiCodeBraces;
      label = this._i18n.localize(
        "ui.panel.config.automation.editor.target_summary.template"
      );
      badgeTargetId = undefined;
      badgeTargetType = undefined;
    } else {
      const exists = this._checkTargetExists(targetType, targetId);
      if (!exists) {
        icon = mdiAlert;
        label = getTargetText(
          this._registries,
          this._states,
          this._i18n.localize,
          targetType,
          targetId,
          this._getLabel
        );
        warning = true;
        badgeTargetId = undefined;
        badgeTargetType = undefined;
      } else {
        label = getTargetText(
          this._registries,
          this._states,
          this._i18n.localize,
          targetType,
          targetId,
          this._getLabel
        );
        if (targetType !== "entity" && this.interactive) {
          countTemplate = this._renderCount(targetType, targetId);
        }
      }
    }

    const iconTemplate = icon
      ? html`<ha-svg-icon
          .slot=${dropdownOption ? "icon" : ""}
          .path=${icon}
        ></ha-svg-icon>`
      : getTargetIcon(
          this._registries,
          this._states,
          targetType,
          targetId,
          this._configEntryLookup || {},
          this._getLabel,
          dropdownOption ? "icon" : ""
        );

    if (dropdownOption) {
      return html`<ha-dropdown-item
        .value=${{
          targetId: badgeTargetId,
          targetType: badgeTargetType,
          label,
        }}
        class=${classMap({
          warning,
        })}
        >${iconTemplate} ${label}${countTemplate}</ha-dropdown-item
      >`;
    }

    return this._renderTargetBadge(
      iconTemplate,
      label,
      warning,
      false,
      badgeTargetId,
      badgeTargetType,
      countTemplate
    );
  }

  private _handleTargetClick(ev: Event) {
    const target = ev.currentTarget as HTMLDivElement & {
      targetId: string;
      targetType: TargetType;
      label: string;
    };

    if (!target.targetId || !target.targetType) {
      return;
    }

    this._showTargetInfo(target.targetId, target.targetType, target.label, ev);
  }

  private _handleTargetKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._handleTargetClick(ev);
    }
  }

  private _handleTargetSelect(
    ev: HaDropdownSelectEvent<{
      targetId?: string;
      targetType?: TargetType;
      label: string;
    }>
  ) {
    const value = ev.detail.item.value;

    if (!value.targetId || !value.targetType) {
      return;
    }

    this._showTargetInfo(value.targetId, value.targetType, value.label);
  }

  private _showTargetInfo(
    targetId: string,
    targetType: TargetType,
    label: string,
    ev?: Event
  ) {
    ev?.stopPropagation();

    if (targetType === "entity") {
      showMoreInfoDialog(this, { entityId: targetId });
      return;
    }

    showTargetDetailsDialog(this, {
      title: label,
      type: targetType,
      itemId: targetId,
      selector: this.selector,
    });
  }

  static styles = css`
    :host {
      display: contents;
      min-height: 32px;
    }
    .target-wrapper {
      display: inline-flex;
      align-items: flex-end;
      gap: var(--ha-space-1);
      max-width: 100%;
    }
    .target {
      display: inline-flex;
      gap: var(--ha-space-1);
      justify-content: center;
      align-items: center;
      border-radius: var(--ha-border-radius-md);
      background: var(--ha-color-fill-neutral-normal-resting);
      padding: 0 var(--ha-space-2) 0 var(--ha-space-1);
      color: var(--ha-color-on-neutral-normal);
      border: var(--ha-border-width-sm) solid
        var(--ha-color-border-neutral-quiet);
      overflow: hidden;
      height: 32px;
    }
    .target.warning {
      background: var(--ha-color-fill-warning-normal-resting);
      color: var(--ha-color-on-warning-normal);
    }
    .target.error {
      background: var(--ha-color-fill-danger-normal-resting);
      color: var(--ha-color-on-danger-normal);
    }
    .target .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .target ha-icon,
    .target ha-svg-icon,
    .target ha-domain-icon {
      display: flex;
      padding: var(--ha-space-1) 0;
    }

    .target ha-floor-icon {
      display: flex;
      height: 32px;
      align-items: center;
    }

    button.target {
      cursor: pointer;
    }
    button.target:hover {
      background: var(--ha-color-fill-neutral-normal-hover);
    }

    ha-dropdown-item {
      padding: 0 var(--ha-space-2);
    }
    ha-dropdown-item.warning {
      background-color: var(--ha-color-fill-warning-quiet-resting);
      color: var(--ha-color-on-warning-normal);
    }
    ha-dropdown-item.warning:hover {
      background-color: var(--ha-color-fill-warning-quiet-hover);
      color: var(--ha-color-on-warning-normal);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-targets": HaAutomationRowTargets;
  }
}
