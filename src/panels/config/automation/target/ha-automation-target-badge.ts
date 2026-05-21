import { consume, type ContextType } from "@lit/context";
import { mdiAlert, mdiCodeBraces, mdiShape } from "@mdi/js";
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { transform } from "../../../../common/decorators/transform";
import { isTemplate } from "../../../../common/string/has-template";
import "../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../data/config_entries";
import {
  configEntriesContext,
  internationalizationContext,
  labelsContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { TargetType } from "../../../../data/target";
import { getTargetIcon } from "./get_target_icon";
import { getTargetText } from "./get_target_text";

const TARGET_TYPES = ["entity", "device", "area", "label", "floor"] as const;

const isTargetType = (targetType: string): targetType is TargetType =>
  TARGET_TYPES.includes(targetType as TargetType);

@customElement("ha-automation-target-badge")
export class HaAutomationTargetBadge extends LitElement {
  @property({ attribute: "target-type" })
  public targetType!: string;

  @property({ attribute: "target-id" })
  public targetId?: string;

  @property()
  public label?: string;

  @property({ type: Boolean })
  public warning = false;

  @property({ type: Boolean })
  public error = false;

  @property({ type: Boolean })
  public interactive = false;

  @property({ attribute: false })
  public countTemplate: unknown = nothing;

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

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  protected render() {
    const { icon, label, warning } = this._targetInfo();

    return html`<div
      class=${classMap({
        target: true,
        warning,
        error: this.error,
        interactive: this.interactive,
      })}
    >
      ${icon}
      <div class="label">${label}${this.countTemplate}</div>
    </div>`;
  }

  private _targetInfo(): {
    icon: TemplateResult | typeof nothing;
    label: string;
    warning: boolean;
  } {
    const targetId = this.targetId;

    if (!targetId) {
      return {
        icon: nothing,
        label: this.label || "",
        warning: this.warning,
      };
    }

    let iconPath: string | undefined;
    let label = this.label;
    let warning = this.warning;

    if (!isTargetType(this.targetType)) {
      return {
        icon: nothing,
        label: label || targetId,
        warning,
      };
    }

    if (this.targetType === "entity" && ["all", "none"].includes(targetId)) {
      iconPath = mdiShape;
      label = this._i18n.localize(
        `ui.panel.config.automation.editor.target_summary.${targetId as "all" | "none"}_entities`
      );
    } else if (isTemplate(targetId)) {
      iconPath = mdiCodeBraces;
      label = this._i18n.localize(
        "ui.panel.config.automation.editor.target_summary.template"
      );
    } else if (!this._checkTargetExists(targetId)) {
      iconPath = mdiAlert;
      label = label || this._targetText(targetId);
      warning = true;
    } else {
      label = label || this._targetText(targetId);
    }

    const icon = iconPath
      ? html`<ha-svg-icon .path=${iconPath}></ha-svg-icon>`
      : getTargetIcon(
          this._registries,
          this._states,
          this.targetType,
          targetId,
          this._configEntryLookup || {},
          this._getLabel
        );

    return {
      icon,
      label: label || targetId,
      warning,
    };
  }

  private _targetText(targetId: string): string {
    return getTargetText(
      this._registries,
      this._states,
      this._i18n.localize,
      this.targetType,
      targetId,
      this._getLabel
    );
  }

  private _getLabel = (id: string) =>
    this._labelRegistry?.find(({ label_id }) => label_id === id);

  private _checkTargetExists(targetId: string): boolean {
    if (this.targetType === "floor") {
      return !!this._registries.floors[targetId];
    }
    if (this.targetType === "area") {
      return !!this._registries.areas[targetId];
    }
    if (this.targetType === "device") {
      return !!this._registries.devices[targetId];
    }
    if (this.targetType === "entity") {
      return !!this._states[targetId];
    }
    return !!this._getLabel(targetId);
  }

  static styles = css`
    :host {
      display: inline-flex;
      max-width: 100%;
      vertical-align: middle;
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
      max-width: 100%;
    }

    .target.warning {
      background: var(--ha-color-fill-warning-normal-resting);
      color: var(--ha-color-on-warning-normal);
    }

    .target.error {
      background: var(--ha-color-fill-danger-normal-resting);
      color: var(--ha-color-on-danger-normal);
    }

    .label {
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-target-badge": HaAutomationTargetBadge;
  }
}
