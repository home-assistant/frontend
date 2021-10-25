export interface CustomIconListWindow {
  customIconLists?: { [key: string]: () => Promise<string[]> };
}

const customIconListsWindow = window as CustomIconListWindow;

if (!("customIconLists" in customIconListsWindow)) {
  customIconListsWindow.customIconLists = {};
}

export const customIconLists = customIconListsWindow.customIconLists!;
