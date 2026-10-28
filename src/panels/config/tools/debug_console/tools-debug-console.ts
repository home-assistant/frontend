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
  mdiStop,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { goBack } from "../../../../common/navigate";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
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
  checkDebugConsoleInput,
  clearDebugConsole,
  completeDebugConsole,
  executeDebugConsole,
  inspectDebugConsole,
  getDebugConsoleAttribute,
  getDebugConsoleInfo,
  getDebugConsoleSignature,
  prepareDebugConsoleSession,
  stopDebugConsole,
} from "../../../../data/debug_console";
import {
  haSyntaxHighlighting,
  haTheme,
} from "../../../../resources/codemirror";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import {
  showDebugConsoleWarningDialog,
  type DebugConsoleWarningResult,
} from "./show-dialog-debug-console-warning";
import {
  addToHistory,
  loadHistory,
  loadPasteAllowed,
  savePasteAllowed,
} from "./debug-console-storage";
import { DebugConsoleRuns, type DebugConsoleRun } from "./debug-console-runs";
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

const MAX_LOG_ENTRIES = 500;

// The log outlives this element, so leaving the page and coming back keeps it.
// Only in memory: it shows objects that live in the backend session, which do
// not survive a restart. Per user, so accounts taking turns share nothing.
const logs = new Map<string, ConsoleEntry[]>();
let nextEntryId = 0;

