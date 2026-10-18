# MCP server for llm-eval-harness, speaking MCP over stdio.
# Run it with: docker run -i --rm ghcr.io/razilzul/llm-eval-harness:<version>
FROM node:22-slim

# Ownership proof for the MCP Registry. Must equal "name" in server.json.
LABEL io.modelcontextprotocol.server.name="io.github.razilzul/llm-eval-harness"
LABEL org.opencontainers.image.source="https://github.com/razilzul/llm-eval-harness"
LABEL org.opencontainers.image.description="MCP server that runs a golden set and A/B-gates LLM model swaps"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# tsx is a devDependency and runs the TypeScript directly, so install everything.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY data ./data

USER node
ENTRYPOINT ["node_modules/.bin/tsx", "src/mcp.ts"]
