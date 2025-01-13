import {
  IHttpConnection,
  IHttpLlmApplication,
  IHttpLlmFunction,
  IHttpResponse,
} from "@samchon/openapi";
import { ILlmApplicationOfValidate, ILlmFunctionOfValidate } from "typia";

export type IController = IController.IHttp | IController.IClass;
export namespace IController {
  export interface IHttp extends IBase<"http", IHttpLlmApplication<"chatgpt">> {
    connection: IHttpConnection;
    execute?: (props: {
      connection: IHttpConnection;
      application: IHttpLlmApplication<"chatgpt">;
      function: IHttpLlmFunction<"chatgpt">;
      arguments: object;
    }) => Promise<IHttpResponse>;
  }
  export interface IClass
    extends IBase<"class", ILlmApplicationOfValidate<"chatgpt">> {
    execute: (props: {
      application: ILlmApplicationOfValidate<"chatgpt">;
      function: ILlmFunctionOfValidate<"chatgpt">;
      arguments: object;
    }) => Promise<unknown>;
  }
  interface IBase<Protocol, Application> {
    name: string;
    protocol: Protocol;
    application: Application;
  }
}