@customElement("tools-debug-console")
class ToolsDebugConsole extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _entries: ConsoleEntry[] = [];

  // The user the log and history belong to.
  private _userId?: string;

  // Bumped by each availability check, so only the latest one counts.
  private _availabilityCheck = 0;

  // Code still running, shown below the log until it is done.
  @state() private _pending: DebugConsoleRun[] = [];

  private _runs = new DebugConsoleRuns(() => {
    this._pending = this._runs.pending;
  });

  // Asking the backend if code is complete, before it runs.
  private _checking = false;

  @state() private _signature?: DebugConsoleSignature;

  // Whether the console can be used: it can be disabled, or not reachable.
  @state() private _status: "checking" | "ready" | "disabled" | "failed" =
    "checking";

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
        ${
          this._pending.length
            ? html`<ha-icon-button
                .label=${this.hass.localize(
                  "ui.panel.config.tools.tabs.debug_console.stop"
                )}
                .path=${mdiStop}
                @click=${this._stop}
              ></ha-icon-button>`
            : nothing
        }
        <ha-icon-button
          .label=${this.hass.localize("ui.panel.config.tools.tabs.debug_console.clear")}
          .path=${mdiCancel}
          @click=${this._clear}
        ></ha-icon-button>
      </div>
      ${this._renderStatus()}
      <div
        class="log ha-scrollbar"
        ?inert=${this._status !== "ready" || this._warningRequired}
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
          ${repeat(
            this._pending,
            (run) => run.id,
            (run) =>
              html`<div class="entry input pending">
                <ha-spinner class="marker" size="tiny"></ha-spinner>
                <pre>${run.code}</pre>
              </div>`
          )}
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
      this._entries = logs.get(userId) ?? [];
      this._history = loadHistory(userId);
      this._historyIndex = this._history.length;
      this._pasteAllowed = loadPasteAllowed(userId);
      prepareDebugConsoleSession(userId);
      this._checkAvailability();
      return;
    }

    // A new configuration, like after a restart, can enable or disable it.
    const oldHass = changedProps.get("hass");
    if (oldHass && oldHass.config !== this.hass.config) {
      this._checkAvailability();
    }
  }

  private _renderStatus() {
    switch (this._status) {
      case "disabled":
        return html`<ha-alert alert-type="info">
          ${this.hass.localize(
            "ui.panel.config.tools.tabs.debug_console.disabled"
          )}
        </ha-alert>`;
      case "failed":
        return html`<ha-alert alert-type="error">
          ${this.hass.localize("ui.panel.config.tools.tabs.debug_console.failed")}
          <ha-button
            slot="action"
            appearance="plain"
            @click=${this._checkAvailability}
          >
            ${this.hass.localize("ui.panel.config.tools.tabs.debug_console.retry")}
          </ha-button>
        </ha-alert>`;
    }

    return nothing;
  }

  private _checkAvailability = async () => {
    const check = ++this._availabilityCheck;
    this._status = "checking";

    let info: Awaited<ReturnType<typeof getDebugConsoleInfo>>;
    try {
      info = await getDebugConsoleInfo(this.hass);
    } catch (err: unknown) {
      if (check === this._availabilityCheck) {
        // Without the integration loaded, its commands do not exist at all.
        this._status =
          (err as { code?: string }).code === "unknown_command"
            ? "disabled"
            : "failed";
      }

      return;
    }

    // Left the page while checking, which checks again on return, or a newer
    // check replaced this one.
    if (!this.isConnected || check !== this._availabilityCheck) {
      return;
    }

    this._status = "ready";
    this._warningRequired = info.warning_required;
    if (info.warning_required) {
      if (!this._warningDialogOpen) {
        this._warningDialogOpen = true;
        showDebugConsoleWarningDialog(this, {
          closedCallback: this._warningClosed,
        });
      }

      return;
    }

    // Focus is ignored while the console is inert, like during this check.
    await this.updateComplete;
    if (this.isConnected && check === this._availabilityCheck) {
      this._editor?.focus();
    }
  };

  private _warningClosed = async (result: DebugConsoleWarningResult) => {
    this._warningDialogOpen = false;
    if (result === "declined") {
      // Not to the Tools panel itself, as that returns to its last tab.
      if (this.isConnected) {
        goBack("/config");
      }

      return;
    }

    // Closed otherwise, like by navigating away, which goes on by itself.
    if (result !== "accepted") {
      return;
    }

    this._warningRequired = false;
    // Once the console is no longer inert, which ignores focus.
    await this.updateComplete;
    if (this.isConnected && this._status === "ready") {
      this._editor?.focus();
    }
  };

  public connectedCallback() {
    super.connectedCallback();
    // The router keeps this page around, so recreate the editor on return.
    if (this.hasUpdated) {
      this.requestUpdate();
      if (this._status !== "ready" || this._warningRequired) {
        this._checkAvailability();
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
            // Like in a terminal; with a selection, it still copies.
            { key: "Ctrl-c", run: this._handleStop },
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

  private _handleStop = (view: EditorView): boolean => {
    if (!view.state.selection.main.empty || !this._pending.length) {
      return false;
    }

    this._stop();
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
    if (!code.trim() || this._checking || !editor) {
      return;
    }

    // The phrase only unlocks pasting; it never reaches the backend.
    if (!this._pasteAllowed && code.trim() === this._pastePhrase) {
      this._allowPasting();
      this._setCode("");
      return;
    }

    if (checkComplete && (await this._needsMoreInput(code))) {
      if (this._editor === editor) {
        this._continueAfter(editor, code);
      }

      return;
    }

    // Off the prompt before it runs, which can take a while, so the next code
    // can be typed meanwhile.
    this._addToHistory(code);
    this._takeOffPrompt(code);

    const response = await this._runs.run(code, this._execute);
    // Cleared while it ran.
    if (!response) {
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

  /**
   * Take submitted code off the start of the prompt, also when the page was
   * left meanwhile. What was typed after it, while it was checked, stays.
   */
  private _takeOffPrompt(code: string) {
    const removeCode = { changes: { from: 0, to: code.length } };
    if (this._editor) {
      if (this._editor.state.doc.toString().startsWith(code)) {
        this._editor.dispatch(removeCode);
      }
    } else if (this._savedEditorState?.doc.toString().startsWith(code)) {
      this._savedEditorState = this._savedEditorState.update(removeCode).state;
    }

    this._draft = "";
  }

  private async _needsMoreInput(code: string): Promise<boolean> {
    this._checking = true;
    try {
      return (await checkDebugConsoleInput(this.hass, code)).incomplete;
    } catch (_err: unknown) {
      // Running it reports what is wrong, like a warning not yet accepted.
      return false;
    } finally {
      this._checking = false;
    }
  }

  private _execute = async (
    code: string
  ): Promise<DebugConsoleExecuteResult> => {
    try {
      return await executeDebugConsole(this.hass, code);
    } catch (err: unknown) {
      // Websocket errors are plain objects with a message, not Error instances.
      const { code: errorCode, message } = err as {
        code?: string;
        message?: string;
      };

      if (errorCode === "warning_not_accepted") {
        this._warningRequired = true;
        this._checkAvailability();
      }

      return { error: message ?? String(err) };
    }
  };

  private async _stop() {
    try {
      await stopDebugConsole(this.hass);
    } catch (err: unknown) {
      await this._appendToLog([
        {
          kind: "error",
          text: (err as { message?: string }).message ?? String(err),
        },
      ]);
    }
  }

  /**
   * Start a new line after code that needs more, where Enter was pressed.
   *
   * Typing on while that was checked continues on the new line, as long as
   * the prompt still starts with that code.
   */
  private _continueAfter(editor: EditorView, code: string) {
    if (!editor.state.doc.toString().startsWith(code)) {
      return;
    }

    const { anchor, head } = editor.state.selection.main;
    const lengthBefore = editor.state.doc.length;
    editor.dispatch({ selection: { anchor: code.length } });
    insertNewlineAndIndent(editor);

    // Without typing on, the cursor goes to the new line, like Enter does.
    // Otherwise it stays where it was, in what was typed after.
    if (anchor <= code.length && head <= code.length) {
      return;
    }

    const inserted = editor.state.doc.length - lengthBefore;
    const shift = (position: number) =>
      position > code.length ? position + inserted : position;
    editor.dispatch({
      selection: { anchor: shift(anchor), head: shift(head) },
    });
  }

  private async _appendToLog(entries: ConsoleEntryContent[]) {
    this._entries = [
      ...this._entries,
      ...entries.map((entry) => ({ ...entry, id: nextEntryId++ })),
    ].slice(-MAX_LOG_ENTRIES);
    logs.set(this._userId!, this._entries);

    await this.updateComplete;
    this._log?.scrollTo({ top: this._log.scrollHeight });
  }

  private async _clear() {
    this._runs.clear();
    this._entries = [];
    logs.set(this._userId!, this._entries);
    this._editor?.focus();

    // Let the backend release the objects it kept around for inspection, when
    // there is a console to ask.
    if (this._status !== "ready" || this._warningRequired) {
      return;
    }

    try {
      await clearDebugConsole(this.hass);
    } catch (err: unknown) {
      await this._appendToLog([
        {
          kind: "error",
          text: (err as { message?: string }).message ?? String(err),
        },
      ]);
    }
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
    savePasteAllowed(this._userId!);
    this._appendToLog([{ kind: "paste_allowed" }]);
  }

  private _addToHistory(code: string) {
    this._history = addToHistory(this._userId!, this._history, code);
    this._historyIndex = this._history.length;
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
