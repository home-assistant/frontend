import type Sortable from "sortablejs";
import SortableCore, {
  AutoScroll,
  OnSpill,
} from "sortablejs/modular/sortable.core.esm";

SortableCore.mount(OnSpill);
SortableCore.mount(new AutoScroll());

export default SortableCore as typeof Sortable;

export type { Sortable as SortableInstance };
