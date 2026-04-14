import { mdiContentCopy } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";

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

interface NavigatorWithExtras extends Navigator {
  readonly connection?: NetworkInformation;
  readonly deviceMemory?: number;
  readonly userAgentData?: { brands: { brand: string; version: string }[] };
  readonly virtualKeyboard?: { boundingRect: DOMRect };
}

interface PerformanceWithMemory extends Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
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
    inlineStyle: string | null;
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
  visualViewport: null | {
    width: number;
    height: number;
    scale: number;
    offsetLeft: number;
    offsetTop: number;
    pageLeft: number;
    pageTop: number;
  };
  navigator: {
    maxTouchPoints: number;
    userAgent: string;
    platform: string;
    language: string;
    languages: readonly string[];
    hardwareConcurrency: number;
    cookieEnabled: boolean;
    onLine: boolean;
    deviceMemory: number | undefined;
    userAgentDataBrands: { brand: string; version: string }[] | undefined;
  };
  connection: null | {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    type?: string;
  };
  intl: {
    locale: string;
    timeZone: string;
    calendar: string;
    numberingSystem: string;
  };
  performanceMemory: null | {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  virtualKeyboardRect: null | {
    x: number;
    y: number;
    width: number;
    height: number;
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

  const vv = window.visualViewport;
  const nav = navigator as NavigatorWithExtras;
  const conn = nav.connection;
  const intlOpts = Intl.DateTimeFormat().resolvedOptions();
  const perfMem = (performance as PerformanceWithMemory).memory;
  const vkRect = nav.virtualKeyboard?.boundingRect;

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
      inlineStyle: document.documentElement.getAttribute("style"),
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
    visualViewport: vv
      ? {
          width: vv.width,
          height: vv.height,
          scale: vv.scale,
          offsetLeft: vv.offsetLeft,
          offsetTop: vv.offsetTop,
          pageLeft: vv.pageLeft,
          pageTop: vv.pageTop,
        }
      : null,
    navigator: {
      maxTouchPoints: navigator.maxTouchPoints,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages,
      hardwareConcurrency: navigator.hardwareConcurrency,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      deviceMemory: nav.deviceMemory,
      userAgentDataBrands: nav.userAgentData?.brands,
    },
    connection: conn
      ? {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData,
          type: conn.type,
        }
      : null,
    intl: {
      locale: intlOpts.locale,
      timeZone: intlOpts.timeZone,
      calendar: intlOpts.calendar,
      numberingSystem: intlOpts.numberingSystem,
    },
    performanceMemory: perfMem
      ? {
          jsHeapSizeLimit: perfMem.jsHeapSizeLimit,
          totalJSHeapSize: perfMem.totalJSHeapSize,
          usedJSHeapSize: perfMem.usedJSHeapSize,
        }
      : null,
    virtualKeyboardRect: vkRect
      ? {
          x: vkRect.x,
          y: vkRect.y,
          width: vkRect.width,
          height: vkRect.height,
        }
      : null,
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
    const text = this._snapshot
      ? JSON.stringify(this._snapshot, null, 2)
      : "";

    return html`
      <ha-card>
        <div class="card-header card-header-with-action">
          <span class="card-header-title"
            >${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.debug.viewport_environment.title"
            )}</span
          >
          <ha-icon-button
            .path=${mdiContentCopy}
            .label=${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.debug.viewport_environment.copy"
            )}
            @click=${this._copy}
          ></ha-icon-button>
        </div>
        <div class="card-content">
          <p class="explanation">
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.debug.viewport_environment.description"
            )}
          </p>
          <pre class="snapshot" .textContent=${text}></pre>
        </div>
      </ha-card>
    `;
  }

  private async _copy(): Promise<void> {
    const snapshot = this._snapshot ?? collectViewportEnvironmentSnapshot();
    await copyToClipboard(JSON.stringify(snapshot, null, 2));
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--ha-space-4);
    }
    .card-header-with-action {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-2);
      padding-inline-end: var(--ha-space-2);
    }
    .card-header-title {
      flex: 1;
      min-width: 0;
    }
    .explanation {
      margin: 0 0 var(--ha-space-3);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      line-height: var(--ha-line-height-normal);
    }
    .snapshot {
      margin: 0;
      overflow-x: auto;
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-xs);
      line-height: var(--ha-line-height-normal);
      white-space: pre-wrap;
      word-break: break-word;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-debug-viewport-environment-card": HaDebugViewportEnvironmentCard;
  }
}
