import type { ContextType } from "@lit/context";
import { mdiContentPaste } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../../common/decorators/consume";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import {
  internationalizationContext,
  labelsContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { SingleHassServiceTarget } from "../../../../data/target";
import type { AddAutomationElementDialogParams } from "../show-add-automation-element-dialog";
import "../target/ha-automation-row-targets";

const MAX_SUGGESTED_TARGETS = 10;

const MAX_NEW_DEVICES = 3;

const NEW_DEVICE_MAX_AGE = 7 * 24 * 60 * 60;

@customElement("ha-automation-add-suggestions")
export class HaAutomationAddSuggestions extends LitElement {
  @property({ attribute: false })
  public suggestedTargets?: SingleHassServiceTarget[];

  @property({ attribute: false }) public clipboardItem?: string;

  @property({ attribute: false })
  public automationElementType!: AddAutomationElementDialogParams["type"];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];

  private _getTargets = memoizeOne(
    (
      suggestedTargets: SingleHassServiceTarget[],
      states: ContextType<typeof statesContext>,
      registries: ContextType<typeof registriesContext>,
      labelRegistry: LabelRegistryEntry[]
    ): SingleHassServiceTarget[] => {
      const since = Date.now() / 1000 - NEW_DEVICE_MAX_AGE;
      const newDevices = Object.values(registries.devices)
        .filter((device) => !device.disabled_by && device.created_at > since)
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, MAX_NEW_DEVICES)
        .map((device) => device.id);

      const suggested = suggestedTargets
        .filter((target) => {
          const [key, id] = Object.entries(target)[0];
          return key === "entity_id"
            ? !!states[id]
            : key === "device_id"
              ? !!registries.devices[id] &&
                !registries.devices[id].disabled_by &&
                !newDevices.includes(id)
              : key === "area_id"
                ? !!registries.areas[id]
                : key === "floor_id"
                  ? !!registries.floors[id]
                  : labelRegistry.some((label) => label.label_id === id);
        })
        .slice(0, MAX_SUGGESTED_TARGETS - newDevices.length);

      return [
        ...suggested,
        ...newDevices.map((id): SingleHassServiceTarget => ({ device_id: id })),
      ];
    }
  );

  protected render() {
    const targets = this._getTargets(
      this.suggestedTargets ?? [],
      this._states,
      this._registries,
      this._labelRegistry
    );

    if (!this.clipboardItem && !targets.length) {
      return nothing;
    }

    return html`<div
      class="chips"
      role="group"
      aria-label=${this._i18n.localize(
        "ui.panel.config.automation.editor.suggestions"
      )}
    >
      ${
        this.clipboardItem
          ? html`<button class="paste" @click=${this._paste}>
              <ha-svg-icon .path=${mdiContentPaste}></ha-svg-icon>
              <span class="paste-text">
                <span class="paste-hint"
                  >${this._i18n.localize(
                    `ui.panel.config.automation.editor.${this.automationElementType}s.paste`
                  )}</span
                >
                <span class="paste-label"
                  >${this._i18n.localize(
                    // @ts-ignore
                    `ui.panel.config.automation.editor.${this.automationElementType}s.type.${this.clipboardItem}.label`
                  )}</span
                >
              </span>
            </button>`
          : nothing
      }
      ${targets.map(
        (target) =>
          html`<span class="chip"
            ><ha-automation-row-targets
              .target=${target}
              selectable
            ></ha-automation-row-targets
          ></span>`
      )}
    </div>`;
  }

  private _paste() {
    fireEvent(this, "paste-element");
  }

  static styles = css`
    :host {
      display: block;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ha-space-2);
      padding: var(--ha-space-3) var(--ha-space-4);
      border-top: var(--ha-border-width-sm) solid
        var(--ha-color-border-neutral-quiet);
    }

    .chip {
      display: inline-flex;
      flex-shrink: 0;
      max-width: 100%;
    }

    .paste {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      gap: var(--ha-space-1);
      min-height: 32px;
      box-sizing: border-box;
      padding: var(--ha-space-1) var(--ha-space-2) var(--ha-space-1)
        var(--ha-space-1);
      border-radius: var(--ha-border-radius-md);
      border: var(--ha-border-width-sm) solid
        var(--ha-color-border-primary-quiet);
      background: var(--ha-color-fill-primary-quiet-resting);
      color: var(--ha-color-on-primary-normal);
      font: inherit;
      cursor: pointer;
    }

    .paste-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.2;
    }

    .paste-hint {
      font-size: var(--ha-font-size-s);
      color: var(--ha-color-on-neutral-quiet);
    }

    .paste-label {
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      white-space: nowrap;
    }

    .paste:hover {
      background: var(--ha-color-fill-primary-quiet-hover);
    }

    .paste ha-svg-icon {
      padding: var(--ha-space-1) 0;
      color: inherit;
    }

    @media all and (max-width: 870px), all and (max-height: 500px) {
      .chips {
        flex-wrap: nowrap;
        overflow-x: auto;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-suggestions": HaAutomationAddSuggestions;
  }
}
