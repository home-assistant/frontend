import { UpdatingElement, property, PropertyValues } from "lit-element";
import "./hass-error-screen";
import { Route } from "../types";
import { navigate } from "../common/navigate";

const extractPage = (path: string, defaultPage: string) => {
  if (path === "") {
    return defaultPage;
  }
  const subpathStart = path.indexOf("/", 1);
  return subpathStart === -1
    ? path.substr(1)
    : path.substr(1, subpathStart - 1);
};

interface RouteOptions {
  tag: string;
  load: () => Promise<unknown>;
  cache?: boolean;
}

export interface RouterOptions {
  isRoot?: boolean;
  defaultPage?: string;
  preloadAll?: boolean;
  cacheAll?: boolean;
  showLoading?: boolean;
  routes: {
    [route: string]: RouteOptions;
  };
}

// Time to wait for code to load before we show loading screen.
const LOADING_SCREEN_THRESHOLD = 400; // ms

export class HassRouterPage extends UpdatingElement {
  protected static routerOptions: RouterOptions = { routes: {} };

  protected static finalize() {
    super.finalize();
    this._routerOptions = this.routerOptions;
  }

  private static _routerOptions: RouterOptions;

  @property() public route!: Route;
  private _currentPage = "";
  private _cache = {};

  protected update(changedProps: PropertyValues) {
    super.update(changedProps);

    if (!changedProps.has("route")) {
      if (this.lastChild) {
        this._updatePageEl(this.lastChild, changedProps);
      }
      return;
    }

    const route = this.route;

    const routerOptions = (this.constructor as typeof HassRouterPage)
      ._routerOptions;
    const defaultPage = routerOptions.defaultPage || "";

    if (route && route.path === "") {
      navigate(this, `${route.prefix}/${defaultPage}`, true);
    }

    const newPage = route ? extractPage(route.path, defaultPage) : "not_found";

    if (this._currentPage === newPage) {
      if (this.lastChild) {
        this._updatePageEl(this.lastChild, changedProps);
      }
      return;
    }

    this._currentPage = newPage;

    const routeOptions = routerOptions.routes[newPage];

    if (!routeOptions) {
      if (this.lastChild) {
        this._updatePageEl(this.lastChild, changedProps);
      }
      return;
    }

    const loadProm = routeOptions.load();

    // Check when loading the page source failed.
    loadProm.catch(() => {
      // Verify that we're still trying to show the same page.
      if (this._currentPage !== newPage) {
        return;
      }

      // Removes either loading screen or the panel
      this.removeChild(this.lastChild!);

      // Show error screen
      const errorEl = document.createElement("hass-error-screen");
      errorEl.error = `Error while loading page ${newPage}.`;
      this.appendChild(errorEl);
    });

    // If we don't show loading screen, just show the panel.
    // It will be automatically upgraded when loading done.
    if (!routerOptions.showLoading) {
      this._createPanel(routerOptions, newPage, routeOptions);
      return;
    }

    // We are only going to show the loading screen after some time.
    // That way we won't have a double fast flash on fast connections.
    let created = false;

    setTimeout(() => {
      if (created || this._currentPage !== newPage) {
        return;
      }

      // Show a loading screen.
      if (this.lastChild) {
        this.removeChild(this.lastChild);
      }

      const loadingEl = document.createElement("hass-loading-screen");
      loadingEl.isRoot = routerOptions.isRoot;
      this.appendChild(loadingEl);
    }, LOADING_SCREEN_THRESHOLD);

    loadProm.then(() => {
      // Check if we're still trying to show the same page.
      if (this._currentPage !== newPage) {
        return;
      }

      created = true;
      this._createPanel(routerOptions, newPage, routeOptions);
    });
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    const options = (this.constructor as typeof HassRouterPage)._routerOptions;

    if (options.preloadAll) {
      Object.values(options.routes).forEach((route) => route.load());
      return;
    }
  }

  protected _updatePageEl(_pageEl, _changedProps?: PropertyValues) {
    // default we do nothing
  }

  private _createPanel(
    routerOptions: RouterOptions,
    page: string,
    routeOptions: RouteOptions
  ) {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const panelEl =
      this._cache[page] || document.createElement(routeOptions.tag);
    this._updatePageEl(panelEl);
    this.appendChild(panelEl);

    if (routerOptions.cacheAll || routeOptions.cache) {
      this._cache[page] = panelEl;
    }
  }

  protected get routeTail(): Route {
    const route = this.route!;
    const dividerPos = route.path.indexOf("/", 1);
    return dividerPos === -1
      ? {
          prefix: route.path,
          path: "",
        }
      : {
          prefix: route.path.substr(0, dividerPos),
          path: route.path.substr(dividerPos),
        };
  }
}
