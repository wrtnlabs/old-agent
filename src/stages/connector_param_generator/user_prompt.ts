import { Dialog } from "../../chat_history";
import { OpenAiFunction } from "../../function";
import { collectHistoryPrompt } from "../collect_history_prompt";

export function buildUserPrompt(
  connector: OpenAiFunction,
  purpose: string,
  histories: Dialog[]
): string {
  const functionDef = stringifyConnector(connector, false);
  const historyPrompt = collectHistoryPrompt(histories);

  return `\
You are tasked with generating parameter values for a given function definition and execution purpose. Here's what you'll be working with:

Here's the function definition:
<function_definition>
${functionDef}
</function_definition>

And here's the purpose of the function execution:
<purpose>
${purpose}
</purpose>

${historyPrompt}

Your task is to provide values for all parameters of the function, following these guidelines:

1. Ensure that the values respect any constraints specified in the function definition.
2. Follow the execution purpose as closely as possible when constructing values.
3. Make sure each value aligns with the context provided in the conversation history.
4. Refer the context and function calls to understand the context. Use them to generate values for parameters.

To complete this task, follow these steps:

1. Carefully analyze the function definition, noting the parameter types, names, and any constraints.
1.1. Important: You typically do not need to put empty strings for any parameters. If you want to omit optinal fields of an object, you can just omit them. DO NOT put empty strings and/or default values for them.
2. Review the execution purpose to understand the intended use of the function and its parameters.
3. Examine the conversation history to gather context that might influence the parameter values.
4. Formulate your thought process, explaining how you arrived at each value and how it relates to the function definition, purpose, and conversation history.
4.1. Your thought process must include the following information:
    a. Language preference of the user, to generate all values in the preferred user language.
    b. Identify what the connector does, and what it can achieve.
    c. Plan how to generate values for the parameters.
    d. Guide yourself to generate values in the preferred user language correctly.
5. Generate appropriate values for each parameter, ensuring they meet all requirements and align with the context.
5.1. Important: when generating arguments, you must identify if they are for position-based or keyword-based. Refer the purpose, as it describes about this.
5.2. Language Preference: Remember to generate all values in the preferred user language. Do your best to translate data given in other languages into the preferred user language if necessary.
5.3. Language Preference: Identify any parameters that may user-facing or affecting user experience, and generate values in the preferred user language. For example:
- Queries for search: you should generate values in the preferred user language, since they may affect the result of the search.
- Names of people, companies, and organizations: you should generate values in the preferred user language, since they are user-facing.
- Names of files: you should generate values in the preferred user language, since they are user-facing.
- Subject and body of emails: you should generate values in the preferred user language, since they are user-facing.
- Any other parameters that you determine as user-facing: you should generate values in the preferred user language, since they are user-facing. Refer above examples to determine if the parameter is user-facing.

Your response should be a valid JSON object with two keys: "thought" and "arguments". The "thought" key should contain a detailed explanation of your reasoning process. The "arguments" key should be an array containing the generated parameter values in the order they appear in the function definition.

Here's two examples of how your response should be structured, one for position-based, one for keyword-based:

<example_position>
{
  "thought": "I have identified that the user's preferred language is [lang_code].\nAfter analyzing the function definition, purpose, and conversation history,\nI determined that...",
  "arguments": [
    false,
    true,
    123,
    123.123,
    "hello,\nworld!", // Here, it must follows the user language preference.
    [1, 2, 3],
    {
      "foo": "example", // Here, it must follows the user language preference.
      "bar": 456
    }
  ]
}
</example_position>

<example_keyword>
{
  "thought": "I have identified that the user's preferred language is [lang_code].\nAfter analyzing the function definition, purpose, and conversation history,\nI determined that...",
  "arguments": [{
    "param1": false,
    "param2": true,
    "param3": 123,
    "param4": 123.123,
    "param5": "안녕하세요!", // Here, it must follows the user language preference.
    "param6": [1, 2, 3],
    "param7": {
      "foo": "예시", // Here, it must follows the user language preference.
      "bar": 456
    }
  }]
}
</example_keyword>

Remember to provide a thorough explanation in the "thought" section, detailing your reasoning for each generated value. Ensure that your response is a valid JSON object and that the values in the "arguments" array match the types and order of the parameters in the function definition.

For any strings in the JSON of your response, correctly escape strings, especially for double quotes, new lines, backslashes, etc. You MUST not use newlines directly inside any strings.

<useful_tips>
- You may see "iri" format sometimes. This is a equivalent to "uri" format, but it allows non-url-encoded characters such as Korean, Japanese, special characters, and so on.
</useful_tips>`;
}

function stringifyConnector(
  _connector: OpenAiFunction,
  _includeReturnType: boolean
): string {
  throw new Error("TODO");
}
