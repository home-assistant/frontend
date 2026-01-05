import { consume } from "@lit/context";
import {
  mdiAlert,
  mdiCodeBraces,
  mdiFormatListBulleted,
  mdiShape,
} from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import { css, html, LitElement, type nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ensureArray } from "../../../../common/array/ensure-array";
import { transform } from "../../../../common/decorators/transform";
import { isTemplate } from "../../../../common/string/has-template";
import "../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../data/config_entries";
import {
  areasContext,
  configEntriesContext,
  devicesContext,
  floorsContext,
  labelsContext,
  localizeContext,
  statesContext,
} from "../../../../data/context";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { HomeAssistant } from "../../../../types";
import { getTargetIcon } from "./get_target_icon";
import { getTargetText } from "./get_target_text";

@customElement("ha-automation-row-targets")
export class HaAutomationRowTargets extends LitElement {
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  public target?: HassServiceTarget;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: HomeAssistant["localize"];

  @state()
  @consume({ context: floorsContext, subscribe: true })
  private floors!: HomeAssistant["floors"];

  @state()
  @consume({ context: areasContext, subscribe: true })
  private areas!: HomeAssistant["areas"];

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private devices!: HomeAssistant["devices"];

  @state()
  @consume({ context: statesContext, subscribe: true })
  private states!: HomeAssistant["states"];

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  @transform<ConfigEntry[], Record<string, ConfigEntry>>({
    transformer: function (value) {
      return Object.fromEntries(value.map((entry) => [entry.entry_id, entry]));
    },
  })
  private _configEntryLookup?: Record<string, ConfigEntry>;

  protected render() {
    const length = Object.keys(this.target || {}).length;
    if (!length) {
      return html`<span class="target">
        <div class="label">
          ${this.localize(
            "ui.panel.config.automation.editor.target_summary.no_target"
          )}
        </div>
      </span>`;
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

    return html`<span class="target">
      <ha-svg-icon .path=${mdiFormatListBulleted}></ha-svg-icon>
      <div class="label">
        ${this.localize(
          "ui.panel.config.automation.editor.target_summary.targets",
          {
            count: totalLength,
          }
        )}
      </div>
    </span>`;
  }

  private _getLabel = (id: string) =>
    this._labelRegistry?.find(({ label_id }) => label_id === id);

  private _checkTargetExists(
    targetType: "floor" | "area" | "device" | "entity" | "label",
    targetId: string
  ): boolean {
    if (targetType === "floor") {
      return !!this.floors[targetId];
    }
    if (targetType === "area") {
      return !!this.areas[targetId];
    }
    if (targetType === "device") {
      return !!this.devices[targetId];
    }
    if (targetType === "entity") {
      return !!this.states[targetId];
    }
    if (targetType === "label") {
      return !!this._getLabel(targetId);
    }
    return false;
  }

  private _renderTargetBadge(
    icon: TemplateResult | typeof nothing,
    label: string,
    alert = false
  ) {
    return html`<div class="target ${alert ? "alert" : ""}">
      ${icon}
      <div class="label">${label}</div>
    </div>`;
  }

  private _renderTarget(
    targetType: "floor" | "area" | "device" | "entity" | "label",
    targetId: string
  ) {
    if (targetType === "entity" && ["all", "none"].includes(targetId)) {
      return this._renderTargetBadge(
        html`<ha-svg-icon .path=${mdiShape}></ha-svg-icon>`,
        this.localize(
          `ui.panel.config.automation.editor.target_summary.${targetId as "all" | "none"}_entities`
        )
      );
    }

    // Check if the target is a template
    if (isTemplate(targetId)) {
      return this._renderTargetBadge(
        html`<ha-svg-icon .path=${mdiCodeBraces}></ha-svg-icon>`,
        this.localize(
          "ui.panel.config.automation.editor.target_summary.template"
        )
      );
    }

    const exists = this._checkTargetExists(targetType, targetId);
    if (!exists) {
      return this._renderTargetBadge(
        html`<ha-svg-icon .path=${mdiAlert}></ha-svg-icon>`,
        getTargetText(this.hass, targetType, targetId, this._getLabel),
        true
      );
    }

    return this._renderTargetBadge(
      getTargetIcon(
        this.hass,
        targetType,
        targetId,
        this._configEntryLookup || {},
        this._getLabel
      ),
      getTargetText(this.hass, targetType, targetId, this._getLabel)
    );
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
      overflow: hidden;
      height: 32px;
    }
    .target.alert {
      background: var(--ha-color-fill-warning-normal-resting);
      color: var(--ha-color-on-warning-normal);
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-targets": HaAutomationRowTargets;
  }
}
