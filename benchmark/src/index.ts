import { OpenApi, OpenApiV3, OpenApiV3_1, SwaggerV2 } from "@samchon/openapi";
import { BenchmarkEnvironment } from "./environment";
import { promises } from "fs";
import typia from "typia";
import { randomUUID } from "crypto";
import { IScenario } from "./client.agent";
import { getClientAgent } from "./client.agent";

const apiKey = process.env.OPENAI_API_KEY;
typia.assertGuard<string>(apiKey);

(async () => {
  const start = performance.now();
  const [swagger, scenario] = await Promise.all([
    promises.readFile("./swagger.json", "utf-8").then(JSON.parse),
    promises.readFile("./scenario.json", "utf-8").then(JSON.parse),
  ]);
  typia.assertGuard<IScenario>(scenario);
  typia.assertGuard<
    | SwaggerV2.IDocument
    | OpenApiV3.IDocument
    | OpenApiV3_1.IDocument
    | OpenApi.IDocument
  >(swagger);

  const evaluationResult = await BenchmarkEnvironment.get([
    OpenApi.convert(swagger),
  ]).then((fn) =>
    fn({
      model: "openai",
      apiKey: apiKey,
      sessionId: randomUUID(),
      platformInfo: scenario.platform.prompt,
      initialInformation: scenario.customer.user_context,
    })(getClientAgent(apiKey, scenario)).catch((e) => {
      console.error(e);
      throw e;
    })
  );
  console.log(evaluationResult);
  console.log(performance.now() - start, "ms");
})();
