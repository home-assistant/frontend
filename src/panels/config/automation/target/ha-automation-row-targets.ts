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
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
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
  configEntriesContext,
  internationalizationContext,
  labelsContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { TargetSelector } from "../../../../data/selector";
import type { TargetType } from "../../../../data/target";
import { showMoreInfoDialog } from "../../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant } from "../../../../types";
import { getTargetIcon } from "./get_target_icon";
import { getTargetText } from "./get_target_text";

@customElement("ha-automation-row-targets")
export class HaAutomationRowTargets extends LitElement {
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  public target?: HassServiceTarget;

  @property({ attribute: false })
  public targetRequired = false;

  @property({ attribute: false })
  public selector?: TargetSelector;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

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
      >
        <span slot="trigger" class="target interactive">
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
        </span>
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
    targetType?: string
  ) {
    return html`<div
      class=${classMap({
        target: true,
        warning,
        error,
        interactive: targetId && targetType,
      })}
      .targetId=${targetId}
      .targetType=${targetType}
      .label=${label}
      @click=${this._handleTargetClick}
    >
      ${icon}
      <div class="label">${label}</div>
    </div>`;
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
        label = getTargetText(this.hass, targetType, targetId, this._getLabel);
        warning = true;
        badgeTargetId = undefined;
        badgeTargetType = undefined;
      } else {
        label = getTargetText(this.hass, targetType, targetId, this._getLabel);
      }
    }

    const iconTemplate = icon
      ? html`<ha-svg-icon
          .slot=${dropdownOption ? "icon" : ""}
          .path=${icon}
        ></ha-svg-icon>`
      : getTargetIcon(
          this.hass,
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
        >${iconTemplate} ${label}</ha-dropdown-item
      >`;
    }

    return this._renderTargetBadge(
      iconTemplate,
      label,
      warning,
      false,
      badgeTargetId,
      badgeTargetType
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

    .target.interactive {
      cursor: pointer;
    }
    .target.interactive:hover {
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
