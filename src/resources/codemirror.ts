import { indentLess, indentMore } from "@codemirror/commands";
import { HighlightStyle, tags } from "@codemirror/highlight";
import { jinja2 } from "@codemirror/legacy-modes/mode/jinja2";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";
import { Compartment } from "@codemirror/state";
import { StreamLanguage } from "@codemirror/stream-parser";
import { EditorView, KeyBinding } from "@codemirror/view";

export { defaultKeymap } from "@codemirror/commands";
export { lineNumbers } from "@codemirror/gutter";
export { HighlightStyle, tags } from "@codemirror/highlight";
export { history, historyKeymap } from "@codemirror/history";
export { rectangularSelection } from "@codemirror/rectangular-selection";
export { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
export { EditorState, Prec } from "@codemirror/state";
export { autocompletion } from "@codemirror/autocomplete";
export {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
} from "@codemirror/view";

export const langs = {
  jinja2: StreamLanguage.define(jinja2),
  yaml: StreamLanguage.define(yaml),
};

export const langCompartment = new Compartment();
export const readonlyCompartment = new Compartment();

export const tabKeyBindings: KeyBinding[] = [
  { key: "Tab", run: indentMore },
  {
    key: "Shift-Tab",
    run: indentLess,
  },
];

export const theme = EditorView.theme({
  "&": {
    color: "var(--primary-text-color)",
    backgroundColor:
      "var(--code-editor-background-color, var(--mdc-text-field-fill-color, whitesmoke))",
    "& ::selection": { backgroundColor: "rgba(var(--rgb-primary-color), 0.3)" },
    borderRadius:
      "var(--mdc-shape-small, 4px) var(--mdc-shape-small, 4px) 0px 0px",
    caretColor: "var(--secondary-text-color)",
    height: "var(--code-mirror-height, auto)",
    maxHeight: "var(--code-mirror-max-height, unset)",
  },

  "&.cm-editor.cm-focused": { outline: "none" },

  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--secondary-text-color)",
  },

  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(var(--rgb-primary-color), 0.3)",
  },

  ".cm-activeLine": {
    backgroundColor: "rgba(var(--rgb-secondary-text-color), 0.1)",
  },

  ".cm-scroller": { outline: "none" },

  ".cm-content": {
    caretColor: "var(--secondary-text-color)",
    paddingTop: "16px",
  },

  ".cm-panels": {
    backgroundColor: "var(--primary-background-color)",
    color: "var(--primary-text-color)",
  },
  ".cm-panels.top": { borderBottom: "1px solid var(--divider-color)" },
  ".cm-panels.bottom": { borderTop: "1px solid var(--divider-color)" },

  ".cm-button": {
    border: "1px solid var(--primary-color)",
    padding: "0px 16px",
    textTransform: "uppercase",
    margin: "4px",
    background: "none",
    color: "var(--primary-color)",
    fontFamily:
      "var(--mdc-typography-button-font-family, var(--mdc-typography-font-family, Roboto, sans-serif))",
    fontSize: "var(--mdc-typography-button-font-size, 0.875rem)",
    height: "36px",
    fontWeight: "var(--mdc-typography-button-font-weight, 500)",
    borderRadius: "4px",
    letterSpacing: "var(--mdc-typography-button-letter-spacing, 0.0892857em)",
  },

  ".cm-textfield": {
    padding: "4px 0px 5px",
    borderRadius: "0",
    fontSize: "16px",
    color: "var(--primary-text-color)",
    border: "0",
    background: "none",
    fontFamily: "Roboto",
    borderBottom:
      "1px solid var(--paper-input-container-color, var(--secondary-text-color))",
    margin: "4px 4px 0",
    "& ::placeholder": {
      color: "var(--paper-input-container-color, var(--secondary-text-color))",
    },
    "&:focus": {
      outline: "none",
      borderBottom: "2px solid var(--primary-color)",
      paddingBottom: "4px",
    },
  },

  ".cm-tooltip": {
    color: "var(--primary-text-color)",
    backgroundColor:
      "var(--code-editor-background-color, var(--card-background-color))",
    border: "1px solid var(--divider-color)",
    borderRadius: "var(--mdc-shape-medium, 4px)",
    boxShadow:
      "0px 5px 5px -3px rgb(0 0 0 / 20%), 0px 8px 10px 1px rgb(0 0 0 / 14%), 0px 3px 14px 2px rgb(0 0 0 / 12%)",
  },

  "& .cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    padding: "4px 8px",
  },

  "& .cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "var(--primary-color)",
    color: "var(--text-primary-color)",
  },

  ".cm-completionIcon": {
    display: "none",
  },

  ".cm-completionDetail": {
    fontFamily: "Roboto",
    color: "var(--secondary-text-color)",
  },

  "li[aria-selected] .cm-completionDetail": {
    color: "var(--text-primary-color)",
  },

  "& .cm-completionInfo.cm-completionInfo-right": {
    left: "calc(100% + 4px)",
  },

  "& .cm-tooltip.cm-completionInfo": {
    padding: "4px 8px",
    marginTop: "-5px",
  },

  ".cm-selectionMatch": {
    backgroundColor: "rgba(var(--rgb-primary-color), 0.1)",
  },

  ".cm-searchMatch": {
    backgroundColor: "rgba(var(--rgb-accent-color), .2)",
    outline: "1px solid rgba(var(--rgb-accent-color), .4)",
  },
  ".cm-searchMatch.selected": {
    backgroundColor: "rgba(var(--rgb-accent-color), .4)",
    outline: "1px solid var(--accent-color)",
  },

  ".cm-gutters": {
    backgroundColor:
      "var(--code-editor-gutter-color, var(--mdc-text-field-fill-color, whitesmoke))",
    color: "var(--paper-dialog-color, var(--secondary-text-color))",
    border: "none",
    borderRight:
      "1px solid var(--paper-input-container-color, var(--secondary-text-color))",
    paddingRight: "1px",
  },
  "&.cm-focused .cm-gutters": {
    borderRight:
      "2px solid var(--paper-input-container-focus-color, var(--primary-color))",
    paddingRight: "0",
  },
  ".cm-gutterElement.lineNumber": { color: "inherit" },
});

