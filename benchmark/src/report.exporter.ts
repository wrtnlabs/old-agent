import { JsonValue } from "@wrtnio/agent-os";
import { FinishEvaluationResult } from "./client.agent";
import { promises } from "fs";

export namespace ReportExporter {
  const DIRECTORY = "./.results";
  export const report = async (props: ReportExporter.Props) => {
    const [additionalDirectory, name] = (() => {
      const splited = props.name.split("/");
      return [splited.slice(0, -1).join("/"), splited.at(-1)];
    })();
    await promises.mkdir(`${DIRECTORY}/${additionalDirectory}`, {
      recursive: true,
    });
    await Promise.all([
      promises.writeFile(
        `${DIRECTORY}/${additionalDirectory}/${name}.raw.json`,
        JSON.stringify(props.result, null, 2)
      ),
      promises.writeFile(
        `${DIRECTORY}/${additionalDirectory}/${name}.md`,
        markdown(props.name, props.result)
      ),
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
[\t${result.conversation.map((v) => JSON.stringify(v)).join(",\n\t")}\n]
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
