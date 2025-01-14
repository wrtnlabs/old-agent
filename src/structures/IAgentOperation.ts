import { IHttpLlmFunction } from "@samchon/openapi";
import { IAgentController } from "./IAgentController";
import { ILlmFunctionOfValidate } from "typia";

export type IAgentOperation = IAgentOperation.IHttp | IAgentOperation.IClass;
export namespace IAgentOperation {
  export type IHttp = IBase<
    "http",
    IAgentController.IHttp,
    IHttpLlmFunction<"chatgpt">
  >;

  export type IClass = IBase<
    "class",
    IAgentController.IClass,
    ILlmFunctionOfValidate<"chatgpt">
  >;

  interface IBase<Protocol, Application, Function> {
    /**
     * Protocol discriminator.
     */
    protocol: Protocol;

    /**
     * Belonged controller of the target function.
     */
    controller: Application;

    /**
     * Target function to call.
     */
    function: Function;

    /**
     * Identifier name.
     */
    name: string;
  }
}
