import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import "@polymer/paper-listbox/paper-listbox";
import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  customElement,
  property,
} from "lit-element";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { SubscribeMixin } from "../mixins/subscribe-mixin";

import { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { PolymerChangedEvent } from "../polymer-types";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
  createAreaRegistryEntry,
} from "../data/area_registry";
import {
  showPromptDialog,
  showAlertDialog,
} from "../dialogs/generic/show-dialog-box";

const rowRenderer = (
  root: HTMLElement,
  _owner,
  model: { item: AreaRegistryEntry }
) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
      <style>
        paper-item {
          margin: -10px 0;
          padding: 0;
        }
        paper-item.add-new {
            font-weight: 500;
        }
      </style>
      <paper-item>
        <paper-item-body two-line>
          <div class='name'>[[item.name]]</div>
        </paper-item-body>
      </paper-item>
      `;
  }
  root.querySelector(".name")!.textContent = model.item.name!;
  if (model.item.area_id === "add_new") {
    root.querySelector("paper-item")!.className = "add-new";
  } else {
    root.querySelector("paper-item")!.classList.remove("add-new");
  }
};

@customElement("ha-area-picker")
export class HaAreaPicker extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;
  @property() public label?: string;
  @property() public value?: string;
  @property() public _areas?: AreaRegistryEntry[];
  @property({ type: Boolean, attribute: "no-add" })
  public noAdd?: boolean;
  @property() private _opened?: boolean;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this._areas = this.noAdd
          ? areas
          : [
              ...areas,
              {
                area_id: "add_new",
                name: this.hass.localize("ui.components.area-picker.add_new"),
              },
            ];
      }),
    ];
  }

  protected render(): TemplateResult | void {
    if (!this._areas) {
      return;
    }
    return html`
      <vaadin-combo-box-light
        item-value-path="area_id"
        item-id-path="area_id"
        item-label-path="name"
        .items=${this._areas}
        .value=${this._value}
        .renderer=${rowRenderer}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._areaChanged}
      >
        <paper-input
          .label=${this.label === undefined && this.hass
            ? this.hass.localize("ui.components.area-picker.area")
            : this.label}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          ${this.value
            ? html`
                <paper-icon-button
                  aria-label=${this.hass.localize(
                    "ui.components.area-picker.clear"
                  )}
                  slot="suffix"
                  class="clear-button"
                  icon="hass:close"
                  @click=${this._clearValue}
                  no-ripple
                >
                  ${this.hass.localize("ui.components.area-picker.clear")}
                </paper-icon-button>
              `
            : ""}
          ${this._areas.length > 0
            ? html`
                <paper-icon-button
                  aria-label=${this.hass.localize(
                    "ui.components.area-picker.show_areas"
                  )}
                  slot="suffix"
                  class="toggle-button"
                  .icon=${this._opened ? "hass:menu-up" : "hass:menu-down"}
                >
                  ${this.hass.localize("ui.components.area-picker.toggle")}
                </paper-icon-button>
              `
            : ""}
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    this._setValue("");
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _areaChanged(ev: PolymerChangedEvent<string>) {
    const newValue = ev.detail.value;

    if (newValue !== "add_new") {
      if (newValue !== this._value) {
        this._setValue(newValue);
      }
      return;
    }

    (ev.target as any).value = this._value;
    showPromptDialog(this, {
      title: this.hass.localize("ui.components.area-picker.add_dialog.title"),
      text: this.hass.localize("ui.components.area-picker.add_dialog.text"),
      confirmText: this.hass.localize(
        "ui.components.area-picker.add_dialog.add"
      ),
      inputLabel: this.hass.localize(
        "ui.components.area-picker.add_dialog.name"
      ),
      confirm: async (name) => {
        if (!name) {
          return;
        }
        try {
          const area = await createAreaRegistryEntry(this.hass, {
            name,
          });
          this._areas = [...this._areas!, area];
          this._setValue(area.area_id);
        } catch (err) {
          showAlertDialog(this, {
            text: this.hass.localize(
              "ui.components.area-picker.add_dialog.failed_create_area"
            ),
          });
        }
      },
    });
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResult {
    return css`
      paper-input > paper-icon-button {
        width: 24px;
        height: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
      [hidden] {
        display: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-picker": HaAreaPicker;
  }
}
