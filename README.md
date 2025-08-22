# vibe-coding-with-deno-sandbox

A demo application where you can vibe-code your app and deploy it instantly to
an ephemeral sandbox powered by
[Deno Deploy EA](https://docs.deno.com/deploy/early-access/), showcasing how the
sandbox SDK [`@deno/sandbox`] can be used and integrated with AI toolkits like
[`AI SDK`]

## Overview

This Next.js app demonstrates how to integrate [`@deno/sandbox`] to execute and
host AI-generated untrusted code safely. An AI assistant generates code that
gets run in a sandbox with full filesystem HTTP server capabilities, and
publicly accessible URL.

## Demo

![Demo](./demo.gif)

## Setup

```bash
# Install dependencies
pnpm install

# Set env vars in `.env.local`
ANTHROPIC_API_KEY=your_key
GOOGLE_GENERATIVE_AI_API_KEY=your_key
DENO_DEPLOY_TOKEN=your_token

# Run dev server
pnpm dev
```

## Tech Stack

- Next.js 15
- [`@deno/sandbox`] for isolated code execution
- Claude or Gemini for code generation
- [`AI SDK`] for easy integration with AI models

[`@deno/sandbox`]: https://jsr.io/@deno/sandbox
[`AI SDK`]: https://ai-sdk.dev/
