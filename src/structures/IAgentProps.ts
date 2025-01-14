import { IAgentController } from "./IAgentController";
import { IAgentProvider } from "./IAgentProvider";
import { IAgentPrompt } from "./IAgentPrompt";
import { IAgentConfig } from "./IAgentConfig";
import { Primitive } from "typia";

export type IAgentProps = {
  controllers: IAgentController[];
  provider: IAgentProvider;
  config?: IAgentConfig;
  histories?: Primitive<IAgentPrompt>[];
};
