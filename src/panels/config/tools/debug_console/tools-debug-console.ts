import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  completionStatus,
} from "@codemirror/autocomplete";
import type {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  insertNewlineAndIndent,
} from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { EditorState, Prec } from "@codemirror/state";
import type { ViewUpdate } from "@codemirror/view";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import {
  mdiAlertOutline,
  mdiCancel,
  mdiChevronLeft,
  mdiChevronRight,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { goBack } from "../../../../common/navigate";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import type {
  DebugConsoleExecuteResult,
  DebugConsoleObjects,
  DebugConsoleSignature,
  DebugConsoleValue,
} from "../../../../data/debug_console";
import {
  clearDebugConsole,
  completeDebugConsole,
  executeDebugConsole,
  inspectDebugConsole,
  getDebugConsoleAttribute,
  getDebugConsoleInfo,
  getDebugConsoleSignature,
} from "../../../../data/debug_console";
import {
  haSyntaxHighlighting,
  haTheme,
} from "../../../../resources/codemirror";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showDebugConsoleWarningDialog } from "./show-dialog-debug-console-warning";
import "./tools-debug-console-value";

type ConsoleEntryContent =
  | { kind: "input"; code: string }
  | { kind: "log"; values: DebugConsoleValue[] }
  | { kind: "result"; value: DebugConsoleValue }
  | { kind: "error"; text: string }
  | { kind: "output_truncated" }
  | { kind: "paste_blocked" }
  | { kind: "paste_allowed" };

// Rows are keyed by ID, so trimming the log never hands one row's expanded
// object tree to another.
type ConsoleEntry = ConsoleEntryContent & { id: number };

// The Home Assistant editor theme is made for a boxed editor; the prompt is a
// bare line in the log.
const promptTheme = EditorView.theme({
  "&": { backgroundColor: "transparent" },
  ".cm-content": { padding: "0", fontFamily: "var(--ha-font-family-code)" },
  ".cm-line": { padding: "0" },
  ".cm-activeLine": { backgroundColor: "transparent" },
});

const STORAGE_KEY_HISTORY = "tools-debug-console-history";
const STORAGE_KEY_ALLOW_PASTING = "tools-debug-console-allow-pasting";
const STORAGE_KEY_LOG = "tools-debug-console-log";
const MAX_LOG_ENTRIES = 500;

// The log outlives this element, so leaving the page and coming back keeps it.
// Also stored per browser tab, to survive a reload along with the backend
// session. Both per user, so accounts taking turns in a tab share nothing.
const savedLogs = new Map<string, ConsoleEntry[]>();
let nextEntryId = 0;

const loadLog = (userId: string): ConsoleEntry[] => {
  const saved = savedLogs.get(userId);
  if (saved) {
    return saved;
  }

  let stored: ConsoleEntryContent[] = [];
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(`${STORAGE_KEY_LOG}-${userId}`) ?? "[]"
    );
    stored = Array.isArray(parsed) ? parsed : [];
  } catch (_err: unknown) {
    // Start with an empty log.
  }

  const log = stored.map((entry) => ({ ...entry, id: nextEntryId++ }));
  savedLogs.set(userId, log);
  return log;
};

// Session storage holds a few megabytes for the whole site.
const MAX_STORED_LOG_LENGTH = 1_000_000;
const pendingStores = new Map<string, number>();

const saveLog = (userId: string, entries: ConsoleEntry[]) => {
  savedLogs.set(userId, entries);
  // Storing serializes the whole log, so once after a burst of output.
  window.clearTimeout(pendingStores.get(userId));
  pendingStores.set(
    userId,
    window.setTimeout(() => {
      pendingStores.delete(userId);
      storeLog(userId, savedLogs.get(userId) ?? []);
    }, 250)
  );
};

