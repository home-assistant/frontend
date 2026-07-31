import { LitElement, html, css, nothing, render } from "lit";
import { customElement, property, state } from "lit/decorators";
import type {
  ConceptId,
  ConfigChangedEvent,
  HomeAssistant,
  TileCardLabConfig,
} from "./tile-card-lab-types";
import { CONCEPTS } from "./tile-card-lab-types";
import "./tile-lab-concept-a";
import "./tile-lab-concept-b";
import "./tile-lab-concept-c";
// Reused HA controls / sub-editors (registered so the concepts can render them).
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-switch";
import "./hui-card-features-editor";
import "./hui-tile-card-editor";
import "../card-editor/hui-card-visibility-editor";
import "../card-editor/hui-card-layout-editor";

@customElement("tile-card-lab-editor")
export class TileCardLabEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TileCardLabConfig;

  // True once the A/B/C switcher has been injected into the dialog header;
  // until then we show an in-body fallback switcher.
  @state() private _headerReady = false;

  // The concept is a GLOBAL testing preference, never written to the tile config.
  private static _CONCEPT_KEY = "tcl_concept";

  private _headerContainer?: HTMLElement;

  // Reused stock tile editor instance for the "Control" option.
  private _controlEl?: HTMLElement & {
    hass?: HomeAssistant;
    setConfig?: (config: TileCardLabConfig) => void;
  };

  private _lastControlConfig?: TileCardLabConfig;

  public setConfig(config: TileCardLabConfig): void {
    this._config = config;
  }

  private get _concept(): ConceptId {
    const stored = localStorage.getItem(TileCardLabEditor._CONCEPT_KEY);
    return CONCEPTS.some((c) => c.id === stored) ? (stored as ConceptId) : "a";
  }

  private _selectConcept(concept: ConceptId): void {
    if (concept === this._concept) {
      return;
    }
    localStorage.setItem(TileCardLabEditor._CONCEPT_KEY, concept);
    this.requestUpdate();
  }

  private _conceptChanged(ev: ConfigChangedEvent): void {
    ev.stopPropagation();
    this._config = ev.detail.config;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  // The card layout editor needs the parent section's config (grid columns).
  // hui-card-element-editor (which renders us) holds it; read it from our host.
  private get _sectionConfig(): unknown {
    const root = this.getRootNode();
    return root instanceof ShadowRoot
      ? (root.host as { sectionConfig?: unknown }).sectionConfig
      : undefined;
  }

  // ---- dialog surgery: hide HA's tabs + inject the switcher into the header --

  protected firstUpdated(): void {
    this._applyStockTabs();
  }

  protected updated(): void {
    this._applyStockTabs();
    this._injectHeaderSwitcher();
    this._matchDialogSize();
    this._applyStickyPreview();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._headerContainer?.remove();
    this._headerContainer = undefined;
    this._headerReady = false;
    const root = this._findDialog()?.shadowRoot;
    root?.getElementById("tcl-sticky-preview")?.remove();
    const haDialog = root?.querySelector("ha-dialog") as HTMLElement | null;
    haDialog?.style.removeProperty("--ha-dialog-min-height");
    haDialog?.style.removeProperty("--ha-dialog-max-height");
  }

  // Concept C: keep the card preview pinned to the side while the editor
  // content scrolls. Only C wants this, so add/remove per active concept.
  private _applyStickyPreview(): void {
    const root = this._findDialog()?.shadowRoot;
    if (!root) {
      return;
    }
    const existing = root.getElementById("tcl-sticky-preview");
    if (this._concept === "c") {
      if (!existing) {
        const style = document.createElement("style");
        style.id = "tcl-sticky-preview";
        style.textContent =
          ".element-preview{position:sticky;top:0;align-self:flex-start;}";
        root.appendChild(style);
      }
    } else {
      existing?.remove();
    }
  }

  // Match the "Add card" dialog's fixed size + position: it pins ha-dialog to
  // min(900px, 80vh). The edit dialog otherwise sizes to its content, so it ends
  // up short and high. Set the vars INLINE on the ha-dialog element so they win
  // over the dialog's own stylesheet and inherit into its shadow.
  private _matchDialogSize(): void {
    const haDialog = this._findDialog()?.shadowRoot?.querySelector(
      "ha-dialog"
    ) as HTMLElement | null;
    if (!haDialog) {
      return;
    }
    haDialog.style.setProperty("--ha-dialog-min-height", "min(900px, 80vh)");
    haDialog.style.setProperty("--ha-dialog-max-height", "min(900px, 80vh)");
  }

  // We render inside hui-card-element-editor's shadow root, alongside HA's
  // Config/Visibility/Layout tab group. Hide it for the concepts (they bring
  // their own tabs); for "Control" show HA's tabs — that IS the current editor.
  private _applyStockTabs(): void {
    const root = this.getRootNode();
    if (!(root instanceof ShadowRoot)) {
      return;
    }
    const existing = root.querySelector("#tcl-hide-tabs");
    if (this._concept === "control") {
      existing?.remove();
    } else if (!existing) {
      const style = document.createElement("style");
      style.id = "tcl-hide-tabs";
      style.textContent = "ha-tab-group{display:none!important;}";
      root.appendChild(style);
    }
  }

  private _findDialog(): HTMLElement | undefined {
    let node: Node = this;
    for (let i = 0; i < 12; i++) {
      const root = node.getRootNode();
      if (!(root instanceof ShadowRoot)) {
        return undefined;
      }
      const host = root.host as HTMLElement;
      if (host.localName === "hui-dialog-edit-card") {
        return host;
      }
      node = host;
    }
    return undefined;
  }

  private _injectHeaderSwitcher(): void {
    const dialog = this._findDialog();
    const haDialog = dialog?.shadowRoot?.querySelector("ha-dialog");
    if (!haDialog) {
      return;
    }
    if (!this._headerContainer || !this._headerContainer.isConnected) {
      const container = document.createElement("div");
      container.slot = "headerActionItems";
      container.id = "tcl-header-switcher";
      haDialog.appendChild(container);
      this._headerContainer = container;
    }
    render(this._switcherTemplate(true), this._headerContainer);
    if (!this._headerReady) {
      this._headerReady = true;
    }
  }

  private _switcherTemplate(inHeader: boolean) {
    const active = this._concept;
    return html`
      <div class="switcher ${inHeader ? "in-header" : ""}" role="radiogroup">
        ${CONCEPTS.map(
          (c) => html`
            <button
              class="segment ${c.id === active ? "active" : ""}"
              role="radio"
              aria-checked=${c.id === active}
              @click=${() => this._selectConcept(c.id)}
            >
              ${c.label}
            </button>
          `
        )}
      </div>
      ${inHeader ? html`<style>${TileCardLabEditor._headerCss}</style>` : nothing}
    `;
  }

  // Inline styles travel with the header switcher because it lives outside this
  // component's shadow root.
  private static _headerCss = `
    #tcl-header-switcher .switcher {
      display: flex;
      gap: 4px;
      background: var(--divider-color, #e0e0e0);
      border-radius: var(--ha-border-radius-md, 10px);
      padding: 3px;
      margin-inline-end: 8px;
    }
    #tcl-header-switcher .segment {
      appearance: none;
      border: 0;
      cursor: pointer;
      font-family: inherit;
      font-size: var(--ha-font-size-s, 13px);
      font-weight: var(--ha-font-weight-medium, 500);
      padding: 6px 12px;
      border-radius: var(--ha-border-radius-sm, 8px);
      background: transparent;
      color: var(--primary-text-color);
      white-space: nowrap;
    }
    #tcl-header-switcher .segment.active {
      background: var(--card-background-color, #fff);
      color: var(--primary-color);
    }
  `;

  // "Control" = the current stock HA tile editor, reused as a comparison
  // baseline. HA's own Config/Visibility/Layout tabs stay visible around it.
  private _renderControl() {
    if (!this._controlEl) {
      const el = document.createElement("hui-tile-card-editor") as HTMLElement & {
        hass?: HomeAssistant;
        setConfig?: (config: TileCardLabConfig) => void;
      };
      el.addEventListener("config-changed", (ev) => {
        ev.stopPropagation();
        const config = (ev as ConfigChangedEvent).detail.config;
        this._config = config;
        this._lastControlConfig = config;
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { config },
            bubbles: true,
            composed: true,
          })
        );
      });
      this._controlEl = el;
    }
    this._controlEl.hass = this.hass;
    // Only push config when it changed externally, so typing in the stock
    // editor isn't interrupted by a setConfig echo of its own change.
    if (this._config && this._config !== this._lastControlConfig) {
      this._lastControlConfig = this._config;
      try {
        this._controlEl.setConfig?.(this._config);
      } catch (_e) {
        // stock editor may reject a transient config; ignore
      }
    }
    return html`${this._controlEl}`;
  }

  private _renderConcept() {
    const config = this._config!;
    switch (this._concept) {
      case "control":
        return this._renderControl();
      case "b":
        return html`<tile-lab-concept-b
          .hass=${this.hass}
          .config=${config}
          .sectionConfig=${this._sectionConfig}
          @config-changed=${this._conceptChanged}
        ></tile-lab-concept-b>`;
      case "c":
        return html`<tile-lab-concept-c
          .hass=${this.hass}
          .config=${config}
          .sectionConfig=${this._sectionConfig}
          @config-changed=${this._conceptChanged}
        ></tile-lab-concept-c>`;
      default:
        return html`<tile-lab-concept-a
          .hass=${this.hass}
          .config=${config}
          .sectionConfig=${this._sectionConfig}
          @config-changed=${this._conceptChanged}
        ></tile-lab-concept-a>`;
    }
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }
    return html`
      ${!this._headerReady
        ? html`<div class="fallback-switcher">
            ${this._switcherTemplate(false)}
          </div>`
        : nothing}
      <div class="concept-host">${this._renderConcept()}</div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .fallback-switcher {
      margin-bottom: var(--ha-space-4, 16px);
    }
    .switcher {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 4px;
      background: var(--divider-color, #e0e0e0);
      border-radius: var(--ha-border-radius-md, 12px);
      padding: 4px;
    }
    .segment {
      appearance: none;
      border: 0;
      cursor: pointer;
      font-family: inherit;
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-medium, 500);
      padding: 8px 12px;
      border-radius: var(--ha-border-radius-sm, 8px);
      background: transparent;
      color: var(--primary-text-color);
    }
    .segment.active {
      background: var(--card-background-color, #fff);
      color: var(--primary-color);
    }
    .concept-host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "tile-card-lab-editor": TileCardLabEditor;
  }
}
