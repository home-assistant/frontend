import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import {
  mdiAlert,
  mdiAlertOctagon,
  mdiCodeBraces,
  mdiFormatListBulleted,
  mdiMenuDown,
  mdiShape,
  mdiSwapHorizontal,
} from "@mdi/js";
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
import memoizeOne from "memoize-one";
import { consume } from "../../../../common/decorators/consume";
import { ensureArray } from "../../../../common/array/ensure-array";
import { transform } from "../../../../common/decorators/transform";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import {
  hasTemplate,
  isTemplate,
} from "../../../../common/string/has-template";
import "../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-svg-icon";
import "../../../../components/entity/state-badge";
import { showTargetDetailsDialog } from "../../../../components/target-picker/dialog/show-dialog-target-details";
import { targetExpandGroupContext } from "../../../../components/target-picker/target-expand-group-context";
import type { ConfigEntry } from "../../../../data/config_entries";
import {
  apiContext,
  configEntriesContext,
  connectionContext,
  internationalizationContext,
  labelsContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import {
  fetchDeviceCompositeSplits,
  type DeviceCompositeSplits,
} from "../../../../data/device/device_registry";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import {
  deviceMeetsTargetSelector,
  entityMeetsTargetSelector,
  type TargetSelector,
} from "../../../../data/selector";
import {
  explainTarget,
  targetEntitiesAfterExclude,
  type HassServiceTargetWithExclude,
  type TargetExplanation,
  type TargetType,
} from "../../../../data/target";
import { showMoreInfoDialog } from "../../../../dialogs/more-info/show-ha-more-info-dialog";
import { isConfigObject } from "../ui-support";
import { getTargetIcon } from "./get_target_icon";
import { getTargetText } from "./get_target_text";

@customElement("ha-automation-row-targets")
export class HaAutomationRowTargets extends LitElement {
  @property({ attribute: false })
  public target?: HassServiceTargetWithExclude;

  @property({ attribute: false })
  public targetRequired = false;

  @property({ attribute: false })
  public selector?: TargetSelector;

  @property({ type: Boolean })
  public interactive = false;

  @property({ reflect: true })
  public size: "s" | "m" = "m";

  /**
   * Whether the target expands the groups it names. Overrides what the
   * context provides, for a place that shows targets of different kinds.
   */
  @property({ attribute: false }) public expandGroup?: boolean;

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

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  // Whether the target expands the groups it names, like an action does.
  @state()
  @consume({ context: targetExpandGroupContext, subscribe: true })
  private _expandGroup?: boolean;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state() private _compositeSplits?: DeviceCompositeSplits;

  private _loadingCompositeSplits = false;

  // What each target resolves to and what the exclude takes out, from core.
  // `null` once core couldn't tell.
  @state() private _explanation?: TargetExplanation | null;

  private _explainRequest = 0;

  private get _resolvedExpandGroup(): boolean {
    return this.expandGroup ?? this._expandGroup ?? true;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      changedProps.has("target") ||
      changedProps.has("selector") ||
      changedProps.has("interactive") ||
      changedProps.has("expandGroup") ||
      changedProps.has("_expandGroup") ||
      changedProps.has("_registries")
    ) {
      this._explain();
    }

    if (
      (changedProps.has("target") || changedProps.has("_registries")) &&
      this._compositeSplits === undefined &&
      !this._loadingCompositeSplits &&
      this._hasMissingDevice()
    ) {
      // A referenced device is missing from the registry; it might be a legacy
      // composite device that was split. Fetch the split map so we can flag it.
      this._loadCompositeSplits();
    }
  }

  private _hasMissingDevice(): boolean {
    const deviceIds = this.target?.device_id
      ? ensureArray(this.target.device_id)
      : [];
    return deviceIds.some(
      (id) => !isTemplate(id) && !this._registries?.devices?.[id]
    );
  }

  private async _loadCompositeSplits() {
    if (!this._api || !this._connection) {
      return;
    }
    this._loadingCompositeSplits = true;
    try {
      this._compositeSplits = await fetchDeviceCompositeSplits(
        this._connection.connection,
        this._api.callWS
      );
    } catch (_err) {
      this._compositeSplits = {};
    } finally {
      this._loadingCompositeSplits = false;
    }
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

  // A templated exclude can only be resolved when the automation runs.
  private _getExclude() {
    const exclude = isConfigObject(this.target)
      ? this.target.exclude
      : undefined;
    return isConfigObject(exclude) && !hasTemplate(exclude)
      ? exclude
      : undefined;
  }

  // The target without its templated ids, which only resolve when the
  // automation runs, so core can explain the rest.
  private _explainableTarget(): HassServiceTargetWithExclude | undefined {
    const { exclude: _exclude, ...target } = isConfigObject(this.target)
      ? this.target
      : {};
    const explainable: HassServiceTargetWithExclude = {};
    Object.entries(target).forEach(([key, ids]) => {
      const plain = ensureArray(ids).filter((id) => !isTemplate(id));
      if (plain.length) {
        explainable[key] = plain;
      }
    });
    return Object.keys(explainable).length ? explainable : undefined;
  }

  // Only targets other than entities show a count, and only when the summary
  // is interactive; without one of those, the explanation is only needed to
  // tell which entity targets the exclude takes out again.
  private async _explain() {
    const request = ++this._explainRequest;
    const target = this._explainableTarget();
    const exclude = this._getExclude();
    const counts =
      this.interactive &&
      !!target &&
      Object.keys(target).some((key) => key !== "entity_id");
    if (!this._api || !target || (!counts && !exclude)) {
      this._explanation = undefined;
      return;
    }
    let explanation: TargetExplanation | null;
    try {
      explanation = await explainTarget(
        this._api.callWS,
        { ...target, exclude },
        this._resolvedExpandGroup,
        this.selector?.target?.primary_entities_only
      );
    } catch (_err) {
      explanation = null;
    }
    if (request === this._explainRequest) {
      this._explanation = explanation;
    }
  }

  // What each target is left with once the exclude is taken out of it.
  private _remaining = memoizeOne(
    (explanation: TargetExplanation | null | undefined) =>
      explanation ? targetEntitiesAfterExclude(explanation) : undefined
  );

  // The entity targets the exclude block takes out again entirely.
  private _excludedEntities = memoizeOne(
    (explanation: TargetExplanation | null | undefined): Set<string> => {
      const remaining = this._remaining(explanation);
      return new Set(
        explanation?.includes
          .filter(
            ({ type, id, entities }) =>
              type === "entity" &&
              entities.length > 0 &&
              remaining![`entity:${id}`].length === 0
          )
          .map(({ id }) => id)
      );
    }
  );

  private _isExcludedEntity(entityId: string): boolean {
    return this._excludedEntities(this._explanation).has(entityId);
  }

  private _renderCount(
    targetType: "floor" | "area" | "device" | "label",
    targetId: string
  ) {
    if (this._explanation === null) {
      return nothing;
    }
    const remaining = this._remaining(this._explanation)?.[
      `${targetType}:${targetId}`
    ];
    if (!remaining) {
      return " (-)";
    }
    return ` (${this._countMatchingEntities(remaining)})`;
  }

  protected render() {
    // In actions, the whole target can be a template
    if (typeof this.target === "string" && isTemplate(this.target)) {
      return html`<span class="target-wrapper">
        ${this._renderTarget("entity", this.target)}
      </span>`;
    }

    // Any other value that isn't a mapping is invalid. Without this, the
    // characters of a string or the items of a list would count as targets.
    // `exclude` takes entities away from the other keys; it is not a target
    // of its own, so it gets no chip. Its effect shows in each count.
    const { exclude: _exclude, ...target } = isConfigObject(this.target)
      ? this.target
      : {};
    const length = Object.keys(target).length;
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
    const totalLength = Object.values(target).reduce(
      (acc, val) => acc + ensureArray(val).length,
      0
    );
    const excludedEntityTargets = ensureArray(target.entity_id ?? []).filter(
      (entityId) => this._isExcludedEntity(entityId)
    ).length;

    if (totalLength <= 5) {
      const targets = Object.entries(target).reduce<
        ["floor" | "area" | "device" | "entity" | "label", string][]
      >((acc, [targetType, targetId]) => {
        const type = targetType.replace("_id", "") as
          "floor" | "area" | "device" | "entity" | "label";
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

    const rows = Object.entries(target)
      .reduce<["floor" | "area" | "device" | "entity" | "label", string][]>(
        (acc, [targetType, targetId]) => {
          const type = targetType.replace("_id", "") as
            "floor" | "area" | "device" | "entity" | "label";
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

    // The collapsed summary hides the individual targets, so carry over the
    // warning when any of them no longer exists.
    const hasMissingTarget = rows.some(
      ([targetType, targetId]) => !this._checkTargetExists(targetType, targetId)
    );

    return html`
      <ha-dropdown
        @wa-select=${this._handleTargetSelect}
        @click=${stopPropagation}
        @keydown=${stopPropagation}
      >
        <button
          slot="trigger"
          class=${classMap({ target: true, warning: hasMissingTarget })}
        >
          <ha-svg-icon
            .path=${hasMissingTarget ? mdiAlert : mdiFormatListBulleted}
          ></ha-svg-icon>
          <div class="label">
            ${this._i18n.localize(
              "ui.panel.config.automation.editor.target_summary.targets",
              {
                count: totalLength - excludedEntityTargets,
              }
            )}
          </div>
          <ha-svg-icon .path=${mdiMenuDown}></ha-svg-icon>
        </button>
        ${rows.map(([targetType, targetId]) => {
          const content = html`${
            lastTargetType !== null && lastTargetType !== targetType
              ? html`<wa-divider></wa-divider>`
              : nothing
          }
          ${
            !lastTargetType || lastTargetType !== targetType
              ? html`<h3>
                  ${this._i18n.localize(
                    `ui.panel.config.automation.editor.target_summary.types.${targetType}`
                  )}
                </h3>`
              : nothing
          }
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
    countTemplate: unknown = nothing,
    title?: string,
    excluded = false
  ) {
    if (!this.interactive || !targetId || !targetType) {
      return html`<div
        class=${classMap({
          target: true,
          warning,
          error,
          excluded,
        })}
        title=${title ?? nothing}
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
        excluded,
      })}
      title=${title ?? nothing}
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
    let title: string | undefined;
    let badgeTargetId: string | undefined = targetId;
    let badgeTargetType: string | undefined = targetType;
    let countTemplate: unknown = nothing;
    const excluded =
      targetType === "entity" && this._isExcludedEntity(targetId);

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
        warning = true;
        badgeTargetId = undefined;
        badgeTargetType = undefined;
        if (
          targetType === "device" &&
          this._compositeSplits?.[targetId]?.split_ids.some(
            (id) => id in this._registries.devices
          )
        ) {
          // The device was replaced by one or more split devices; make clear
          // this reference needs to be updated, distinct from "unknown device".
          icon = mdiSwapHorizontal;
          label = this._i18n.localize(
            "ui.panel.config.automation.editor.target_summary.device_replaced"
          );
          title = this._i18n.localize(
            "ui.panel.config.automation.editor.target_summary.device_replaced_description"
          );
        } else {
          label = getTargetText(
            this._registries,
            this._states,
            this._i18n.localize,
            targetType,
            targetId,
            this._getLabel
          );
        }
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
        if (excluded) {
          title = this._i18n.localize(
            "ui.panel.config.automation.editor.target_summary.excluded"
          );
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
        title=${title ?? nothing}
        class=${classMap({
          warning,
          excluded,
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
      countTemplate,
      title,
      excluded
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
      exclude: this._getExclude(),
      expandGroup: this._resolvedExpandGroup,
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
      box-sizing: border-box;
      font: inherit;
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

    .target state-badge,
    ha-dropdown-item state-badge {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .target ha-floor-icon {
      display: flex;
      height: 32px;
      align-items: center;
    }

    :host([size="s"]) {
      min-height: 24px;
    }

    :host([size="s"]) .target {
      height: 24px;
    }

    :host([size="s"]) .target ha-floor-icon {
      height: 24px;
    }

    :host([size="s"]) .target ha-icon,
    :host([size="s"]) .target ha-svg-icon,
    :host([size="s"]) .target ha-domain-icon,
    :host([size="s"]) .target ha-floor-icon {
      --mdc-icon-size: 16px;
    }
    :host([size="s"]) .target state-badge {
      width: 16px;
      height: 16px;
      --mdc-icon-size: 16px;
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
    .target.excluded .label,
    ha-dropdown-item.excluded {
      color: var(--secondary-text-color);
      text-decoration: line-through;
    }
    ha-dropdown-item.warning {
      background-color: var(--ha-color-fill-warning-quiet-resting);
      color: var(--ha-color-on-warning-normal);
    }
    ha-dropdown-item.warning ha-svg-icon {
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
