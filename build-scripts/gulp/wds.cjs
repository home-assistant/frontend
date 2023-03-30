// Tasks to run Rollup
const gulp = require("gulp");
const { startDevServer } = require("@web/dev-server");

gulp.task("wds-watch-app", () => {
  startDevServer({
    config: {
      watch: true,
    },
  });
});
