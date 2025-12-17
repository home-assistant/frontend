import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { titleCase } from "../common/string/title-case";
import { fetchConfig } from "../data/lovelace/config/types";
import { getPanelIcon, getPanelTitle } from "../data/panel";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-generic-picker";
import "./ha-icon";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

@customElement("ha-navigation-picker")
export class HaNavigationPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() private _loading = true;

  protected firstUpdated() {
    this._loadNavigationItems();
  }

  private _navigationItems: PickerComboBoxItem[] = [];

  protected render() {
    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .value=${this._loading ? undefined : this.value}
        allow-custom-value
        .placeholder=${this.label}
        .helper=${this.helper}
        .disabled=${this._loading || this.disabled}
        .required=${this.required}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer}
        .customValueLabel=${this.hass.localize(
          "ui.components.navigation-picker.add_custom_path"
        )}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueRenderer = (itemId: string) => {
    const item = this._navigationItems.find((navItem) => navItem.id === itemId);
    return html`
      ${item?.icon
        ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
        : nothing}
      <span slot="headline">${item?.primary || itemId}</span>
      ${item?.primary
        ? html`<span slot="supporting-text">${itemId}</span>`
        : nothing}
    `;
  };

  private _getItems = () => this._navigationItems;

  private async _loadNavigationItems() {
    const panels = Object.entries(this.hass!.panels).map(([id, panel]) => ({
      id,
      ...panel,
    }));
    const lovelacePanels = panels.filter(
      (panel) => panel.component_name === "lovelace"
    );

    const viewConfigs = await Promise.all(
      lovelacePanels.map((panel) =>
        fetchConfig(
          this.hass!.connection,
          // path should be null to fetch default lovelace panel
          panel.url_path === "lovelace" ? null : panel.url_path,
          true
        )
          .then((config) => [panel.id, config] as [string, typeof config])
          .catch((_) => [panel.id, undefined] as [string, undefined])
      )
    );

    const panelViewConfig = new Map(viewConfigs);

    this._navigationItems = [];

    for (const panel of panels) {
      const path = `/${panel.url_path}`;
      const panelTitle = getPanelTitle(this.hass, panel);
      const primary = panelTitle || path;
      this._navigationItems.push({
        id: path,
        primary,
        secondary: panelTitle ? path : undefined,
        icon: getPanelIcon(panel) || "mdi:view-dashboard",
        sorting_label: [
          primary.startsWith("/") ? `zzz${primary}` : primary,
          path,
        ]
          .filter(Boolean)
          .join("_"),
      });

      const config = panelViewConfig.get(panel.id);

      if (!config || !("views" in config)) continue;

      config.views.forEach((view, index) => {
        const viewPath = `/${panel.url_path}/${view.path ?? index}`;
        const viewPrimary =
          view.title ?? (view.path ? titleCase(view.path) : `${index}`);
        this._navigationItems.push({
          id: viewPath,
          secondary: viewPath,
          icon: view.icon ?? "mdi:view-compact",
          primary: viewPrimary,
          sorting_label: [
            viewPrimary.startsWith("/") ? `zzz${viewPrimary}` : viewPrimary,
            viewPath,
          ].join("_"),
        });
      });
    }

    this._loading = false;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    this._setValue(ev.detail.value);
  }

  private _setValue(value = "") {
    this.value = value;
    fireEvent(
      this,
      "value-changed",
      { value: this.value },
      {
        bubbles: false,
        composed: false,
      }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-navigation-picker": HaNavigationPicker;
  }
}
