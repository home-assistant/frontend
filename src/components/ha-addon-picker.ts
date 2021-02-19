import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { compare } from "../common/string/compare";
import { HassioAddonInfo } from "../data/hassio/addon";
import { fetchHassioSupervisorInfo } from "../data/hassio/supervisor";
import { HomeAssistant } from "../types";
import { PolymerChangedEvent } from "../polymer-types";
import { HaComboBox } from "./ha-combo-box";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { isComponentLoaded } from "../common/config/is_component_loaded";

const rowRenderer = (
  root: HTMLElement,
  _owner,
  model: { item: HassioAddonInfo }
) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
    <style>
      paper-item {
        margin: -10px 0;
        padding: 0;
      }
    </style>
    <paper-item>
      <paper-item-body two-line="">
        <div class='name'>[[item.name]]</div>
        <div secondary>[[item.area]]</div>
      </paper-item-body>
    </paper-item>
    `;
  }

  root.querySelector(".name")!.textContent = model.item.name;
  root.querySelector("[secondary]")!.textContent = model.item.slug;
};

@customElement("ha-addon-picker")
class HaAddonPicker extends LitElement {
  public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value = "";

  @internalProperty() private _addons?: HassioAddonInfo[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) private _opened?: boolean;

  @query("ha-combo-box") private _comboBox!: HaComboBox;

  private _init = false;

  public open() {
    this._comboBox?.open();
  }

  public focus() {
    this._comboBox?.focus();
  }

  private _processedAddons = memoizeOne((addons?: HassioAddonInfo[]) => {
    if (!addons) {
      return [];
    }
    return addons.sort((a, b) => compare(a.name, b.name));
  });

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this._addons) ||
      (changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      (this._comboBox as any).items = this._processedAddons(this._addons);
    }
  }

  protected firstUpdated() {
    this._getAddons();
  }

  protected render(): TemplateResult {
    if (!this._addons) {
      return html``;
    }
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.addon-picker.addon")
          : this.label}
        .value=${this._value}
        .renderer=${rowRenderer}
        item-value-path="slug"
        item-id-path="slug"
        item-label-path="name"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._addonChanged}
      ></ha-combo-box>
    `;
  }

  private async _getAddons() {
    try {
      if (isComponentLoaded(this.hass, "hassio")) {
        const supervisorInfo = await fetchHassioSupervisorInfo(this.hass);
        this._addons = this._processedAddons(supervisorInfo.addons);
      } else {
        showAlertDialog(this, {
          title: "No Supervisor",
          text: "No Supervisor found, so add-ons could not be loaded.",
        });
      }
    } catch (err) {
      showAlertDialog(this, {
        title: "Error fetching add-ons",
        text: err,
      });
    }
  }

  private get _value() {
    return this.value || "";
  }

  private _addonChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
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
      paper-input > mwc-icon-button {
        --mdc-icon-button-size: 24px;
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
    "ha-addon-picker": HaAddonPicker;
  }
}
