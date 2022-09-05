import "@material/mwc-button";
import type { ActionDetail } from "@material/mwc-list";
import { mdiArrowDown, mdiArrowUp, mdiDrag, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-button-menu";
import type { HaSelect } from "../../../../components/ha-select";
import "../../../../components/ha-svg-icon";
import { Trigger } from "../../../../data/automation";
import { TRIGGER_TYPES } from "../../../../data/trigger";
import { sortableStyles } from "../../../../resources/ha-sortable-style";
import { SortableInstance } from "../../../../resources/sortable";
import { loadSortable } from "../../../../resources/sortable.ondemand";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-trigger-row";
import type HaAutomationTriggerRow from "./ha-automation-trigger-row";
import "./types/ha-automation-trigger-calendar";
import "./types/ha-automation-trigger-device";
import "./types/ha-automation-trigger-event";
import "./types/ha-automation-trigger-geo_location";
import "./types/ha-automation-trigger-homeassistant";
import "./types/ha-automation-trigger-mqtt";
import "./types/ha-automation-trigger-numeric_state";
import "./types/ha-automation-trigger-state";
import "./types/ha-automation-trigger-sun";
import "./types/ha-automation-trigger-tag";
import "./types/ha-automation-trigger-template";
import "./types/ha-automation-trigger-time";
import "./types/ha-automation-trigger-time_pattern";
import "./types/ha-automation-trigger-webhook";
import "./types/ha-automation-trigger-zone";

@customElement("ha-automation-trigger")
export default class HaAutomationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public triggers!: Trigger[];

  @property({ type: Boolean }) public reOrderMode = false;

  private _focusLastTriggerOnChange = false;

  private _triggerKeys = new WeakMap<Trigger, string>();

  private _sortable?: SortableInstance;

  protected render() {
    return html`
      <div class="triggers">
        ${repeat(
          this.triggers,
          (trigger) => this._getKey(trigger),
          (trg, idx) => html`
            <ha-automation-trigger-row
              .index=${idx}
              .trigger=${trg}
              .hideMenu=${this.reOrderMode}
              @duplicate=${this._duplicateTrigger}
              @value-changed=${this._triggerChanged}
              .hass=${this.hass}
            >
              ${this.reOrderMode
                ? html`
                    <ha-icon-button
                      .index=${idx}
                      slot="icons"
                      .label=${this.hass.localize(
                        "ui.panel.config.automation.editor.move_up"
                      )}
                      .path=${mdiArrowUp}
                      @click=${this._moveUp}
                      .disabled=${idx === 0}
                    ></ha-icon-button>
                    <ha-icon-button
                      .index=${idx}
                      slot="icons"
                      .label=${this.hass.localize(
                        "ui.panel.config.automation.editor.move_down"
                      )}
                      .path=${mdiArrowDown}
                      @click=${this._moveDown}
                      .disabled=${idx === this.triggers.length - 1}
                    ></ha-icon-button>
                    <div class="handle" slot="icons">
                      <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    </div>
                  `
                : ""}
            </ha-automation-trigger-row>
          `
        )}
        </div>
        <ha-button-menu @action=${this._addTrigger}>
          <mwc-button
            slot="trigger"
            outlined
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.add"
            )}
          >
            <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
          </mwc-button>
          ${this._processedTypes(this.hass.localize).map(
            ([opt, label, icon]) => html`
              <mwc-list-item .value=${opt} aria-label=${label} graphic="icon">
                ${label}<ha-svg-icon slot="graphic" .path=${icon}></ha-svg-icon
              ></mwc-list-item>
            `
          )}
        </ha-button-menu>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("reOrderMode")) {
      if (this.reOrderMode) {
        this._createSortable();
      } else {
        this._destroySortable();
      }
    }

    if (changedProps.has("triggers") && this._focusLastTriggerOnChange) {
      this._focusLastTriggerOnChange = false;

      const row = this.shadowRoot!.querySelector<HaAutomationTriggerRow>(
        "ha-automation-trigger-row:last-of-type"
      )!;
      row.updateComplete.then(() => {
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  private async _createSortable() {
    const Sortable = await loadSortable();
    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".triggers")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        handle: ".handle",
        onChoose: (evt: SortableEvent) => {
          (evt.item as any).placeholder =
            document.createComment("sort-placeholder");
          evt.item.after((evt.item as any).placeholder);
        },
        onEnd: (evt: SortableEvent) => {
          // put back in original location
          if ((evt.item as any).placeholder) {
            (evt.item as any).placeholder.replaceWith(evt.item);
            delete (evt.item as any).placeholder;
          }
          this._dragged(evt);
        },
      }
    );
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _getKey(action: Trigger) {
    if (!this._triggerKeys.has(action)) {
      this._triggerKeys.set(action, Math.random().toString());
    }

    return this._triggerKeys.get(action)!;
  }

  private _addTrigger(ev: CustomEvent<ActionDetail>) {
    const platform = (ev.currentTarget as HaSelect).items[ev.detail.index]
      .value as Trigger["platform"];

    const elClass = customElements.get(
      `ha-automation-trigger-${platform}`
    ) as CustomElementConstructor & {
      defaultConfig: Omit<Trigger, "platform">;
    };

    const triggers = this.triggers.concat({
      platform: platform as any,
      ...elClass.defaultConfig,
    });
    this._focusLastTriggerOnChange = true;
    fireEvent(this, "value-changed", { value: triggers });
  }

  private _moveUp(ev) {
    const index = (ev.target as any).index;
    const newIndex = index - 1;
    this._move(index, newIndex);
  }

  private _moveDown(ev) {
    const index = (ev.target as any).index;
    const newIndex = index + 1;
    this._move(index, newIndex);
  }

  private _dragged(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) return;
    this._move(ev.oldIndex!, ev.newIndex!);
  }

  private _move(index: number, newIndex: number) {
    const triggers = this.triggers.concat();
    const trigger = triggers.splice(index, 1)[0];
    triggers.splice(newIndex, 0, trigger);
    fireEvent(this, "value-changed", { value: triggers });
  }

  private _triggerChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const triggers = [...this.triggers];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      triggers.splice(index, 1);
    } else {
      // Store key on new value.
      const key = this._getKey(triggers[index]);
      this._triggerKeys.set(newValue, key);

      triggers[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: triggers });
  }

  private _duplicateTrigger(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.triggers.concat(deepClone(this.triggers[index])),
    });
  }

  private _processedTypes = memoizeOne(
    (localize: LocalizeFunc): [string, string, string][] =>
      Object.entries(TRIGGER_TYPES)
        .map(
          ([action, icon]) =>
            [
              action,
              localize(
                `ui.panel.config.automation.editor.triggers.type.${action}.label`
              ),
              icon,
            ] as [string, string, string]
        )
        .sort((a, b) => stringCompare(a[1], b[1]))
  );

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        ha-automation-trigger-row {
          display: block;
          margin-bottom: 16px;
          scroll-margin-top: 48px;
        }
        ha-svg-icon {
          height: 20px;
        }
        .handle {
          cursor: move;
          padding: 12px;
        }
        .handle ha-svg-icon {
          pointer-events: none;
          height: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger": HaAutomationTrigger;
  }
}
