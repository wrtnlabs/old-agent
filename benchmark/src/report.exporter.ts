import { FinishEvaluationResult } from "./client.agent";
import { promises } from "fs";

export namespace ReportExporter {
  const DIRECTORY = "./.results";
  export const report = async (
    name: string,
    result: FinishEvaluationResult
  ) => {
    await promises.mkdir(DIRECTORY, { recursive: true });
    await Promise.all([
      promises.writeFile(
        `${DIRECTORY}/${name}.raw.json`,
        JSON.stringify(result, null, 2)
      ),
      promises.writeFile(`${DIRECTORY}/${name}.md`, markdown(name, result)),
    ]);
  };

  const markdown = (name: string, result: FinishEvaluationResult) => {
    return `# Benchmark Report for \`${name}\`
    
## Cost

*No cost detail available*

## Evaluation

Final score: \`${result.score}\` / 100

### Reasoning

${result.reasoning}

### Detailed evaluations

${result.evaluations.map((v) => `- ${v.criteria}: ${v.evaluation}`).join("\n")}

### Final decision

${result.final_decision}

## Conversation Log

\`\`\`
TODO
\`\`\`
    `;
  };
}
