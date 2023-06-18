import gulp from "gulp";
import { startDevServer } from "@web/dev-server";

gulp.task("wds-watch-app", async () => {
  startDevServer({
    config: {
      watch: true,
    },
  });
});
