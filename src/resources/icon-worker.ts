// To use comlink under ES5
import { expose } from "comlink";
import "proxy-polyfill";

type IconItem = {
  icon: string;
  keywords: string[];
};

const filterIconItems = (
  filterString: string,
  iconItems: IconItem[]
): IconItem[] => {
  if (filterString.length === 0) {
    return iconItems;
  }

  const filteredItems: IconItem[] = [];
  const filteredItemsByKeywords: IconItem[] = [];

  iconItems.forEach((item) => {
    if (item.icon.includes(filterString)) {
      filteredItems.push(item);
      return;
    }
    if (item.keywords.some((t) => t.includes(filterString))) {
      filteredItemsByKeywords.push(item);
    }
  });

  filteredItems.push(...filteredItemsByKeywords);

  return filteredItems;
};

const api = {
  filterIconItems,
};

export type Api = typeof api;

expose(api);
