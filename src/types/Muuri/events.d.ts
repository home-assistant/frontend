import type Item from "./item.d";
import type Muuri from "muuri";

// Type this!!!
export type DraggerEvent = any;

export interface EventListeners {
  synchronize(): any;
  layoutStart(items: Item[]): any;
  layoutEnd(items: Item[]): any;
  add(items: Item[]): any;
  remove(items: Item[]): any;
  showStart(items: Item[]): any;
  showEnd(items: Item[]): any;
  hideStart(items: Item[]): any;
  hideEnd(items: Item[]): any;
  filter(shownItems: Item[], hiddenItems: Item[]): any;
  sort(currentOrder: Item[], previousOrder: Item[]): any;
  move(data: {
    item: Item;
    fromIndex: number;
    toIndex: number;
    action: "move" | "swap";
  }): any;
  send(data: {
    item: Item;
    fromGrid: Muuri;
    fromIndex: number;
    toGrid: Muuri;
    toIndex: number;
  }): any;
  beforeSend(data: {
    item: Item;
    fromGrid: Muuri;
    fromIndex: number;
    toGrid: Muuri;
    toIndex: number;
  }): any;
  receive(data: {
    item: Item;
    fromGrid: Muuri;
    fromIndex: number;
    toGrid: Muuri;
    toIndex: number;
  }): any;
  beforeReceive(data: {
    item: Item;
    fromGrid: Muuri;
    fromIndex: number;
    toGrid: Muuri;
    toIndex: number;
  }): any;
  dragInit(item: Item, event: DraggerEvent): any;
  dragStart(item: Item, event: DraggerEvent): any;
  dragMove(item: Item, event: DraggerEvent): any;
  dragScroll(item: Item, event: DraggerEvent): any;
  dragEnd(item: Item, event: DraggerEvent): any;
  dragReleaseStart(item: Item): any;
  dragReleaseEnd(item: Item): any;
  destroy(): any;
}
