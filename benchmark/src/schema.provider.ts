import {
  OpenAiTypeChecker,
  IOpenAiSchema,
  IHttpOpenAiApplication,
  HttpOpenAi,
  ISwagger,
  IHttpOpenAiFunction,
} from "@wrtnio/schema";

export namespace SchemaProvider {
  interface ISecret {
    key: string;
    scopes: Set<string>;
    value: string | undefined;
  }

  const secrets: Map<string, ISecret> = new Map();

  export const transform = (document: ISwagger) => {
    const application: IHttpOpenAiApplication = HttpOpenAi.application({
      document,
      options: {
        separate: (schema: IOpenAiSchema): boolean =>
          OpenAiTypeChecker.isString(schema) &&
          (schema["x-wrtn-secret-key"] !== undefined ||
            schema["contentMediaType"] !== undefined),
      },
    });
    application.functions = application.functions.filter(
      (func) => false === (func.operation()["x-samchon-human"] === true)
    );
    return application;
  };

  const shrinkSchema = (
    unique: Set<string>,
    schema: IOpenAiSchema
  ): IOpenAiSchema | null => {
    if (OpenAiTypeChecker.isString(schema) && schema["x-wrtn-secret-key"]) {
      const key: string = schema["x-wrtn-secret-key"];
      if (unique.has(key) === true) return null;
      unique.add(key);
      const memory = secrets.get(key);
      if (memory?.value !== undefined) return null;
      else if (memory === undefined) {
        secrets.set(key, {
          key,
          scopes: new Set(schema["x-wrtn-secret-scopes"] ?? []),
          value: undefined,
        });
        return schema;
      } else
        return {
          ...schema,
          "x-wrtn-secret-scopes": Array.from(memory.scopes),
        };
    } else if (OpenAiTypeChecker.isArray(schema)) {
      const items: IOpenAiSchema | null = shrinkSchema(unique, schema.items);
      return items !== null ? { ...schema, items } : null;
    } else if (OpenAiTypeChecker.isObject(schema)) {
      const properties = Object.fromEntries(
        Object.entries(schema.properties ?? {})
          .map(([key, value]) => [key, shrinkSchema(unique, value)] as const)
          .filter(([_key, value]) => !!value)
      ) as Record<string, IOpenAiSchema>;
      const additionalProperties =
        schema.additionalProperties !== undefined &&
        typeof schema.additionalProperties === "object" &&
        schema.additionalProperties !== null
          ? shrinkSchema(unique, schema.additionalProperties)
          : schema.additionalProperties;
      if (Object.keys(properties).length === 0 && !additionalProperties)
        return null;
      return {
        ...schema,
        properties,
        additionalProperties: additionalProperties as undefined,
        required: (schema.required ?? []).filter(
          (k) => properties[k] !== undefined
        ),
      };
    } else if (OpenAiTypeChecker.isOneOf(schema)) {
      const oneOf: IOpenAiSchema[] = schema.oneOf
        .map((s) => shrinkSchema(unique, s))
        .filter((x) => x !== null);
      return oneOf.length !== 0
        ? {
            ...schema,
            oneOf,
          }
        : null;
    }
    return schema;
  };

  export const shrinkParameter = (
    unique: Set<string>,
    p: IHttpOpenAiFunction.ISeparatedParameter
  ): IHttpOpenAiFunction.ISeparatedParameter | null => {
    const schema: IOpenAiSchema | null = shrinkSchema(unique, p.schema);
    return schema !== null
      ? {
          index: p.index,
          schema,
        }
      : null;
  };
}
