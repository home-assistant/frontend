import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../src/common/dom/fire_event";
import type { ThemeSettings } from "../../../src/types";
import {
  applyFlippedGalleryTheme,
  effectiveGalleryDarkMode,
  loadGalleryThemeSettings,
} from "../common/theme";

const mql = matchMedia("(prefers-color-scheme: dark)");

export const THEME_COMPARISON_PANELS = [
  { slot: "current" },
  { slot: "flipped" },
] as const;

@customElement("demo-theme-comparison")
export class DemoThemeComparison extends LitElement {
  @state() private _themeSettings = loadGalleryThemeSettings();

  @state() private _systemDark = mql.matches;

  @query(".flipped") private _flipped?: HTMLElement;

  connectedCallback() {
    super.connectedCallback();
    mql.addEventListener("change", this._systemDarkChanged);
    window.addEventListener(
      "theme-settings-changed",
      this._themeSettingsChanged as EventListener
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    mql.removeEventListener("change", this._systemDarkChanged);
    window.removeEventListener(
      "theme-settings-changed",
      this._themeSettingsChanged as EventListener
    );
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._applyFlippedTheme();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (
      changedProperties.has("_themeSettings") ||
      changedProperties.has("_systemDark")
    ) {
      this._applyFlippedTheme();
    }
  }

  protected render(): TemplateResult {
    const currentLabel = effectiveGalleryDarkMode(
      this._themeSettings,
      this._systemDark
    )
      ? "Dark mode"
      : "Light mode";
    const flippedLabel =
      currentLabel === "Dark mode" ? "Light mode" : "Dark mode";

    return html`
      <section class="panel" aria-label=${currentLabel}>
        <h2>${currentLabel}</h2>
        <slot name="current"></slot>
      </section>
      <section class="panel flipped" aria-label=${flippedLabel}>
        <h2>${flippedLabel}</h2>
        <slot name="flipped"></slot>
      </section>
    `;
  }

  private _themeSettingsChanged = (
    ev: HASSDomEvent<Partial<ThemeSettings>>
  ) => {
    this._themeSettings = {
      ...this._themeSettings,
      ...ev.detail,
      theme: "default",
    };
  };

  private _systemDarkChanged = (ev: MediaQueryListEvent) => {
    this._systemDark = ev.matches;
  };

  private _applyFlippedTheme() {
    if (!this._flipped) {
      return;
    }

    applyFlippedGalleryTheme(
      this._flipped,
      this._themeSettings,
      this._systemDark
    );
  }

  static styles = css`
    :host {
      box-sizing: border-box;
      display: grid;
      flex: 1;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      inline-size: 100%;
      min-block-size: 100%;
    }

    .panel {
      box-sizing: border-box;
      min-block-size: 100%;
      min-inline-size: 0;
      padding: var(--ha-space-6);
      background-color: var(--primary-background-color);
      color: var(--primary-text-color);
    }

    h2 {
      margin: 0 0 var(--ha-space-4);
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-normal);
    }

    ::slotted(*) {
      box-sizing: border-box;
      inline-size: 100%;
    }

    @media only screen and (max-width: 1000px) {
      :host {
        grid-template-columns: 1fr;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-theme-comparison": DemoThemeComparison;
  }
}
