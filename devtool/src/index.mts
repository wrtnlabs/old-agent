import {
  type Dialog,
  type InitialInformation,
  MetaAgentSessionManager,
} from "@wrtnio/agent-os";
import * as slint from "slint-ui";
import * as uuid from "uuid";

const sessionManager = new MetaAgentSessionManager({});

interface History {
  timestamp: string;
  dialog: Dialog;
}

interface DevTool extends slint.ComponentHandle {
  session_id: string;
  chat_history: slint.ArrayModel<History>;
  session_starting(userInformation: InitialInformation): void;
  message_accepted(message: string): void;
}

const ui: any = slint.loadFile(new URL("../ui/main.slint", import.meta.url));
const tool: DevTool = new ui.DevTool();
tool.chat_history = new slint.ArrayModel<History>([]);
tool.session_starting = (userInformation) => {
  console.log("on-start-session %o", userInformation);
};

await tool.run();
