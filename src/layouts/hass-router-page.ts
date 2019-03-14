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
  defaultPage?: string;
  preloadAll?: boolean;
  cacheAll?: boolean;
  showLoading?: boolean;
  routes: {
    [route: string]: RouteOptions;
  };
}

export class HassRouterPage extends UpdatingElement {
  protected static routerOptions: RouterOptions = { routes: {} };

  protected static finalize() {
    super.finalize();
    this._routerOptions = this.routerOptions;
  }

  private static _routerOptions: RouterOptions;
  @property() public route!: Route;
  public showMenu?: boolean;
  private _currentPage = "";
  private _cache = {};

  protected update() {
    if (this.lastChild) {
      this._updateEl(this.lastChild);
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    const options = (this.constructor as typeof HassRouterPage)._routerOptions;

    if (options.preloadAll) {
      Object.values(options.routes).forEach((route) => route.load());
      return;
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("route")) {
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
      return;
    }

    this._currentPage = newPage;

    const routeOptions = routerOptions.routes[newPage];

    if (!routeOptions) {
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

    // Show a loading screen.
    const loadingEl = document.createElement("hass-loading-screen");
    loadingEl.showMenu = this.showMenu;
    this.appendChild(loadingEl);

    loadProm.then(() => {
      // Check if we're still trying to show the same page.
      if (this._currentPage !== newPage) {
        return;
      }

      this._createPanel(routerOptions, newPage, routeOptions);
    });
  }

  protected _updateEl(_pageEl) {
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
    this._updateEl(panelEl);
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
