import { availableParallelism } from "node:os";
import "./build-scripts/gulp/index.ts";

process.env.UV_THREADPOOL_SIZE = availableParallelism().toString();