export const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--codemirror-keyword, #6262FF)" },
  {
    tag: [
      tags.name,
      tags.deleted,
      tags.character,
      tags.propertyName,
      tags.macroName,
    ],
    color: "var(--codemirror-property, #905)",
  },
  {
    tag: [tags.function(tags.variableName), tags.labelName],
    color: "var(--codemirror-variable, #07a)",
  },
  {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: "var(--codemirror-qualifier, #690)",
  },
  {
    tag: [tags.definition(tags.name), tags.separator],
    color: "var(--codemirror-def, #8DA6CE)",
  },
  {
    tag: [
      tags.typeName,
      tags.className,
      tags.number,
      tags.changed,
      tags.annotation,
      tags.modifier,
      tags.self,
      tags.namespace,
    ],
    color: "var(--codemirror-number, #ca7841)",
  },
  {
    tag: [
      tags.operator,
      tags.operatorKeyword,
      tags.url,
      tags.escape,
      tags.regexp,
      tags.link,
      tags.special(tags.string),
    ],
    color: "var(--codemirror-operator, #cda869)",
  },
  { tag: tags.comment, color: "var(--codemirror-comment, #777)" },
  {
    tag: tags.meta,
    color: "var(--codemirror-meta, var(--primary-text-color))",
  },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  {
    tag: tags.link,
    color: "var(--primary-color)",
    textDecoration: "underline",
  },
  { tag: tags.heading, fontWeight: "bold" },
  { tag: tags.atom, color: "var(--codemirror-atom, #F90)" },
  { tag: tags.bool, color: "var(--codemirror-atom, #F90)" },
  {
    tag: tags.special(tags.variableName),
    color: "var(--codemirror-variable-2, #690)",
  },
  { tag: tags.processingInstruction, color: "var(--secondary-text-color)" },
  { tag: tags.string, color: "var(--codemirror-string, #07a)" },
  { tag: tags.inserted, color: "var(--codemirror-string2, #07a)" },
  { tag: tags.invalid, color: "var(--error-color)" },
]);
