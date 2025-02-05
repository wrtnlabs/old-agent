import workerThreads from "worker_threads";
import { register } from "ts-node";
import { app } from "./samchon_rhythmical_instrument";

export const extractConnectorOpenApi = async () => {
  return fetch(
    "https://wrtnlabs.github.io/connectors/swagger/swagger.json"
  ).then((v) => v.json());
};
export const extractOpenApi = async () => {
  const worker = new workerThreads.Worker("./src/server/util.ts", {
    execArgv: [
      "--loader",
      "ts-node/esm",
      "--require",
      "ts-node/register/transpile-only",
    ],
  });
  return await new Promise((resolve, reject) => {
    register({
      transpileOnly: true,
      compilerOptions: {
        module: "commonjs",
        target: "es2020",
      },
    });

    worker.on("message", async (v) => {
      if (v.type === "port-open") {
        const res = await getOpenApi();
        resolve(res);
      }
    });
    worker.on("error", reject);
  }).finally(() => {
    worker.terminate();
  });
};

const getOpenApi = async () => {
  const openApi = await fetch(`http://localhost:3000/musical/swagger/json`);
  return openApi.json();
};

if (workerThreads.parentPort) {
  (async () => {
    app.listen(3000);
    workerThreads.parentPort!.postMessage({
      type: "port-open",
    });
  })();
}
