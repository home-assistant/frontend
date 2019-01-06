export interface PickerTarget extends EventTarget {
  selected: number;
}

export interface ItemSelectedEvent {
  target?: PickerTarget;
}
