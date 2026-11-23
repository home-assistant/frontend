import { mdiArrowRight, mdiStarFourPoints } from "@mdi/js";
import type { HassEntities, HassServices } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { stringifyPath } from "../../../../common/util/config-path";
import "../../../../components/ha-svg-icon";
import {
  areasContext,
  devicesContext,
  floorsContext,
  labelsContext,
  localeContext,
  servicesContext,
  statesContext,
} from "../../../../data/context";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { HomeAssistant } from "../../../../types";
import {
  automationRowRegistryContext,
  type AutomationRowRegistry,
} from "../automation-path";
import { describeFieldChanges } from "./automation-ai-change-text";
import {
  automationDiffContext,
  diffMarkAt,
  type AutomationDiff,
} from "./automation-ai-diff";

/**
 * @summary What the AI changed in the row open in the sidebar, in the words
 * of the editor.
 */
@customElement("ha-automation-ai-changes")
export class HaAutomationAiChanges extends LitElement {
  /** In YAML mode the editor shows the changes instead. */
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

  // Names for ids, read when the changes render, which they rarely do
  @consume({ context: statesContext }) private _states?: HassEntities;

  @consume({ context: servicesContext }) private _services?: HassServices;

  @consume({ context: devicesContext })
  private _devices?: HomeAssistant["devices"];

  @consume({ context: areasContext }) private _areas?: HomeAssistant["areas"];

  @consume({ context: floorsContext })
  private _floors?: HomeAssistant["floors"];

  @consume({ context: labelsContext }) private _labels?: LabelRegistryEntry[];

  @consume({ context: localeContext })
  private _locale?: HomeAssistant["locale"];

  protected render() {
    const path = this._diff && this._registry?.selectedPath();
    const mark = path && diffMarkAt(this._diff, path);
    if (!path || !mark || this.yamlMode) {
      return nothing;
    }
    const key = stringifyPath(path);
    // A whole added or removed row needs no list of its fields
    const lines =
      mark === "changed"
        ? describeFieldChanges(
            this._diff!.fields.get(key) ?? [],
            this._diff!.items.get(key)?.after ??
              this._diff!.items.get(key)?.before,
            {
              localize: this._localize,
              locale: this._locale,
              states: this._states,
              services: this._services,
              devices: this._devices,
              areas: this._areas,
              floors: this._floors,
              labels: this._labels,
            }
          )
        : [];

    return html`
      <div class="changes ${mark}">
        <div class="title">
          <ha-svg-icon .path=${mdiStarFourPoints}></ha-svg-icon>
          ${this._localize(`ui.panel.config.automation.editor.ai.changes.title_${mark}`)}
        </div>
        ${
          lines.length
            ? html`<ul>
                ${lines.map(
                  (line) => html`
                    <li>
                      <span class="label">
                        ${line.label}
                        ${
                          line.mark === "changed"
                            ? nothing
                            : html`<span class="mark ${line.mark}"
                                >${this._localize(
                                  `ui.panel.config.automation.editor.ai.changes.${line.mark}`
                                )}</span
                              >`
                        }
                      </span>
                      <span class="values">
                        ${
                          line.oldValue !== undefined
                            ? html`<del>${line.oldValue}</del>`
                            : nothing
                        }
                        ${
                          line.mark === "changed"
                            ? html`<ha-svg-icon
                                class="arrow"
                                .path=${mdiArrowRight}
                              ></ha-svg-icon>`
                            : nothing
                        }
                        ${
                          line.newValue !== undefined
                            ? html`<ins>${line.newValue}</ins>`
                            : nothing
                        }
                      </span>
                    </li>
                  `
                )}
              </ul>`
            : nothing
        }
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
      margin: var(--ha-space-3) 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
    }
    li {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
    }
    .label {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }
    .mark {
      padding: 0 var(--ha-space-2);
      border-radius: var(--ha-border-radius-pill);
      font-size: var(--ha-font-size-xs);
      font-weight: var(--ha-font-weight-medium);
      background-color: var(--ha-color-fill-success-normal-resting);
      color: var(--ha-color-on-success-normal);
    }
    .mark.removed {
      background-color: var(--ha-color-fill-danger-normal-resting);
      color: var(--ha-color-on-danger-normal);
    }
    .values {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ha-space-1) var(--ha-space-2);
      word-break: break-word;
    }
    .arrow {
      --mdc-icon-size: 16px;
      color: var(--secondary-text-color);
    }
    del {
      color: var(--secondary-text-color);
    }
    ins {
      text-decoration: none;
      font-weight: var(--ha-font-weight-medium);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-ai-changes": HaAutomationAiChanges;
  }
}
