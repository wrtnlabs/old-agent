import { Dialog, Speaker } from "../chat_history";

export function collectHistoryPrompt(histories: Dialog[]): string {
  return `Conversation history:
<conversation_history>
${collectHistories(histories)}
</conversation_history>`;
}

function collectHistories(histories: Dialog[]): string {
  const connectorCalls = collectConnectorCalls(histories);
  const lines: string[] = [];

  for (const history of histories) {
    const { speaker, message } = history;
    switch (message.type) {
      case "text": {
        lines.push(`${speakerName(speaker)}: ${message.text}`);
        break;
      }
      case "tool_result": {
        if (connectorCalls.has(message.tool_use_id)) {
          lines.push(
            `Tool: is_error=${message.is_error}, content=${JSON.stringify(message.content)}`
          );
        }
        break;
      }
      default:
        break;
    }
  }

  return lines.join("\n");
}

function collectConnectorCalls(histories: Dialog[]): Set<string> {
  return new Set(
    Iterator.from(histories)
      .map((history) => history.message)
      .filter((message) => message.type === "tool_use")
      .filter((message) => message.name === "run_functions")
      .map((message) => message.tool_use_id)
  );
}

function speakerName(speaker: Speaker): string {
  switch (speaker.type) {
    case "user":
      return "User";
    case "assistant":
      return "Assistant";
  }
}
