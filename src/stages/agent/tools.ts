import { Tool } from "../../lm_bridge/inputs/tool";

export const TOOLS: readonly Tool[] = [
  {
    name: "lookup_functions",
    description: `\
The lookup_functions function searches for and retrieves functions based on a given query.

Input:
- thoughts (string, required)
- queries (array of object, required): For each query object:
  - query (field, string, required)
  - specifications (field, string, optional)

Example Input:
{"thoughts":"...","queries":[{"query":"...","specifications":"..."},{"query":"...","specifications":"..."}]}\
    `,
    parameters: [
      {
        name: "thoughts",
        schema: { type: "string" },
        isRequired: true,
      },
      {
        name: "queries",
        schema: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              query: { type: "string" },
              specifications: { type: "string" },
            },
            required: ["query"],
          },
        },
        isRequired: true,
      },
    ],
  },
  {
    name: "run_functions",
    description: `\
This function executes functions in parallel to fulfill a user's request. If you need to execute multiple functions in parallel, use this function.

Input:
- thoughts: (string, required)
- items: (array of object, required): For each item object:
  - purpose: (string, required)
  - function_id: (string, required)

Example Input:
{"thoughts":"...","items":[{"function_id":"...","purpose":"..."},{"function_id":"...","purpose":"..."}]}\
`,
    parameters: [
      {
        name: "thoughts",
        schema: { type: "string" },
        isRequired: true,
      },
      {
        name: "items",
        schema: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              function_id: { type: "string" },
              purpose: { type: "string" },
            },
            required: ["purpose", "function_id"],
          },
        },
        isRequired: true,
      },
    ],
  },
] as const;
