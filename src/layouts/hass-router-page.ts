import { PropertyValues, ReactiveElement } from "lit";
import { property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { navigate } from "../common/navigate";
import { Route } from "../types";

const extractPage = (path: string, defaultPage: string) => {
  if (path === "") {
    return defaultPage;
  }
  const subpathStart = path.indexOf("/", 1);
  return subpathStart === -1
    ? path.substr(1)
    : path.substr(1, subpathStart - 1);
};

export interface RouteOptions {
  // HTML tag of the route page.
  tag: string;
  // Function to load the page.
  load?: () => Promise<unknown>;
  cache?: boolean;
}

export interface RouterOptions {
  // The default route to show if path does not define a page.
  defaultPage?: string;
  // If all routes should be preloaded
  preloadAll?: boolean;
  // If a route has been shown, should we keep the element in memory
  cacheAll?: boolean;
  // Should we show a loading spinner while we load the element for the route
  showLoading?: boolean;
  // Promise that resolves when the initial data is loaded which is needed to show any route.
  initialLoad?: () => Promise<unknown>;
  // Hook that is called before rendering a new route. Allowing redirects.
  // If string returned, that page will be rendered instead.
  beforeRender?: (page: string) => string | undefined;
  routes: {
    // If it's a string, it is another route whose options should be adopted.
    [route: string]: RouteOptions | string;
  };
}

// Time to wait for code to load before we show loading screen.
const LOADING_SCREEN_THRESHOLD = 400; // ms

export class HassRouterPage extends ReactiveElement {
  @property() public route?: Route;

  protected routerOptions!: RouterOptions;

  protected _currentPage = "";

  private _currentLoadProm?: Promise<void>;

  private _cache = {};

  private _initialLoadDone = false;

  private _computeTail = memoizeOne((route: Route) => {
    const dividerPos = route.path.indexOf("/", 1);
    return dividerPos === -1
      ? {
          prefix: route.prefix + route.path,
          path: "",
        }
      : {
          prefix: route.prefix + route.path.substr(0, dividerPos),
          path: route.path.substr(dividerPos),
        };
  });

  protected createRenderRoot() {
    return this;
  }

  protected update(changedProps: PropertyValues) {
    super.update(changedProps);

    const routerOptions = this.routerOptions || { routes: {} };

    if (routerOptions && routerOptions.initialLoad && !this._initialLoadDone) {
      return;
    }

    if (!changedProps.has("route")) {
      // Do not update if we have a currentLoadProm, because that means
      // that there is still an old panel shown and we're moving to a new one.
      if (this.lastChild && !this._currentLoadProm) {
        this.updatePageEl(this.lastChild, changedProps);
      }
      return;
    }

    const route = this.route;
    const defaultPage = routerOptions.defaultPage;

    if (route && route.path === "" && defaultPage !== undefined) {
      navigate(`${route.prefix}/${defaultPage}`, { replace: true });
    }

    let newPage = route
      ? extractPage(route.path, defaultPage || "")
      : "not_found";
    let routeOptions = routerOptions.routes[newPage];

    // Handle redirects
    while (typeof routeOptions === "string") {
      newPage = routeOptions;
      routeOptions = routerOptions.routes[newPage];
    }

    if (routerOptions.beforeRender) {
      const result = routerOptions.beforeRender(newPage);
      if (result !== undefined) {
        newPage = result;
        routeOptions = routerOptions.routes[newPage];

        // Handle redirects
        while (typeof routeOptions === "string") {
          newPage = routeOptions;
          routeOptions = routerOptions.routes[newPage];
        }

        // Update the url if we know where we're mounted.
        if (route) {
          navigate(`${route.prefix}/${result}${location.search}`, {
            replace: true,
          });
        }
      }
    }

    if (this._currentPage === newPage) {
      if (this.lastChild) {
        this.updatePageEl(this.lastChild, changedProps);
      }
      return;
    }

    if (!routeOptions) {
      this._currentPage = "";
      if (this.lastChild) {
        this.removeChild(this.lastChild);
      }
      return;
    }

    this._currentPage = newPage;
    const loadProm = routeOptions.load
      ? routeOptions.load()
      : Promise.resolve();

    let showLoadingScreenTimeout: undefined | number;

    // Check when loading the page source failed.
    loadProm.catch((err) => {
      // eslint-disable-next-line
      console.error("Error loading page", newPage, err);

      // Verify that we're still trying to show the same page.
      if (this._currentPage !== newPage) {
        return;
      }

      // Removes either loading screen or the panel
      if (this.lastChild) {
        this.removeChild(this.lastChild!);
      }

      if (showLoadingScreenTimeout) {
        clearTimeout(showLoadingScreenTimeout);
      }

      // Show error screen
      this.appendChild(
        this.createErrorScreen(`Error while loading page ${newPage}.`)
      );
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

    showLoadingScreenTimeout = window.setTimeout(() => {
      if (created || this._currentPage !== newPage) {
        return;
      }

      // Show a loading screen.
      if (this.lastChild) {
        this.removeChild(this.lastChild);
      }
      this.appendChild(this.createLoadingScreen());
    }, LOADING_SCREEN_THRESHOLD);

    this._currentLoadProm = loadProm.then(
      () => {
        this._currentLoadProm = undefined;
        // Check if we're still trying to show the same page.
        if (this._currentPage !== newPage) {
          return;
        }

        created = true;
        this._createPanel(
          routerOptions,
          newPage,
          // @ts-ignore TS forgot this is not a string.
          routeOptions
        );
      },
      () => {
        this._currentLoadProm = undefined;
      }
    );
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    const options = this.routerOptions;

    if (!options) {
      return;
    }

    if (options.preloadAll) {
      Object.values(options.routes).forEach(
        (route) => typeof route === "object" && route.load && route.load()
      );
    }

    if (options.initialLoad) {
      setTimeout(() => {
        if (!this._initialLoadDone) {
          this.appendChild(this.createLoadingScreen());
        }
      }, LOADING_SCREEN_THRESHOLD);

      options.initialLoad().then(() => {
        this._initialLoadDone = true;
        this.requestUpdate("route");
      });
    }
  }

  protected createLoadingScreen() {
    import("./hass-loading-screen");
    return document.createElement("hass-loading-screen");
  }

  protected createErrorScreen(error: string) {
    import("./hass-error-screen");
    const errorEl = document.createElement("hass-error-screen");
    errorEl.error = error;
    return errorEl;
  }

  /**
   * Rebuild the current panel.
   *
   * Promise will resolve when rebuilding is done and DOM updated.
   */
  protected async rebuild(): Promise<void> {
    const oldRoute = this.route;

    if (oldRoute === undefined) {
      return;
    }

    this.route = undefined;
    await this.updateComplete;
    // Make sure that the parent didn't override this in the meanwhile.
    if (this.route === undefined) {
      this.route = oldRoute;
    }
  }

  /**
   * Promise that resolves when the page has rendered.
   */
  protected get pageRendered(): Promise<void> {
    return this.updateComplete.then(() => this._currentLoadProm);
  }

  protected createElement(tag: string) {
    return document.createElement(tag);
  }

  protected updatePageEl(_pageEl, _changedProps?: PropertyValues) {
    // default we do nothing
  }

  protected get routeTail(): Route {
    return this._computeTail(this.route!);
  }

  private _createPanel(
    routerOptions: RouterOptions,
    page: string,
    routeOptions: RouteOptions
  ) {
    if (this.lastChild) {
      this.removeChild(this.lastChild);
    }

    const panelEl = this._cache[page] || this.createElement(routeOptions.tag);
    this.updatePageEl(panelEl);
    this.appendChild(panelEl);

    if (routerOptions.cacheAll || routeOptions.cache) {
      this._cache[page] = panelEl;
    }
  }
}
