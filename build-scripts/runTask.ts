// run-build.ts
import { series } from "gulp";
import { availableParallelism } from "node:os";
import tasks from "./gulp/index.ts";

process.env.UV_THREADPOOL_SIZE = availableParallelism().toString();

const runGulpTask = async (runTasks: string[]) => {
  try {
    for (const taskName of runTasks) {
      if (tasks[taskName] === undefined) {
        console.error(`Gulp task "${taskName}" does not exist.`);
        console.log("Available tasks:");
        Object.keys(tasks).forEach((task) => {
          console.log(`  - ${task}`);
        });
        process.exit(1);
      }
    }

    await new Promise((resolve, reject) => {
      series(...runTasks.map((taskName) => tasks[taskName]))((err?: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve(null);
        }
      });
    });

    process.exit(0);
  } catch (error: any) {
    console.error(`Error running Gulp task "${runTasks}":`, error);
    process.exit(1);
  }
};

// Get the task name from command line arguments
// TODO arg validation
const tasksToRun = process.argv.slice(2);

runGulpTask(tasksToRun);
