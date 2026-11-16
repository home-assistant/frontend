import { mdiStarFourPoints } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { stringifyPath } from "../../../../common/util/config-path";
import "../../../../components/ha-svg-icon";
import {
  automationRowRegistryContext,
  type AutomationRowRegistry,
} from "../automation-path";
import {
  automationDiffContext,
  diffMarkAt,
  type AutomationDiff,
  type FieldChange,
} from "./automation-ai-diff";

const formatValue = (value: unknown): string =>
  value === undefined
    ? "—"
    : typeof value === "string"
      ? value
      : JSON.stringify(value);

/**
 * @summary What the AI changed in the row open in the sidebar.
 */
@customElement("ha-automation-ai-changes")
export class HaAutomationAiChanges extends LitElement {
  /** In YAML mode the editor shows the changes, except of a removed row. */
  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @state()
  @consume({ context: automationDiffContext, subscribe: true })
  private _diff?: AutomationDiff;

  // Read on render, the sidebar renders again for another row
  @consume({ context: automationRowRegistryContext })
  private _registry?: AutomationRowRegistry;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    const path = this._diff && this._registry?.selectedPath();
    const mark = path && diffMarkAt(this._diff, path);
    if (!path || !mark || (this.yamlMode && mark !== "removed")) {
      return nothing;
    }
    const changes: FieldChange[] =
      mark === "changed"
        ? (this._diff!.fields.get(stringifyPath(path)) ?? [])
        : [{ path: [], mark }];

    return html`
      <div class="changes ${mark}">
        <div class="title">
          <ha-svg-icon .path=${mdiStarFourPoints}></ha-svg-icon>
          ${this._localize("ui.panel.config.automation.editor.ai.changes.title")}
        </div>
        <ul>
          ${changes.map(
            (change) => html`
              <li class=${change.mark}>
                <span class="field">
                  ${
                    change.path.length
                      ? change.path.join(".")
                      : this._localize(
                          "ui.panel.config.automation.editor.ai.changes.whole_item"
                        )
                  }:
                  ${this._localize(
                    `ui.panel.config.automation.editor.ai.changes.${change.mark}`
                  )}
                </span>
                ${
                  change.mark === "changed"
                    ? html`<span class="values">
                        <del>${formatValue(change.oldValue)}</del>
                        <ins>${formatValue(change.newValue)}</ins>
                      </span>`
                    : change.path.length
                      ? html`<span class="values">
                          ${
                            change.mark === "removed"
                              ? html`<del>${formatValue(change.oldValue)}</del>`
                              : html`<ins>${formatValue(change.newValue)}</ins>`
                          }
                        </span>`
                      : nothing
                }
              </li>
            `
          )}
        </ul>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .changes {
      margin: var(--ha-space-2) 0 var(--ha-space-4);
      padding: var(--ha-space-3);
      border-radius: var(--ha-border-radius-lg);
      border-inline-start: 4px solid var(--ha-color-border-warning-loud);
      background-color: var(--ha-color-fill-warning-quiet-resting);
    }
    .changes.added {
      border-inline-start-color: var(--ha-color-border-success-loud);
      background-color: var(--ha-color-fill-success-quiet-resting);
    }
    .changes.removed {
      border-inline-start-color: var(--ha-color-border-danger-loud);
      background-color: var(--ha-color-fill-danger-quiet-resting);
    }
    .title {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      font-weight: var(--ha-font-weight-medium);
    }
    .title ha-svg-icon {
      --mdc-icon-size: 18px;
    }
    ul {
      margin: var(--ha-space-2) 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
    li {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
    }
    .field {
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-s);
    }
    .values {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-s);
      word-break: break-word;
    }
    del {
      color: var(--ha-color-on-danger-quiet);
    }
    ins {
      color: var(--ha-color-on-success-quiet);
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-ai-changes": HaAutomationAiChanges;
  }
}