// Stores the newest entries that fit; the rest stays for this page load.
const storeLog = (userId: string, entries: ConsoleEntry[]) => {
  const key = `${STORAGE_KEY_LOG}-${userId}`;
  let stored = entries;
  while (stored.length) {
    const serialized = JSON.stringify(stored);
    if (serialized.length <= MAX_STORED_LOG_LENGTH) {
      try {
        window.sessionStorage.setItem(key, serialized);
        return;
      } catch (_err: unknown) {
        // Over the quota of the browser, try again with less.
      }
    }
    stored = stored.slice(Math.ceil(stored.length / 2));
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch (_err: unknown) {
    // No storage at all.
  }
};

const MAX_HISTORY = 100;

@customElement("tools-debug-console")
class ToolsDebugConsole extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _entries: ConsoleEntry[] = [];

  // The user the log and history belong to.
  private _userId?: string;

  @state() private _running = false;

  @state() private _signature?: DebugConsoleSignature;

  // Beta and stable versions ask each user to accept a warning first.
  @state() private _warningRequired = false;

  // Responses can arrive out of order; only the latest request may set the hint.
  private _signatureRequest = 0;

  // The code the last signature request was for, to skip asking again.
  private _signatureCode?: string;

  private _warningDialogOpen = false;

  // Fixed for the lifetime of the console, so values do not update with hass.
  private _objects: DebugConsoleObjects = {
    inspect: (objectId) => inspectDebugConsole(this.hass, objectId),
    getAttribute: (objectId, attribute) =>
      getDebugConsoleAttribute(this.hass, objectId, attribute),
  };

  @query(".log") private _log?: HTMLElement;

  @query(".prompt-input") private _promptInput?: HTMLElement;

  private _editor?: EditorView;

  // The router keeps this page around; keep the draft, undo history, and
  // cursor for when we come back.
  private _savedEditorState?: EditorState;

  // Bumped by Clear, so executions started before it do not refill the log.
  private _logGeneration = 0;

  // Like browser consoles, pasting is blocked until the user types a phrase,
  // as "paste this into the console" is a common way to trick people.
  private _pasteAllowed = false;

  private _history: string[] = [];

  // Position while browsing the history; equal to its length when not browsing.
  private _historyIndex = 0;

  // What was typed before browsing the history, restored when browsing past the end.
  private _draft = "";

  protected render() {
    return html`
      <div class="toolbar">
        <div class="intro">
          <ha-svg-icon .path=${mdiAlertOutline}></ha-svg-icon>
          <div>
            <div>
              ${this.hass.localize("ui.panel.config.tools.tabs.debug_console.intro")}
            </div>
            <div>
              ${this.hass.localize(
                "ui.panel.config.tools.tabs.debug_console.event_loop"
              )}
            </div>
          </div>
        </div>
        <ha-icon-button
          .label=${this.hass.localize("ui.panel.config.tools.tabs.debug_console.clear")}
          .path=${mdiCancel}
          @click=${this._clear}
        ></ha-icon-button>
      </div>
      <div
        class="log ha-scrollbar"
        ?inert=${this._warningRequired}
        @click=${this._focusIfNoSelection}
      >
        <div
          class="entries"
          role="log"
          aria-label=${this.hass.localize(
            "ui.panel.config.tools.tabs.debug_console.output"
          )}
          dir="ltr"
        >
          ${repeat(
            this._entries,
            (entry) => entry.id,
            (entry) => this._renderEntry(entry)
          )}
          ${
            this._running
              ? html`<div class="entry">
                  <ha-spinner size="tiny"></ha-spinner>
                </div>`
              : nothing
          }
        </div>
        <div class="entry prompt" dir="ltr">
          <ha-svg-icon class="marker" .path=${mdiChevronRight}></ha-svg-icon>
          <div class="prompt-input"></div>
          ${this._signature ? this._renderSignature(this._signature) : nothing}
        </div>
      </div>
    `;
  }

  private _renderSignature(signature: DebugConsoleSignature) {
    return html`<div class="signature" dir="ltr">
      ${signature.name}(${signature.parameters.map(
        (parameter, index) =>
          html`${index ? ", " : ""}<span
              class=${index === signature.active ? "active" : ""}
              >${parameter}</span
            >`
      )})${signature.returns ? ` -> ${signature.returns}` : ""}
      ${signature.doc ? html`<div class="doc">${signature.doc}</div>` : nothing}
    </div>`;
  }

  private _renderEntry(entry: ConsoleEntry) {
    switch (entry.kind) {
      case "input":
        return html`<div class="entry input">
          <ha-svg-icon class="marker" .path=${mdiChevronRight}></ha-svg-icon>
          <pre>${entry.code}</pre>
        </div>`;
      case "log":
        return html`<div class="entry log-line">
          ${entry.values.map(
            (value) =>
              html`<tools-debug-console-value
                .objects=${this._objects}
                .value=${value}
              ></tools-debug-console-value>`
          )}
        </div>`;
      case "result":
        return html`<div class="entry result">
          <ha-svg-icon class="marker" .path=${mdiChevronLeft}></ha-svg-icon>
          <tools-debug-console-value
            .objects=${this._objects}
            .value=${entry.value}
          ></tools-debug-console-value>
        </div>`;
      case "error":
        return html`<div class="entry error"><pre>${entry.text}</pre></div>`;
      case "paste_blocked":
        return html`<div
          class="entry warning"
          dir=${computeRTLDirection(this.hass)}
        >
          <ha-svg-icon class="marker" .path=${mdiAlertOutline}></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.config.tools.tabs.debug_console.paste_blocked",
            {
              phrase: html`<code>${this._pastePhrase}</code>`,
            }
          )}
        </div>`;
      case "output_truncated":
        return html`<div
          class="entry notice"
          dir=${computeRTLDirection(this.hass)}
        >
          ${this.hass.localize(
            "ui.panel.config.tools.tabs.debug_console.output_truncated"
          )}
        </div>`;
      case "paste_allowed":
        return html`<div
          class="entry notice"
          dir=${computeRTLDirection(this.hass)}
        >
          ${this.hass.localize(
            "ui.panel.config.tools.tabs.debug_console.paste_allowed"
          )}
        </div>`;
    }
    return nothing;
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    const userId = this.hass.user!.id;
    if (userId !== this._userId) {
      this._userId = userId;
      this._entries = loadLog(userId);
      this._history = this._loadHistory();
      this._historyIndex = this._history.length;
      this._pasteAllowed = this._loadPasteAllowed();
      this._checkWarning();
    }
  }

  private async _checkWarning() {
    let warningRequired: boolean;
    try {
      warningRequired = (await getDebugConsoleInfo(this.hass)).warning_required;
    } catch (_err: unknown) {
      // The console reports why it can't run once code is run.
      return;
    }

    this._warningRequired = warningRequired;
    if (warningRequired && !this._warningDialogOpen) {
      this._warningDialogOpen = true;
      showDebugConsoleWarningDialog(this, {
        closedCallback: this._warningClosed,
      });
    }
  }

  private _warningClosed = (accepted: boolean) => {
    this._warningDialogOpen = false;
    if (!accepted) {
      // Only when still here; the dialog also closes when leaving otherwise.
      // Not to the Tools panel itself, as that returns to its last tab.
      if (this.isConnected) {
        goBack("/config");
      }
      return;
    }

    this._warningRequired = false;
    this._editor?.focus();
  };

  public connectedCallback() {
    super.connectedCallback();
    // The router keeps this page around, so recreate the editor on return.
    if (this.hasUpdated) {
      this.requestUpdate();
      if (this._warningRequired) {
        this._checkWarning();
      }
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._savedEditorState = this._editor?.state;
    this._editor?.destroy();
    this._editor = undefined;
    // A hint for a prompt that is gone is of no use.
    this._signatureRequest++;
    this._signatureCode = undefined;
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (!this._editor && this.isConnected) {
      this._createEditor();
    }
  }

  private _createEditor() {
    this._editor = new EditorView({
      parent: this._promptInput!,
      state: this._savedEditorState ?? this._createEditorState(),
    });
    this._savedEditorState = undefined;
    this._editor.focus();
    this._log?.scrollTo({ top: this._log.scrollHeight });
  }

  private _createEditorState() {
    return EditorState.create({
      extensions: [
        // Our bindings go first, so Enter runs code instead of adding a line.
        Prec.highest(
          keymap.of([
            { key: "Enter", run: this._handleEnter },
            { key: "Mod-Enter", run: this._handleForceRun },
            { key: "ArrowUp", run: this._handleHistoryBack },
            { key: "ArrowDown", run: this._handleHistoryForward },
            { key: "Mod-l", run: this._handleClear },
          ])
        ),
        keymap.of([
          ...closeBracketsKeymap,
          ...completionKeymap,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        history(),
        closeBrackets(),
        autocompletion({ override: [this._completions] }),
        placeholder(
          this.hass.localize(
            "ui.panel.config.tools.tabs.debug_console.placeholder"
          )
        ),
        python(),
        haTheme,
        Prec.highest(promptTheme),
        haSyntaxHighlighting,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": this.hass.localize(
            "ui.panel.config.tools.tabs.debug_console.prompt"
          ),
        }),
        EditorView.updateListener.of(this._onEditorUpdate),
        EditorView.domEventHandlers({
          paste: this._guardPaste,
          drop: this._guardPaste,
        }),
      ],
    });
  }

  private _handleEnter = (view: EditorView): boolean => {
    // Leave Enter to the autocomplete popup, to pick the selected option.
    if (completionStatus(view.state) === "active") {
      return false;
    }

    this._run(true);
    return true;
  };

  private _handleForceRun = (): boolean => {
    this._run(false);
    return true;
  };

  private _handleHistoryBack = (view: EditorView): boolean => {
    const cursor = view.state.selection.main;
    if (
      completionStatus(view.state) === "active" ||
      !cursor.empty ||
      view.state.doc.lineAt(cursor.head).number !== 1 ||
      this._historyIndex === 0
    ) {
      return false;
    }

    if (this._historyIndex === this._history.length) {
      this._draft = this._code;
    }
    this._historyIndex--;
    this._setCode(this._history[this._historyIndex]);
    return true;
  };

  private _handleHistoryForward = (view: EditorView): boolean => {
    const cursor = view.state.selection.main;
    if (
      completionStatus(view.state) === "active" ||
      !cursor.empty ||
      view.state.doc.lineAt(cursor.head).number !== view.state.doc.lines ||
      this._historyIndex === this._history.length
    ) {
      return false;
    }

    this._historyIndex++;
    this._setCode(
      this._historyIndex === this._history.length
        ? this._draft
        : this._history[this._historyIndex]
    );
    return true;
  };

  private _handleClear = (): boolean => {
    this._clear();
    return true;
  };

  private _completions = async (
    context: CompletionContext
  ): Promise<CompletionResult | null> => {
    // Only pop up while typing a name, unless asked for with Ctrl+Space.
    if (!context.explicit && !context.matchBefore(/[\w.]$/)) {
      return null;
    }

    const { token, matches } = await completeDebugConsole(
      this.hass,
      context.state.sliceDoc(0, context.pos)
    );
    if (!matches.length) {
      return null;
    }

    // Matches are full dotted paths; only complete the part after the last dot.
    const offset = token.lastIndexOf(".") + 1;
    return {
      from: context.pos - token.length + offset,
      // No validFor: the backend caps and filters matches by what was typed,
      // so they cannot be reused while typing on.
      options: matches.map((match) => ({ label: match.slice(offset) })),
    };
  };

  private _onEditorUpdate = (update: ViewUpdate) => {
    if (update.docChanged || update.selectionSet) {
      this._debouncedUpdateSignature();
    }
  };

  private _debouncedUpdateSignature = debounce(
    () => this._updateSignature(),
    150
  );

  private async _updateSignature() {
    const editorState = this._editor?.state;
    if (!editorState) {
      return;
    }

    const code = editorState.sliceDoc(0, editorState.selection.main.head);
    if (code === this._signatureCode) {
      return;
    }
    this._signatureCode = code;
    const request = ++this._signatureRequest;
    let signature: DebugConsoleSignature | undefined;
    try {
      signature =
        (await getDebugConsoleSignature(this.hass, code)).signature ??
        undefined;
    } catch (_err: unknown) {
      // The hint is a convenience; typing goes on without it.
    }

    if (request === this._signatureRequest) {
      this._signature = signature;
    }
  }

  private get _code(): string {
    return this._editor?.state.doc.toString() ?? "";
  }

  private _setCode(code: string) {
    this._editor?.dispatch({
      changes: { from: 0, to: this._editor.state.doc.length, insert: code },
      selection: { anchor: code.length },
    });
  }

  private _guardPaste = (ev: Event): boolean => {
    if (this._pasteAllowed) {
      return false;
    }

    ev.preventDefault();
    this._appendToLog([{ kind: "paste_blocked" }]);
    return true;
  };

  private get _pastePhrase(): string {
    return this.hass.localize(
      "ui.panel.config.tools.tabs.debug_console.paste_phrase"
    );
  }

  private async _run(checkComplete: boolean) {
    const editor = this._editor;
    const code = this._code;
    if (!code.trim() || this._running || !editor) {
      return;
    }

    // The phrase only unlocks pasting; it never reaches the backend.
    if (!this._pasteAllowed && code.trim() === this._pastePhrase) {
      this._allowPasting();
      this._setCode("");
      return;
    }

    const logGeneration = this._logGeneration;
    this._running = true;
    let response: DebugConsoleExecuteResult;
    try {
      response = await executeDebugConsole(this.hass, code, checkComplete);
    } catch (err: unknown) {
      // Websocket errors are plain objects with a message, not Error instances.
      const message = (err as { message?: string }).message;
      response = { error: message ?? String(err) };
    } finally {
      this._running = false;
    }

    // Only touch the prompt if it still holds what was submitted, also when
    // it was saved while the page was left.
    const promptState = this._editor?.state ?? this._savedEditorState;
    const promptUnchanged = promptState?.doc.toString() === code;

    if (response.incomplete) {
      if (promptUnchanged && this._editor === editor) {
        insertNewlineAndIndent(editor);
      }
      return;
    }

    this._addToHistory(code);
    if (promptUnchanged) {
      if (this._editor) {
        this._setCode("");
      } else {
        this._savedEditorState = undefined;
      }
      this._draft = "";
    }

    if (logGeneration !== this._logGeneration) {
      return;
    }

    const entries: ConsoleEntryContent[] = [{ kind: "input", code }];
    for (const values of response.logs ?? []) {
      entries.push({ kind: "log", values });
    }
    if (response.logs_truncated) {
      entries.push({ kind: "output_truncated" });
    }
    if (response.result) {
      entries.push({ kind: "result", value: response.result });
    }
    if (response.error) {
      entries.push({ kind: "error", text: response.error.trimEnd() });
    }
    await this._appendToLog(entries);
  }

  private async _appendToLog(entries: ConsoleEntryContent[]) {
    this._entries = [
      ...this._entries,
      ...entries.map((entry) => ({ ...entry, id: nextEntryId++ })),
    ].slice(-MAX_LOG_ENTRIES);
    saveLog(this._userId!, this._entries);

    await this.updateComplete;
    this._log?.scrollTo({ top: this._log.scrollHeight });
  }

  private async _clear() {
    this._logGeneration++;
    this._entries = [];
    saveLog(this._userId!, this._entries);
    this._editor?.focus();
    // Let the backend release the objects it kept around for inspection.
    await clearDebugConsole(this.hass);
  }

  // Selecting text in the log, or using a control in it, keeps focus there.
  private _focusIfNoSelection(ev: MouseEvent) {
    const onControl = ev
      .composedPath()
      .some((target) => target instanceof HTMLButtonElement);
    if (!onControl && !window.getSelection()?.toString()) {
      this._editor?.focus();
    }
  }

  private _allowPasting() {
    this._pasteAllowed = true;
    this._appendToLog([{ kind: "paste_allowed" }]);
    try {
      window.localStorage.setItem(
        `${STORAGE_KEY_ALLOW_PASTING}-${this._userId}`,
        "true"
      );
    } catch (_err: unknown) {
      // Without storage, pasting stays allowed until the page reloads.
    }
  }

  private _loadPasteAllowed(): boolean {
    try {
      return (
        window.localStorage.getItem(
          `${STORAGE_KEY_ALLOW_PASTING}-${this._userId}`
        ) === "true"
      );
    } catch (_err: unknown) {
      return false;
    }
  }

  private _loadHistory(): string[] {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(`${STORAGE_KEY_HISTORY}-${this._userId}`) ??
          "[]"
      );
      return Array.isArray(stored) ? stored : [];
    } catch (_err: unknown) {
      return [];
    }
  }

  private _addToHistory(code: string) {
    if (this._history[this._history.length - 1] !== code) {
      this._history = [...this._history, code].slice(-MAX_HISTORY);
    }
    this._historyIndex = this._history.length;

    try {
      window.localStorage.setItem(
        `${STORAGE_KEY_HISTORY}-${this._userId}`,
        JSON.stringify(this._history)
      );
    } catch (_err: unknown) {
      // History is a convenience; it works for this session without storage.
    }
  }

  static readonly styles = [
    haStyleScrollbar,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: var(--ha-font-family-code);
        font-size: var(--ha-font-size-s);
        background-color: var(--card-background-color);
      }

      .toolbar {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        padding-inline-start: var(--ha-space-4);
        border-bottom: 1px solid var(--divider-color);
        --mdc-icon-button-size: 36px;
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
      }

      .log {
        flex: 1;
        overflow: auto;
        cursor: text;
      }

      .entry {
        position: relative;
        padding: var(--ha-space-1) var(--ha-space-4);
        padding-inline-start: 32px;
        border-bottom: 1px solid var(--divider-color);
      }

      .intro {
        flex: 1;
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        padding-block: var(--ha-space-2);
        color: var(--secondary-text-color);
        font-family: var(--ha-font-family-body);
        font-size: var(--ha-font-size-m);
      }

      .intro ha-svg-icon {
        flex: none;
        --mdc-icon-size: 24px;
        color: var(--warning-color);
      }

      .marker {
        position: absolute;
        inset-inline-start: 10px;
        top: 5px;
        --mdc-icon-size: 16px;
        color: var(--secondary-text-color);
      }

      .prompt {
        border-bottom: none;
      }

      .signature {
        margin-top: var(--ha-space-1);
        color: var(--secondary-text-color);
      }

      .signature .active {
        color: var(--primary-text-color);
        font-weight: var(--ha-font-weight-bold);
      }

      .signature .doc {
        font-family: var(--ha-font-family-body);
      }

      .prompt .marker {
        color: var(--primary-color);
      }

      pre {
        margin: 0;
        font-family: inherit;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .input pre {
        color: var(--secondary-text-color);
      }

      .log-line {
        display: flex;
        flex-wrap: wrap;
        column-gap: 0.5em;
      }

      .error {
        color: var(--error-color);
        background-color: rgba(var(--rgb-error-color, 219, 68, 55), 0.08);
      }

      .warning,
      .notice {
        font-family: var(--ha-font-family-body);
      }

      .warning {
        background-color: rgba(var(--rgb-warning-color, 255, 166, 0), 0.12);
      }

      .warning .marker {
        color: var(--warning-color);
      }

      .notice {
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "tools-debug-console": ToolsDebugConsole;
  }
}
