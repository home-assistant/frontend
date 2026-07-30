export const GULP_TASKS = {
  app: {
    develop: "develop-app",
    build: "build-app",
    modern: "build-app-modern",
    analyze: "analyze-app",
  },
  cast: {
    develop: "develop-cast",
    build: "build-cast",
  },
  demo: {
    develop: "develop-demo",
    build: "build-demo",
    e2e: "build-demo-e2e",
    analyze: "analyze-demo",
  },
  e2eApp: {
    develop: "develop-e2e-test-app",
    build: "build-e2e-test-app",
    e2e: "build-e2e-test-app-e2e",
  },
  gallery: {
    develop: "develop-gallery",
    build: "build-gallery",
  },
  landingPage: {
    develop: "develop-landing-page",
    build: "build-landing-page",
  },
};
