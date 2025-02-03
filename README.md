# Agent OS

## Installation

```bash
npm install @wrtnio/agent-os
yarn add @wrtnio/agent-os
pnpm install @wrtnio/agent-os
```

and install language model library

```bash
npm install openai
yarn add openai
pnpm install openai
```

## How to run benchmark?

```bash
npm install
npm pack
cd benchmark
npm install
npm run start
```

## How to run tests?

```bash
# if not present, related tests will be skipped
export ANTHROPIC_API_KEY="<your-api-key>"
export OPENAI_API_KEY="<your-api-key>"

npm run test
```
