import Sortable from "sortablejs";
import SortableCore, {
  OnSpill,
  AutoScroll,
} from "sortablejs/modular/sortable.core.esm";

SortableCore.mount(OnSpill, new AutoScroll());

export default SortableCore as typeof Sortable;

export type { Sortable as SortableInstance };
