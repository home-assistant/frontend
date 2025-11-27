import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";

export const SAFE_AREA_DIRECTIONS = ["top", "bottom", "left", "right"] as const;
export type SafeAreaDirection = (typeof SAFE_AREA_DIRECTIONS)[number];

interface SafeAreaBaseValue {
  env: string;
  app: string;
  inset: string;
}

export interface SafeAreaExtraEntry {
  label: string;
  value: string;
}

type SafeAreaBaseValues = Record<SafeAreaDirection, SafeAreaBaseValue>;
export type SafeAreaExtraMap = Partial<
  Record<SafeAreaDirection, SafeAreaExtraEntry[]>
>;

@customElement("ha-safe-area-debug")
export class HaSafeAreaDebug extends LitElement {
  @property({ attribute: false })
  public extraSections?: SafeAreaExtraMap;

  @state()
  private _values: SafeAreaBaseValues = {
    top: { env: "", app: "", inset: "" },
    bottom: { env: "", app: "", inset: "" },
    left: { env: "", app: "", inset: "" },
    right: { env: "", app: "", inset: "" },
  };

  private _envProbe?: HTMLDivElement;

  private _handleResize = () => this._updateValues();

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this._handleResize);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._handleResize);
    this._teardownEnvProbe();
  }

  protected firstUpdated(): void {
    this._updateValues();
  }

  private _updateValues() {
    const rootStyles = getComputedStyle(document.documentElement);
    const rootZero =
      rootStyles.getPropertyValue("--ha-space-0").trim() || "0px";
    const envStyles = this._getEnvProbeStyles();

    const next = SAFE_AREA_DIRECTIONS.reduce((acc, dir) => {
      const insetVar = `--safe-area-inset-${dir}`;
      const appVar = `--app-safe-area-inset-${dir}`;
      const envProp = this._paddingProperty(dir);

      const envValue = envStyles?.getPropertyValue(envProp) ?? "";

      acc[dir] = {
        env: this._normalizeValue(envValue, rootZero),
        app: this._normalizeValue(
          rootStyles.getPropertyValue(appVar),
          rootZero
        ),
        inset: this._normalizeValue(
          rootStyles.getPropertyValue(insetVar),
          rootZero
        ),
      };

      return acc;
    }, {} as SafeAreaBaseValues);

    const changed = SAFE_AREA_DIRECTIONS.some((dir) => {
      const current = this._values[dir];
      const upcoming = next[dir];
      return (
        current.env !== upcoming.env ||
        current.app !== upcoming.app ||
        current.inset !== upcoming.inset
      );
    });

    if (changed) {
      this._values = next;
    }
  }

  private _normalizeValue(value: string, fallback: string) {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  private _getEnvProbeStyles() {
    const supportsEnv =
      window.CSS?.supports?.("padding-top", "env(safe-area-inset-top)") ??
      false;

    if (!supportsEnv) {
      return undefined;
    }

    if (!this._envProbe) {
      const probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = `
        position: fixed;
        inset: 0;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
        opacity: 0;
        pointer-events: none;
        z-index: -1;
      `;
      document.documentElement.appendChild(probe);
      this._envProbe = probe;
    }

    return getComputedStyle(this._envProbe);
  }

  private _teardownEnvProbe() {
    if (this._envProbe?.parentNode) {
      this._envProbe.parentNode.removeChild(this._envProbe);
    }
    this._envProbe = undefined;
  }

  private _paddingProperty(direction: SafeAreaDirection) {
    switch (direction) {
      case "top":
        return "padding-top";
      case "bottom":
        return "padding-bottom";
      case "left":
        return "padding-left";
      case "right":
        return "padding-right";
      default:
        return "padding";
    }
  }

  protected render() {
    return html`
      <div class="safe-area-debug" aria-live="polite">
        ${SAFE_AREA_DIRECTIONS.map(
          (dir) => html`
            <section>
              <h3>${dir}</h3>
              <ul>
                <li>
                  <span class="label">env</span>
                  <span class="value">${this._values[dir].env}</span>
                </li>
                <li>
                  <span class="label">app</span>
                  <span class="value">${this._values[dir].app}</span>
                </li>
                <li>
                  <span class="label">insets</span>
                  <span class="value">${this._values[dir].inset}</span>
                </li>
                ${this._renderExtra(dir)}
              </ul>
            </section>
          `
        )}
      </div>
    `;
  }

  private _renderExtra(direction: SafeAreaDirection) {
    const extras = this.extraSections?.[direction];
    if (!extras?.length) {
      return null;
    }

    return extras.map(
      (entry) => html`
        <li>
          <span class="label">${entry.label}</span>
          <span class="value">${entry.value}</span>
        </li>
      `
    );
  }

  static styles = css`
    :host {
      display: block;
    }

    .safe-area-debug {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--ha-space-4);
      padding: var(--ha-space-3) var(--ha-space-4);
      font-size: var(--ha-font-size-small, 0.875rem);
      color: var(--secondary-text-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-radius-md, 8px);
    }

    section {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    h3 {
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: var(--ha-font-size-body-2, 0.75rem);
      margin: 0;
      color: var(--primary-text-color);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
    }

    li {
      display: flex;
      justify-content: space-between;
      gap: var(--ha-space-2);
      background: var(--ha-color-surface-variant, rgba(0, 0, 0, 0.04));
      border-radius: var(--ha-radius-sm, 6px);
      padding: var(--ha-space-1) var(--ha-space-2);
    }

    .label {
      font-weight: var(--ha-font-weight-medium, 500);
      text-transform: lowercase;
    }

    .value {
      font-family: var(--code-font-family, "Roboto Mono", monospace);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-safe-area-debug": HaSafeAreaDebug;
  }
}
