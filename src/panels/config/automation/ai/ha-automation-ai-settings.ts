import { mdiDebugStepOver, mdiFormTextbox, mdiShapeOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-markdown";
import "../../../../components/ha-svg-icon";
import {
  AUTOMATION_DEFAULT_MAX,
  AUTOMATION_DEFAULT_MODE,
} from "../../../../data/automation";
import { isMaxMode, type MODES, type MODES_MAX } from "../../../../data/script";
import type { AiEditorConfig } from "./automation-ai-agent";
import {
  automationDiffContext,
  type AutomationDiff,
  type DiffMark,
} from "./automation-ai-diff";

interface SettingChange {
  icon: string;
  mark: DiffMark;
  text: string;
}

type LocalizeKey = Parameters<LocalizeFunc>[0];

/**
 * @summary The top of the visual editor: the description, and the settings
 * the AI changed that the editor only has in dialogs, like the mode.
 */
@customElement("ha-automation-ai-settings")
export class HaAutomationAiSettings extends LitElement {
  /** The config the editor shows. */
  @property({ attribute: false }) public config!: AiEditorConfig;

  @state()
  @consume({ context: automationDiffContext, subscribe: true })
  private _diff?: AutomationDiff;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    const changes = this._changes();
    return html`
      ${
        changes.length
          ? html`<div class="changes">
              ${changes.map(
                (change) =>
                  html`<span class="change ${change.mark}">
                    <ha-svg-icon .path=${change.icon}></ha-svg-icon>${
                      change.text
                    }
                  </span>`
              )}
            </div>`
          : nothing
      }
      ${this._renderDescription()}
    `;
  }

  private _changes(): SettingChange[] {
    const diff = this._diff;
    if (!diff || "use_blueprint" in this.config) {
      return [];
    }
    const before = diff.before;
    const oldMode = before.mode || AUTOMATION_DEFAULT_MODE;
    const newMode = this.config.mode || AUTOMATION_DEFAULT_MODE;
    const oldMax = isMaxMode(oldMode)
      ? before.max || AUTOMATION_DEFAULT_MAX
      : undefined;
    const newMax = isMaxMode(newMode)
      ? this.config.max || AUTOMATION_DEFAULT_MAX
      : undefined;
    const modeName = (mode: string) =>
      this._localize(
        `ui.panel.config.automation.editor.modes.${mode as (typeof MODES)[number]}`
      );
    const valueChanged = (
      name: string,
      old: string | number,
      value: string | number
    ) =>
      this._localize(
        "ui.panel.config.automation.editor.ai.changes.value_changed",
        { name, old, new: value }
      );
    // Settings of scripts, which only say whether they changed
    const marked = (key: string, name: LocalizeKey, icon: string) => {
      const mark = diff.settings[key];
      return mark
        ? [
            {
              icon,
              mark,
              text: this._localize(
                "ui.panel.config.automation.editor.ai.changes.setting_marked",
                {
                  name: this._localize(name),
                  change: this._localize(
                    `ui.panel.config.automation.editor.ai.changes.${mark}`
                  ),
                }
              ),
            },
          ]
        : [];
    };
    return [
      ...(oldMode !== newMode
        ? [
            {
              icon: mdiDebugStepOver,
              mark: "changed" as const,
              text: valueChanged(
                this._localize("ui.panel.config.automation.editor.modes.label"),
                modeName(oldMode),
                modeName(newMode)
              ),
            },
          ]
        : []),
      ...(newMax !== undefined && oldMax !== newMax
        ? [
            {
              icon: mdiDebugStepOver,
              mark: "changed" as const,
              text: valueChanged(
                this._localize(
                  `ui.panel.config.automation.editor.max.${newMode as (typeof MODES_MAX)[number]}`
                ),
                oldMax ?? "—",
                newMax
              ),
            },
          ]
        : []),
      ...marked(
        "icon",
        "ui.panel.config.automation.editor.icon",
        mdiShapeOutline
      ),
      ...marked(
        "fields",
        "ui.panel.config.script.editor.field.fields",
        mdiFormTextbox
      ),
    ];
  }

  private _renderDescription() {
    const mark = this._diff?.settings.description;
    // A removed description is shown as it was, struck through
    const description =
      mark === "removed"
        ? this._diff?.before.description
        : this.config.description;
    if (!description) {
      return nothing;
    }
    return html`<ha-markdown
      class=${classMap({ description: true, [`diff-${mark}`]: !!mark })}
      breaks
      .content=${description}
    ></ha-markdown>`;
  }

  static styles = css`
    :host {
      display: block;
    }
    /* Chips, so the settings don't look like the description */
    .changes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
      margin-top: 16px;
    }
    .change {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1);
      height: 32px;
      box-sizing: border-box;
      padding-inline: var(--ha-space-2) var(--ha-space-3);
      border-radius: var(--ha-border-radius-pill);
      border: 1px solid var(--ha-color-border-warning-normal);
      background-color: var(--ha-color-fill-warning-normal-resting);
      color: var(--ha-color-on-warning-normal);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
    }
    .change.added {
      border-color: var(--ha-color-border-success-normal);
      background-color: var(--ha-color-fill-success-normal-resting);
      color: var(--ha-color-on-success-normal);
    }
    .change.removed {
      border-color: var(--ha-color-border-danger-normal);
      background-color: var(--ha-color-fill-danger-normal-resting);
      color: var(--ha-color-on-danger-normal);
    }
    .change ha-svg-icon {
      --mdc-icon-size: 18px;
    }
    .description {
      display: block;
      margin-top: 16px;
    }
    .description[class*="diff-"] {
      padding: var(--ha-space-1) var(--ha-space-3);
      border-radius: var(--ha-border-radius-md);
      border-inline-start: 4px solid var(--ha-color-border-warning-loud);
      background-color: var(--ha-color-fill-warning-quiet-resting);
    }
    .description.diff-added {
      border-inline-start-color: var(--ha-color-border-success-loud);
      background-color: var(--ha-color-fill-success-quiet-resting);
    }
    .description.diff-removed {
      border-inline-start-color: var(--ha-color-border-danger-loud);
      background-color: var(--ha-color-fill-danger-quiet-resting);
      text-decoration: line-through;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-ai-settings": HaAutomationAiSettings;
  }
}
