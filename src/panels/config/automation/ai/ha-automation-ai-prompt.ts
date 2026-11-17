import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { autocompletion, completionStatus } from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  insertNewline,
} from "@codemirror/commands";
import { Compartment, EditorState } from "@codemirror/state";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import {
  Decoration,
  EditorView,
  MatchDecorator,
  placeholder,
  tooltips,
  ViewPlugin,
  WidgetType,
  keymap,
} from "@codemirror/view";
import {
  mdiDevices,
  mdiHomeFloor1,
  mdiLabel,
  mdiShape,
  mdiSofa,
  mdiTarget,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-svg-icon";
import type { TargetTypeFloorless } from "../../../../data/target";
import type { AutomationAiMention } from "./automation-ai-agent";
import { MENTION_SOURCE, mentionText } from "./automation-ai-mentions";

const ICONS: Record<string, string> = {
  entity_id: mdiShape,
  device_id: mdiDevices,
  area_id: mdiSofa,
  floor_id: mdiHomeFloor1,
  label_id: mdiLabel,
};

// The slash commands and the part of the target picker each one opens
const COMMANDS: {
  name: "target" | TargetTypeFloorless;
  section?: TargetTypeFloorless;
}[] = [
  { name: "target" },
  { name: "entity", section: "entity" },
  { name: "device", section: "device" },
  { name: "area", section: "area" },
  { name: "label", section: "label" },
];

// CodeMirror scopes its own styles, so these go through its theme
const promptTheme = EditorView.theme({
  "&": {
    flex: "1",
    minWidth: "0",
    color: "var(--primary-text-color)",
    fontSize: "var(--ha-font-size-m)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    maxHeight: "120px",
    overflowY: "auto",
    fontFamily: "inherit",
    lineHeight: "24px",
  },
  ".cm-content": {
    padding: "0",
    caretColor: "var(--primary-text-color)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--primary-text-color)",
  },
  ".cm-line": { padding: "0" },
  ".cm-placeholder": { color: "var(--secondary-text-color)" },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    border: "none",
    borderRadius: "var(--ha-border-radius-md)",
    backgroundColor: "var(--card-background-color)",
    color: "var(--primary-text-color)",
    boxShadow: "var(--ha-box-shadow-m, 0 2px 8px rgba(0, 0, 0, 0.2))",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "inherit",
    maxHeight: "240px",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    padding: "var(--ha-space-2) var(--ha-space-3)",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--ha-color-fill-primary-quiet-resting)",
    color: "var(--primary-text-color)",
  },
  ".cm-completionDetail": {
    marginInlineStart: "var(--ha-space-2)",
    color: "var(--secondary-text-color)",
    fontStyle: "normal",
  },
});

const mentionIcon = (key: string) => ICONS[key] ?? mdiTarget;

class MentionWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly key: string
  ) {
    super();
  }

  eq(other: MentionWidget) {
    return other.label === this.label && other.key === this.key;
  }

  toDOM() {
    const chip = document.createElement("span");
    chip.className = "mention";
    const icon = document.createElement("ha-svg-icon");
    icon.path = mentionIcon(this.key);
    chip.append(icon, this.label);
    return chip;
  }

  ignoreEvent() {
    return false;
  }
}

const mentionMatcher = new MatchDecorator({
  regexp: new RegExp(MENTION_SOURCE, "g"),
  decoration: (match) =>
    Decoration.replace({ widget: new MentionWidget(match[1], match[2]) }),
});

// Shows mentions as chips that the cursor and backspace treat as one
const mentionChips = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = mentionMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
      this.decorations = mentionMatcher.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    provide: (plugin) =>
      EditorView.atomicRanges.of(
        (view) => view.plugin(plugin)?.decorations ?? Decoration.none
      ),
  }
);

/**
 * @summary The prompt of the AI sheet: text with targets as chips. A slash
 * command like `/device` asks to pick a target.
 *
 * @fires value-changed - The prompt changed, with mentions as `@[label](key:id)`
 * @fires prompt-submit - The user pressed enter
 * @fires pick-target - A slash command asks to pick a target
 */
@customElement("ha-automation-ai-prompt")
export class HaAutomationAiPrompt extends LitElement {
  @property() public value = "";

