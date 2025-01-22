// https://stackoverflow.com/a/64408600
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = {
  readonly [k: string]: JsonPrimitive | JsonArray | JsonObject;
};
export type JsonArray = readonly (JsonPrimitive | JsonArray | JsonObject)[];
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
