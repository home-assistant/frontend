import { deepEqual } from "../../../common/util/deep-equal";
import type { HomeFrontendSystemData } from "../../../data/frontend";
import {
  resolveShortcutItems,
  type ShortcutItem,
} from "../../../data/home_shortcuts";

/** What the home settings form edits, in the form's own terms. */
export interface EditorState {
  favorite_entities: string[];
  show_suggested_entities: boolean;
  show_welcome_message: boolean;
  shortcuts: ShortcutItem[];
}

export const editorStateFromConfig = (
  config: HomeFrontendSystemData
): EditorState => ({
  favorite_entities: config.favorite_entities
    ? [...config.favorite_entities]
    : [],
  show_suggested_entities: !config.hide_suggested_entities,
  show_welcome_message: !config.hide_welcome_message,
  shortcuts: config.shortcuts ? [...config.shortcuts] : [],
});

export const buildHomeConfig = (
  baseConfig: HomeFrontendSystemData,
  draft: EditorState
): HomeFrontendSystemData => ({
  ...baseConfig,
  favorite_entities:
    draft.favorite_entities.length > 0 ? draft.favorite_entities : undefined,
  hide_suggested_entities: draft.show_suggested_entities ? undefined : true,
  hide_welcome_message: draft.show_welcome_message ? undefined : true,
  shortcuts: draft.shortcuts.length > 0 ? draft.shortcuts : undefined,
});

const stripUndefined = <T extends object>(item: T): T =>
  Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined)
  ) as T;

const normalizeShortcuts = (items: ShortcutItem[]): ShortcutItem[] =>
  resolveShortcutItems(items).map(stripUndefined);

/**
 * Comparison-only form of an editor state: shortcuts are resolved the way
 * they render (so `[]` matches the full default list) and stripped of
 * `undefined` keys (e.g. `hidden` after hiding then showing again). Never
 * persist the result.
 */
const normalizeEditorState = (state: EditorState): EditorState => ({
  ...state,
  shortcuts: normalizeShortcuts(state.shortcuts),
});

/** Content equality of two editor states, ignoring shortcut shape only. */
export const editorStatesEqual = (a: EditorState, b: EditorState): boolean =>
  deepEqual(normalizeEditorState(a), normalizeEditorState(b));