  @property() public placeholder = "";

  @property({ type: Boolean, attribute: "focus-on-open" })
  public focusOnOpen = false;

  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @query(".editor") private _container!: HTMLDivElement;

  private _view?: EditorView;

  private _placeholder = new Compartment();

  protected render() {
    return html`<div class="editor"></div>`;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._view = new EditorView({
      parent: this._container,
      root: this.shadowRoot!,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          history(),
          EditorView.lineWrapping,
          promptTheme,
          this._placeholder.of(placeholder(this.placeholder)),
          mentionChips,
          autocompletion({
            override: [this._commands],
            icons: false,
          }),
          // The sheet moves with a transform, which breaks fixed tooltips
          tooltips({ position: "absolute" }),
          keymap.of([
            { key: "Enter", run: this._submit },
            { key: "Shift-Enter", run: insertNewline },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.contentAttributes.of({
            "aria-label": this.placeholder,
            "aria-multiline": "true",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.value = update.state.doc.toString();
              fireEvent(this, "value-changed", { value: this.value });
            }
          }),
        ],
      }),
    });
    if (this.focusOnOpen) {
      this.focus();
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    const view = this._view;
    if (view && changedProps.has("placeholder")) {
      view.dispatch({
        effects: this._placeholder.reconfigure(placeholder(this.placeholder)),
      });
    }
    if (view && changedProps.has("value")) {
      const doc = view.state.doc.toString();
      if (doc !== this.value) {
        view.dispatch({
          changes: { from: 0, to: doc.length, insert: this.value },
          selection: { anchor: this.value.length },
        });
      }
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._view?.destroy();
    this._view = undefined;
  }

  public focus() {
    this._view?.focus();
  }

  /** Puts a mention at the cursor, which stays where it was while picking. */
  public insertMention(mention: AutomationAiMention) {
    const view = this._view;
    if (!view) {
      return;
    }
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc;
    const before = from > 0 ? doc.sliceString(from - 1, from) : "";
    const after = doc.sliceString(to, to + 1);
    const text = `${before && !/\s/.test(before) ? " " : ""}${mentionText(mention)}${after === " " ? "" : " "}`;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }

  private _submit = (view: EditorView) => {
    if (completionStatus(view.state)) {
      return false;
    }
    fireEvent(this, "prompt-submit");
    return true;
  };

  // Slash commands at the start or after a space
  private _commands = (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/(?:^|\s)\/\w*/);
    if (!match) {
      return null;
    }
    const from = match.text.startsWith("/") ? match.from : match.from + 1;
    return {
      from,
      options: COMMANDS.map((command): Completion => ({
        label: `/${command.name}`,
        detail: this._localize(
          `ui.panel.config.automation.editor.ai.commands.${command.name}`
        ),
        apply: (view, _completion, applyFrom, applyTo) => {
          view.dispatch({ changes: { from: applyFrom, to: applyTo } });
          fireEvent(this, "pick-target", { section: command.section });
        },
      })),
      validFor: /^\/\w*$/,
    };
  };

  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    /* As high as the buttons next to it, until the text needs more lines */
    .editor {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      min-height: 48px;
      border-radius: var(--ha-border-radius-lg);
      background-color: var(
        --ha-color-fill-neutral-quiet-resting,
        var(--secondary-background-color)
      );
      padding: var(--ha-space-2) var(--ha-space-3);
    }
    /* Like the targets in the automation rows */
    .mention {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1);
      padding: 0 var(--ha-space-2) 0 var(--ha-space-1);
      margin: 0 1px;
      border-radius: var(--ha-border-radius-md);
      background-color: var(--ha-color-fill-neutral-normal-resting);
      color: var(--ha-color-on-neutral-normal);
      box-shadow: inset 0 0 0 1px var(--ha-color-border-neutral-quiet);
      box-sizing: border-box;
      height: 22px;
      line-height: 22px;
      /* Centered on the text around it, the icon has no baseline */
      vertical-align: middle;
    }
    .mention ha-svg-icon {
      --mdc-icon-size: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-ai-prompt": HaAutomationAiPrompt;
  }

  interface HASSDomEvents {
    "prompt-submit": undefined;
    "pick-target": { section?: TargetTypeFloorless };
  }
}
