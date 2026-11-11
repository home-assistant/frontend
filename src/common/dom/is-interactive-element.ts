const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='slider']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='option']",
  "[role='combobox']",
  "[role='textbox']",
].join(",");

/**
 * Whether `node` is an element that handles clicks or keyboard input on its
 * own, such as a button, link, form control or a focusable widget.
 */
export const isInteractiveElement = (node: EventTarget): boolean =>
  node instanceof Element && node.matches(INTERACTIVE_SELECTOR);
