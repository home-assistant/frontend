import { availableParallelism } from "node:os";
import "./build-scripts/gulp/index.mjs";

process.env.UV_THREADPOOL_SIZE = availableParallelism();
