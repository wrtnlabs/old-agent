import { JsonValue } from "@wrtnio/agent-os";
import { FinishEvaluationResult } from "./client.agent";
import { promises } from "fs";

export namespace ReportExporter {
  const DIRECTORY = "./.results";
  export const report = async (props: ReportExporter.Props) => {
    const { name, result } = props;
    await promises.mkdir(DIRECTORY, { recursive: true });
    await Promise.all([
      promises.writeFile(
        `${DIRECTORY}/${name}.raw.json`,
        JSON.stringify(result, null, 2)
      ),
      promises.writeFile(`${DIRECTORY}/${name}.md`, markdown(name, result)),
    ]);
  };

  const markdown = (name: string, result: Props["result"]) => {
    return `# Benchmark Report for \`${name}\`
    
## Cost

*No cost detail available*

## Evaluation

Final score: \`${result.message.score}\` / 100

### Reasoning

${result.message.reasoning}

### Detailed evaluations

${result.message.evaluations.map((v) => `- ${v.criteria}: ${v.evaluation}`).join("\n")}

### Final decision

${result.message.final_decision}

## Conversation Log

\`\`\`json
[
  ${result.conversation.map((v) => JSON.stringify(v)).join(",\n  ")}
]
\`\`\`
    `;
  };

  export type Props = {
    name: string;
    result: {
      message: FinishEvaluationResult;
      conversation: ConversationLog[];
    };
  };

  export type ConversationLog = {
    event: string;
    message: string;
  } & {
    [k: string]: JsonValue;
  };
}
