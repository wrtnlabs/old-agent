export function buildLangCodePrompt(langCode: string): string {
  return `Language Preference:
Please respond in the following language, which represented in ISO 639-1 format:

<lang_code>
${langCode}
</lang_code>

This includes text(chitchat) responses, as well as any other arguments for tools and connectors.
Since this request is prepended to the user's query, do not mention or answer this request, just fullfill the user's request, using the language preference.`;
}
