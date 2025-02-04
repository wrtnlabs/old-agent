import { OpenApi, OpenApiV3, OpenApiV3_1, SwaggerV2 } from "@samchon/openapi";
import { BenchmarkEnvironment } from "./environment";
import { promises } from "fs";
import typia from "typia";
import { randomUUID } from "crypto";
import { IScenario } from "./client.agent";
import { getClientAgent } from "./client.agent";
import { app, extractOpenApi } from "./server";
import { ReportExporter } from "./report.exporter";
import { setMaxListeners } from "events";
import { extractConnectorOpenApi } from "./server/util";

const apiKey = process.env.OPENAI_API_KEY;

main();
setMaxListeners(100);
async function main() {
  typia.assertGuard<string>(apiKey);

  const start = performance.now();
  const [localhostSwagger, scenarios] = await Promise.all([
    extractOpenApi(),
    getScenarios(),
  ]);
  app.listen(3000);
  const connectorSwagger = await extractConnectorOpenApi();

  typia.assertGuard<
    | SwaggerV2.IDocument
    | OpenApiV3.IDocument
    | OpenApiV3_1.IDocument
    | OpenApi.IDocument
  >(localhostSwagger);

  typia.assertGuard<
    | SwaggerV2.IDocument
    | OpenApiV3.IDocument
    | OpenApiV3_1.IDocument
    | OpenApi.IDocument
  >(connectorSwagger);

  await Promise.all(
    scenarios.map(async ({ scenario, scenarioName, scenarioTheme }) => {
      const isConnectorServer = !!scenario.connector_base_url;
      const evaluationResult = await BenchmarkEnvironment.get([
        OpenApi.convert(
          isConnectorServer ? connectorSwagger : localhostSwagger
        ),
      ]).then((fn) =>
        fn({
          model: "openai",
          apiKey: apiKey,
          sessionId: randomUUID(),
          platformInfo: scenario.platform.prompt,
          initialInformation: scenario.customer.user_context,
          connectorBaseUrl: isConnectorServer
            ? scenario.connector_base_url!
            : "http://localhost:3000",
        })(getClientAgent(apiKey, scenario)).catch((e) => {
          console.error(e);
          throw e;
        })
      );

      await ReportExporter.report({
        name: `${scenarioTheme}/${scenarioName}`,
        result: evaluationResult,
      });
    })
  );

  console.log(performance.now() - start, "ms");
  process.exit(0);
}

async function getScenarios() {
  const scenarioThemese = await promises.readdir("./scenarios");

  const toResult = async (scenarioTheme: string, scenarioName: string) =>
    promises
      .readFile(`./scenarios/${scenarioTheme}/${scenarioName}`, "utf-8")
      .then(JSON.parse)
      .then((v) => ({
        scenario: typia.assert<IScenario>(v),
        scenarioTheme,
        scenarioName,
      }));

  const resultFromScenarioTheme = (scenarioTheme: string) =>
    promises
      .readdir(`./scenarios/${scenarioTheme}`)
      .then((scenarios) =>
        Promise.all(scenarios.map((v) => toResult(scenarioTheme, v)))
      );

  const scenarios = await Promise.all(
    scenarioThemese.map(resultFromScenarioTheme)
  ).then((v) => v.flat());

  return scenarios;
}
