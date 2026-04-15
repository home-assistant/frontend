import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-code-editor";
import type { HomeAssistant } from "../../../../types";

const ENV_INSETS = [
  "safe-area-inset-top",
  "safe-area-inset-right",
  "safe-area-inset-bottom",
  "safe-area-inset-left",
] as const;

const ENV_EXTRA = [
  "titlebar-area-x",
  "titlebar-area-y",
  "titlebar-area-width",
  "titlebar-area-height",
  "keyboard-inset-height",
  "keyboard-inset-top",
] as const;

const HA_SAFE_CSS_VARS = [
  "--app-safe-area-inset-top",
  "--app-safe-area-inset-right",
  "--app-safe-area-inset-bottom",
  "--app-safe-area-inset-left",
  "--safe-area-inset-top",
  "--safe-area-inset-right",
  "--safe-area-inset-bottom",
  "--safe-area-inset-left",
  "--safe-area-inset-x",
  "--safe-area-inset-y",
  "--safe-area-offset-left",
  "--safe-area-offset-right",
  "--safe-area-offset-top",
  "--safe-area-offset-bottom",
  "--safe-width",
  "--safe-height",
] as const;

/** Layout and direction tokens from `main.globals` (Companion or RTL can override). */
const HA_LAYOUT_CSS_VARS = [
  "--direction",
  "--header-height",
  "--float-start",
  "--float-end",
  "--margin-title-ltr",
  "--margin-title-rtl",
] as const;

const MEDIA_FEATURE_QUERIES: Record<string, string> = {
  prefersColorSchemeDark: "(prefers-color-scheme: dark)",
  prefersColorSchemeLight: "(prefers-color-scheme: light)",
  prefersReducedMotion: "(prefers-reduced-motion: reduce)",
  pointerCoarse: "(pointer: coarse)",
  pointerFine: "(pointer: fine)",
  anyPointerCoarse: "(any-pointer: coarse)",
  anyPointerFine: "(any-pointer: fine)",
  hoverNone: "(hover: none)",
  hoverHover: "(hover: hover)",
  displayModeStandalone: "(display-mode: standalone)",
  displayModeFullscreen: "(display-mode: fullscreen)",
  displayModeMinimalUi: "(display-mode: minimal-ui)",
  displayModeBrowser: "(display-mode: browser)",
  prefersContrastMore: "(prefers-contrast: more)",
  prefersContrastLess: "(prefers-contrast: less)",
  forcedColors: "(forced-colors: active)",
  invertedColors: "(inverted-colors: inverted)",
  dynamicRangeHigh: "(dynamic-range: high)",
  reducedTransparency: "(prefers-reduced-transparency: reduce)",
  prefersReducedData: "(prefers-reduced-data: reduce)",
};

function readCssEnv(name: string): string {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:-10000px;top:0;visibility:hidden;padding-top:env(" +
    name +
    ", 0px);";
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).paddingTop;
  document.body.removeChild(probe);
  return value;
}

function collectMediaFeatureMatches(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [key, query] of Object.entries(MEDIA_FEATURE_QUERIES)) {
    try {
      out[key] = window.matchMedia(query).matches;
    } catch {
      out[key] = false;
    }
  }
  return out;
}

interface ViewportEnvironmentSnapshot {
  cssEnvironment: Record<string, string>;
  cssVariables: Record<string, string>;
  mediaFeatures: Record<string, boolean>;
  window: {
    innerWidth: number;
    innerHeight: number;
    outerWidth: number;
    outerHeight: number;
    devicePixelRatio: number;
    screenX: number;
    screenY: number;
    isSecureContext: boolean;
    crossOriginIsolated: boolean;
  };
  documentElement: {
    clientWidth: number;
    clientHeight: number;
    scrollWidth: number;
    scrollHeight: number;
  };
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    orientation: null | {
      type: string;
      angle: number;
    };
  };
}

function collectViewportEnvironmentSnapshot(): ViewportEnvironmentSnapshot {
  const cssEnvironment: Record<string, string> = {};
  for (const name of ENV_INSETS) {
    cssEnvironment[name] = readCssEnv(name);
  }
  for (const name of ENV_EXTRA) {
    cssEnvironment[name] = readCssEnv(name);
  }

  const rootStyle = getComputedStyle(document.documentElement);
  const cssVariables: Record<string, string> = {};
  for (const name of HA_SAFE_CSS_VARS) {
    cssVariables[name] = rootStyle.getPropertyValue(name).trim();
  }
  for (const name of HA_LAYOUT_CSS_VARS) {
    cssVariables[name] = rootStyle.getPropertyValue(name).trim();
  }

  let orientation: ViewportEnvironmentSnapshot["screen"]["orientation"] = null;
  try {
    const so = window.screen.orientation;
    if (so) {
      orientation = { type: so.type, angle: so.angle };
    }
  } catch {
    orientation = null;
  }

  return {
    cssEnvironment,
    cssVariables,
    mediaFeatures: collectMediaFeatureMatches(),
    window: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      devicePixelRatio: window.devicePixelRatio,
      screenX: window.screenX,
      screenY: window.screenY,
      isSecureContext: window.isSecureContext,
      crossOriginIsolated: window.crossOriginIsolated,
    },
    documentElement: {
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      orientation,
    },
  };
}

@customElement("ha-debug-viewport-environment-card")
export class HaDebugViewportEnvironmentCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _snapshot: ViewportEnvironmentSnapshot | undefined;

  private _raf = 0;

  private readonly _boundRefresh = (): void => {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
    }
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._snapshot = collectViewportEnvironmentSnapshot();
    });
  };

  connectedCallback(): void {
    super.connectedCallback();
    this._snapshot = collectViewportEnvironmentSnapshot();
    window.addEventListener("resize", this._boundRefresh);
    window.visualViewport?.addEventListener("resize", this._boundRefresh);
    window.visualViewport?.addEventListener("scroll", this._boundRefresh);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._boundRefresh);
    window.visualViewport?.removeEventListener("resize", this._boundRefresh);
    window.visualViewport?.removeEventListener("scroll", this._boundRefresh);
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  protected render(): TemplateResult {
    const text = this._snapshot ? JSON.stringify(this._snapshot, null, 2) : "";

    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.developer-tools.tabs.debug.viewport_environment.title"
        )}
      >
        <div class="card-content">
          <p class="explanation">
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.debug.viewport_environment.description"
            )}
          </p>
          <ha-code-editor
            class="snapshot-editor"
            mode="yaml"
            .hass=${this.hass}
            .value=${text}
            read-only
            .linewrap=${true}
          ></ha-code-editor>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
    .explanation {
      margin: 0 0 var(--ha-space-3);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      line-height: var(--ha-line-height-normal);
    }
    .snapshot-editor {
      display: block;
      direction: var(--direction);
      --code-mirror-height: auto;
      --code-mirror-max-height: min(60vh, 560px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-viewport-environment-card": HaDebugViewportEnvironmentCard;
  }
}
