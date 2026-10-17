import { ContextProvider } from "@lit/context";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-picker-combo-box";
import type { PickerComboBoxItem } from "../../../../src/components/ha-picker-combo-box";
import { internationalizationContext } from "../../../../src/data/context";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../../../src/data/translation";
import type {
  HomeAssistantInternationalization,
  ValueChangedEvent,
} from "../../../../src/types";
import { THEME_COMPARISON_PANELS } from "../../components/demo-theme-comparison";

const LOCALIZE_KEYS: Record<string, string> = {
  "ui.common.search": "Search",
  "ui.components.combo-box.no_match": "No matching items found",
  "ui.components.combo-box.no_items": "No items available",
};

const localize = (key: string) => LOCALIZE_KEYS[key] ?? key;

const DEMO_I18N: HomeAssistantInternationalization = {
  localize,
  language: "en",
  selectedLanguage: null,
  locale: {
    language: "en",
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    first_weekday: FirstWeekday.language,
    time_zone: TimeZone.local,
  },
  translationMetadata: { fragments: [], translations: {} },
  loadBackendTranslation: async () => localize,
  loadFragmentTranslation: async () => localize,
};

const PLAIN_ITEMS: PickerComboBoxItem[] = [
  { id: "light.desk", primary: "Desk", secondary: "Office" },
  { id: "light.dining_table", primary: "Dining table", secondary: "Kitchen" },
  { id: "light.doorway", primary: "Doorway", secondary: "Hallway" },
  { id: "light.hallway", primary: "Hallway", secondary: "Hallway" },
  {
    id: "light.kitchen_counter",
    primary: "Kitchen counter",
    secondary: "Kitchen",
  },
  { id: "light.porch", primary: "Porch", secondary: "Outside" },
  { id: "light.reading_lamp", primary: "Reading lamp", secondary: "Bedroom" },
  {
    id: "light.shed",
    primary: "Shed (disabled)",
    secondary: "Outside",
    disabled: true,
  },
  { id: "light.workbench", primary: "Workbench", secondary: "Garage" },
];

const AREAS = [
  "Attic",
  "Basement",
  "Bedroom",
  "Dining room",
  "Garage",
  "Hallway",
  "Kitchen",
  "Living room",
  "Office",
  "Outside",
];

const FIXTURES = [
  "Ceiling",
  "Corner lamp",
  "Cupboard",
  "Desk lamp",
  "Downlight",
  "Floor lamp",
  "Shelf",
  "Spotlight",
  "Strip",
  "Wall sconce",
];

const VIRTUALIZED_ITEMS: PickerComboBoxItem[] = AREAS.flatMap((area, a) =>
  FIXTURES.flatMap((fixture) =>
    [1, 2].map((offset) => {
      const n = a * 2 + offset;
      return {
        id: `light.${fixture.toLowerCase().replace(/ /g, "_")}_${n}`,
        primary: `${fixture} ${n}`,
        secondary: area,
      };
    })
  )
);

@customElement("demo-components-ha-picker-combo-box")
export class DemoHaPickerComboBox extends LitElement {
  @state() private _plainValue?: string;

  @state() private _virtualizedValue?: string;

  @state() private _preselectedValue = "light.spotlight_13";

  constructor() {
    super();
    // Provides internationalizationContext for ha-picker-combo-box and ha-input-search
    new ContextProvider(this, {
      context: internationalizationContext,
      initialValue: DEMO_I18N,
    });
  }

  protected render(): TemplateResult {
    return html`
      <demo-theme-comparison>
        ${THEME_COMPARISON_PANELS.map(
          ({ slot }) => html`
            <div slot=${slot} class="panel-content">
              <ha-card header="Plain list (9 items)">
                <div class="card-content">
                  <p class="note">
                    At or below 12 items the list renders with
                    <code>repeat()</code>, so every row is in the DOM. One item
                    is disabled, so neither a click nor <kbd>Enter</kbd>
                    picks it.
                  </p>
                  <div class="picker">
                    <ha-picker-combo-box
                      .getItems=${this._getPlainItems}
                      .value=${this._plainValue}
                      @value-changed=${this._plainValueChanged}
                    ></ha-picker-combo-box>
                  </div>
                  <p class="value">
                    Picked: <code>${this._plainValue ?? "—"}</code>
                  </p>
                </div>
              </ha-card>

              <ha-card header="Virtualized list (200 items)">
                <div class="card-content">
                  <p class="note">
                    Above 12 items the list switches to
                    <code>lit-virtualizer</code> and only the visible rows
                    exist.
                  </p>
                  <div class="picker">
                    <ha-picker-combo-box
                      .getItems=${this._getVirtualizedItems}
                      .value=${this._virtualizedValue}
                      @value-changed=${this._virtualizedValueChanged}
                    ></ha-picker-combo-box>
                  </div>
                  <p class="value">
                    Picked: <code>${this._virtualizedValue ?? "—"}</code>
                  </p>
                </div>
              </ha-card>

              <ha-card header="Empty">
                <div class="card-content">
                  <p class="note">
                    With no items the list shows
                    <code>emptyLabel</code>, or a localized fallback. Searching
                    a non-empty list that matches nothing shows
                    <code>notFoundLabel</code> instead.
                  </p>
                  <div class="picker">
                    <ha-picker-combo-box
                      .getItems=${this._getNoItems}
                    ></ha-picker-combo-box>
                  </div>
                </div>
              </ha-card>

              <ha-card header="With a current value">
                <div class="card-content">
                  <p class="note">
                    A set <code>value</code> marks its row
                    <code>selected</code>. The keyboard cursor is a separate
                    highlight, and <kbd>↓</kbd> starts it on this row.
                  </p>
                  <div class="picker">
                    <ha-picker-combo-box
                      .getItems=${this._getVirtualizedItems}
                      .value=${this._preselectedValue}
                      @value-changed=${this._preselectedValueChanged}
                    ></ha-picker-combo-box>
                  </div>
                  <p class="value">
                    Current: <code>${this._preselectedValue}</code>
                  </p>
                </div>
              </ha-card>
            </div>
          `
        )}
      </demo-theme-comparison>
    `;
  }

  private _getPlainItems = () => PLAIN_ITEMS;

  private _getVirtualizedItems = () => VIRTUALIZED_ITEMS;

  private _getNoItems = (): PickerComboBoxItem[] => [];

  private _plainValueChanged(ev: ValueChangedEvent<string>) {
    this._plainValue = ev.detail.value;
  }

  private _virtualizedValueChanged(ev: ValueChangedEvent<string>) {
    this._virtualizedValue = ev.detail.value;
  }

  private _preselectedValueChanged(ev: ValueChangedEvent<string>) {
    this._preselectedValue = ev.detail.value;
  }

  static styles = css`
    :host {
      display: block;
    }
    .panel-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }
    ha-card {
      margin: 0;
      width: 100%;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
    .note {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
    .picker {
      display: flex;
      flex-direction: column;
      max-height: 320px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-md);
      overflow: hidden;
    }
    .value {
      margin: 0;
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-picker-combo-box": DemoHaPickerComboBox;
  }
}
