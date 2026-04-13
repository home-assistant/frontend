import { indentLess, indentMore } from "@codemirror/commands";
import {
  HighlightStyle,
  syntaxTree,
  syntaxHighlighting,
} from "@codemirror/language";
import { jinja, closePercentBrace } from "@codemirror/lang-jinja";
import { yaml } from "@codemirror/lang-yaml";
import {
  Compartment,
  EditorState,
  Prec,
  RangeSetBuilder,
} from "@codemirror/state";
import type { KeyBinding, DecorationSet, ViewUpdate } from "@codemirror/view";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { NodeProp } from "@lezer/common";

export {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  selectedCompletion,
} from "@codemirror/autocomplete";
export { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
export {
  foldGutter,
  highlightingFor,
  bracketMatching,
  syntaxTree,
} from "@codemirror/language";
export {
  closeSearchPanel,
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from "@codemirror/search";
export { EditorState } from "@codemirror/state";
export {
  crosshairCursor,
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  rectangularSelection,
  dropCursor,
  tooltips,
} from "@codemirror/view";
export { indentationMarkers } from "@replit/codemirror-indentation-markers";
export { tags } from "@lezer/highlight";

const _yamlWithJinja = jinja({ base: yaml() });

export const langs = {
  jinja2: _yamlWithJinja,
  yaml: _yamlWithJinja,
};

// @codemirror/lang-jinja registers closeBrackets language data with only "{",
// which overrides the full default set and breaks "[" and quote auto-closing.
// This higher-priority override restores the full default bracket set.
export const closeBracketsOverride = Prec.highest(
  EditorState.languageData.of(() => [
    { closeBrackets: { brackets: ["(", "[", "{", "'", '"'] } },
  ])
);

export {
  haJinjaCompletionSource,
  JINJA_FUNCTION_ARG_TYPES,
} from "./jinja_ha_completions";
export type { JinjaArgType } from "./jinja_ha_completions";
export { closePercentBrace };

export const langCompartment = new Compartment();
export const readonlyCompartment = new Compartment();
export const linewrapCompartment = new Compartment();

// ---------------------------------------------------------------------------
// YAML scalar type highlighter
//
// @lezer/yaml assigns tags.content to all unquoted Literal nodes regardless
// of whether the value is a boolean, number, or plain string. This plugin
// walks the syntax tree on each update and applies fine-grained CSS classes
// so the editor can colour each scalar type distinctly — reproducing the
// behaviour of the old @codemirror/legacy-modes YAML mode.
// ---------------------------------------------------------------------------

const yamlBoolMark = Decoration.mark({ class: "yaml-bool" });
const yamlNumberMark = Decoration.mark({ class: "yaml-number" });
const yamlNullMark = Decoration.mark({ class: "yaml-null" });
const yamlStringMark = Decoration.mark({ class: "yaml-string" });

// YAML 1.1 booleans (what Home Assistant / PyYAML recognises)
const YAML_BOOL_RE =
  /^(?:true|True|TRUE|false|False|FALSE|yes|Yes|YES|no|No|NO|on|On|ON|off|Off|OFF)$/;
const YAML_NULL_RE = /^(?:~|null|Null|NULL)$/;
const YAML_INT_RE =
  /^(?:[+-]?(?:0|[1-9][0-9]*)(?:_[0-9]+)*|0o[0-7]+|0x[0-9a-fA-F]+)$/;
const YAML_FLOAT_RE =
  /^(?:[+-]?(?:[0-9][0-9_]*)?\.[0-9.]*(?:[eE][+-]?[0-9]+)?|[+-]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;

function buildYamlDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { doc } = view.state;
  const tree = syntaxTree(view.state);

  for (const { from, to } of view.visibleRanges) {
    // Iterate the top-level tree first. For plain yaml() mode this finds
    // Literal nodes directly. For jinja({ base: yaml() }) mode, the YAML
    // content lives in Text nodes as a mounted subtree — we descend into
    // those explicitly using NodeProp.mounted.
    tree.iterate({
      from,
      to,
      enter(node): boolean | undefined {
        // In jinja({ base: yaml() }) mode, the top-level Template node carries
        // the YAML parse as a mounted subtree with offsets relative to node.from.
        if (node.name === "Template" || node.name === "Text") {
          const nodeTree = node.node.tree;
          const mounted = nodeTree ? nodeTree.prop(NodeProp.mounted) : null;
          if (mounted) {
            const offset = node.from;
            const rangeFrom = Math.max(from, node.from) - offset;
            const rangeTo = Math.min(to, node.to) - offset;
            mounted.tree.iterate({
              from: rangeFrom,
              to: rangeTo,
              enter(n) {
                if (n.name !== "Literal") return;
                if (n.node.parent?.name === "Key") return;
                const absFrom = n.from + offset;
                const absTo = n.to + offset;
                const text = doc.sliceString(absFrom, absTo);
                let mark: Decoration;
                if (YAML_BOOL_RE.test(text)) {
                  mark = yamlBoolMark;
                } else if (YAML_NULL_RE.test(text)) {
                  mark = yamlNullMark;
                } else if (YAML_INT_RE.test(text) || YAML_FLOAT_RE.test(text)) {
                  mark = yamlNumberMark;
                } else {
                  mark = yamlStringMark;
                }
                builder.add(absFrom, absTo, mark);
              },
            });
          }
          return false; // don't recurse further into this node
        }

        // In plain yaml() mode Literal nodes are directly in the top-level tree.
        if (node.name !== "Literal") return undefined;
        if (node.node.parent?.name === "Key") return undefined;
        const text = doc.sliceString(node.from, node.to);
        let mark: Decoration;
        if (YAML_BOOL_RE.test(text)) {
          mark = yamlBoolMark;
        } else if (YAML_NULL_RE.test(text)) {
          mark = yamlNullMark;
        } else if (YAML_INT_RE.test(text) || YAML_FLOAT_RE.test(text)) {
          mark = yamlNumberMark;
        } else {
          mark = yamlStringMark;
        }
        builder.add(node.from, node.to, mark);
        return undefined;
      },
    });
  }
  return builder.finish();
}

export const yamlScalarHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildYamlDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildYamlDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

export const yamlScalarHighlightStyle = EditorView.baseTheme({
  ".yaml-bool": { color: "var(--codemirror-atom, #F90)" },
  ".yaml-null": { color: "var(--codemirror-atom, #F90)" },
  ".yaml-number": { color: "var(--codemirror-number, #ca7841)" },
  ".yaml-string": { color: "var(--codemirror-string, #07a)" },
});

export const tabKeyBindings: KeyBinding[] = [
  { key: "Tab", run: indentMore },
  {
    key: "Shift-Tab",
    run: indentLess,
  },
];

export const haTheme = EditorView.theme({
  "&": {
    color: "var(--primary-text-color)",
    backgroundColor:
      "var(--code-editor-background-color, var(--card-background-color))",
    borderRadius:
      "var(--mdc-shape-small, 4px) var(--mdc-shape-small, 4px) 0px 0px",
    caretColor: "var(--secondary-text-color)",
    height: "var(--code-mirror-height, auto)",
    maxHeight: "var(--code-mirror-max-height, unset)",
  },

  "&.cm-editor": {
    "--indent-marker-active-bg-color": "var(--divider-color)",
  },

  "&.cm-editor.cm-focused": {
    outline: "none",
  },

  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--primary-color)",
  },

  ".cm-dropCursor": {
    borderLeftColor: "var(--secondary-text-color)",
  },

  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(var(--rgb-primary-color), 0.1)",
  },

  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "rgba(var(--rgb-primary-color), 0.2)",
  },

  ".cm-activeLine": {
    backgroundColor: "rgba(var(--rgb-secondary-text-color), 0.1)",
  },

  ".cm-scroller": { outline: "none" },

  ".cm-content": {
    caretColor: "var(--secondary-text-color)",
    paddingTop: "16px",
    paddingBottom: "16px",
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
      "var(--mdc-typography-button-font-family, var(--mdc-typography-font-family, var(--ha-font-family-body)))",
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
    borderBottom: "1px solid var(--secondary-text-color)",
    margin: "4px 4px 0",
    "& ::placeholder": {
      color: "var(--secondary-text-color)",
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
    maxWidth: "min(420px, calc(var(--safe-width) - var(--ha-space-8)))",
    boxSizing: "border-box",
    boxShadow:
      "0px 5px 5px -3px rgb(0 0 0 / 20%), 0px 8px 10px 1px rgb(0 0 0 / 14%), 0px 3px 14px 2px rgb(0 0 0 / 12%)",
  },

  ".cm-tooltip.cm-tooltip-autocomplete": {
    maxWidth:
      "min(420px, calc(var(--safe-width) - var(--ha-space-8)), calc(100% - var(--ha-space-2)))",
  },

  ".cm-tooltip-autocomplete > ul": {
    maxWidth: "100%",
    boxSizing: "border-box",
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
      "var(--code-editor-gutter-color, var(--secondary-background-color, whitesmoke))",
    color: "var(--secondary-text-color)",
    border: "none",
    borderRight: "1px solid var(--secondary-text-color)",
    paddingRight: "1px",
  },
  "&.cm-focused .cm-gutters": {
    borderRight: "2px solid var(--primary-color)",
    paddingRight: "0",
  },
  ".cm-gutterElement.lineNumber": { color: "inherit" },
});

const haHighlightStyle = HighlightStyle.define([
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
  {
    tag: [tags.squareBracket, tags.brace, tags.punctuation],
    color: "var(--codemirror-def, #8DA6CE)",
  },
]);

export const haSyntaxHighlighting = syntaxHighlighting(haHighlightStyle);
