export interface EditorTarget extends EventTarget {
  selected: number;
}

export interface NodeSelectedEvent {
  target?: EditorTarget;
}
