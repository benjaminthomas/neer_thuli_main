# MCP Servers Configuration

## Overview

Model Context Protocol (MCP) servers extend Agent OS capabilities with specialized tools and data sources. This document defines the standard MCP server configurations for Agent OS workflows.

## Standard MCP Servers

### Documentation and Knowledge
- **Server**: `context7`
- **Purpose**: Latest documentation for modern web technologies
- **Usage**: Next.js 15, Tailwind CSS 4, React 19, TypeScript 5.x, Vite 5.x documentation
- **Integration**: Use for tech research, API reference, and implementation guidance
- **Features**: Real-time docs, code examples, migration guides, best practices

### Database Operations
- **Server**: `supabase-mcp`
- **Purpose**: Supabase database operations and real-time monitoring
- **Usage**: Query execution, schema inspection, real-time data monitoring, auth management
- **Integration**: Use for database validation, data verification, and debugging
- **Features**: Table inspection, query builder, auth user management, storage operations

### UI Testing and Validation
- **Server**: `playwright-mcp`
- **Purpose**: Browser automation and visual testing
- **Usage**: Open development server, UI testing, visual regression detection, accessibility audits
- **Integration**: Use for UI validation, screenshot comparison, and user flow testing
- **Features**: Multi-browser testing, mobile viewport testing, accessibility scanning

### Component Library Integration
- **Server**: `shadcn-mcp`
- **Purpose**: Shadcn/ui component documentation and integration assistance
- **Usage**: Component demos, implementation examples, prop documentation, theming guidance
- **Integration**: Use for component selection, customization, and integration
- **Features**: Live component demos, code generation, theme customization, accessibility info

### File System Operations
- **Server**: `mcp-server-filesystem`
- **Purpose**: Advanced file system operations
- **Usage**: Bulk file operations, directory scanning, file monitoring
- **Integration**: Use in project setup and file management workflows

### Git Operations
- **Server**: `mcp-server-git`
- **Purpose**: Advanced git operations and repository management
- **Usage**: Branch management, commit analysis, repository statistics
- **Integration**: Use in git-workflow and version control tasks

### Web Services
- **Server**: `mcp-server-fetch`
- **Purpose**: Enhanced web requests with retry logic and caching
- **Usage**: API integrations, external data fetching, webhook handling
- **Integration**: Use for external service integrations

## MCP Server Integration Points

### In Task Execution (`execute-task.md`)
```yaml
mcp_integration:
  step_2_tech_spec:
    - Use context7 for latest API documentation and best practices
    - Use mcp-server-filesystem for reading multiple spec files
    - Use mcp-server-git for checking file history
  step_5_implementation:
    - Use context7 for implementation guidance and examples
    - Use supabase-mcp for database operations and validation
    - Use shadcn-mcp for component selection and integration
    - Use playwright-mcp for UI testing and validation
```

### In Product Planning (`plan-product.md`)
```yaml
mcp_integration:
  research_phase:
    - Use context7 for latest tech stack capabilities
    - Use mcp-server-fetch for market research
    - Use mcp-server-filesystem for template management
  documentation:
    - Use mcp-server-git for repository analysis
```

### In Spec Creation (`create-spec.md`)
```yaml
mcp_integration:
  technical_requirements:
    - Use context7 for latest framework features and APIs
    - Use shadcn-mcp for UI component requirements
  implementation_planning:
    - Use supabase-mcp for database schema validation
    - Use playwright-mcp for testing strategy
```

### In UI Development
```yaml
mcp_integration:
  component_development:
    - Use shadcn-mcp for component demos and documentation
    - Use context7 for latest Tailwind CSS 4 features
  visual_testing:
    - Use playwright-mcp for UI validation and screenshot comparison
    - Use supabase-mcp for data-driven UI testing
```

## Usage Patterns

### Prefer Specialized MCP Servers When:
1. **Documentation Lookup**: Use `context7` for latest tech documentation (Next.js 15, Tailwind 4, etc.)
2. **Database Operations**: Use `supabase-mcp` for Supabase queries, schema inspection, auth management
3. **UI Development**: Use `shadcn-mcp` for component selection, demos, and integration guidance
4. **Visual Testing**: Use `playwright-mcp` for UI validation, browser testing, accessibility audits
5. **Batch Operations**: Use standard MCP servers for bulk file/database operations
6. **Performance Critical**: Optimized operations with caching and retry logic

### Use Standard Tools When:
1. **Simple Operations**: Single file reads/writes
2. **Interactive Tasks**: User input required
3. **Basic Commands**: Standard bash operations
4. **Quick Queries**: Simple database lookups without validation needs

## Configuration Examples

### Context7 Documentation Server
```json
{
  "mcpServers": {
    "context7": {
      "command": "context7-mcp",
      "args": ["--frameworks", "nextjs,tailwind,react,typescript"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

### Supabase MCP Server
```json
{
  "mcpServers": {
    "supabase": {
      "command": "supabase-mcp",
      "args": ["--project-url", "${SUPABASE_URL}"],
      "env": {
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

### Playwright MCP Server
```json
{
  "mcpServers": {
    "playwright": {
      "command": "playwright-mcp",
      "args": ["--dev-server", "http://localhost:3000", "--browsers", "chromium,firefox"]
    }
  }
}
```

### Shadcn MCP Server
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "shadcn-mcp",
      "args": ["--framework", "nextjs", "--style", "default"]
    }
  }
}
```

## Best Practices

1. **Tool Selection**: Always check for MCP equivalents before using standard tools
2. **Error Handling**: MCP servers provide enhanced error context
3. **Performance**: MCP servers are optimized for bulk operations
4. **Security**: MCP servers enforce access controls and permissions
5. **Logging**: MCP servers provide detailed operation logs

## Integration with Agent OS Workflows

Specialized MCP servers should be the preferred choice for:
- **Documentation Research**: Use `context7` for latest Next.js 15, Tailwind 4, React 19 docs
- **Database Operations**: Use `supabase-mcp` for Supabase queries, auth, and real-time monitoring
- **UI Development**: Use `shadcn-mcp` for component demos, props, and integration examples
- **Visual Testing**: Use `playwright-mcp` for UI validation, browser testing, accessibility audits
- **File Operations**: Use `mcp-server-filesystem` in `file-creator` agent
- **Git Operations**: Use `mcp-server-git` in `git-workflow` agent
- **External APIs**: Use `mcp-server-fetch` for external service integrations

## Workflow Priority Order

1. **Context7**: First choice for documentation and API reference
2. **Specialized MCPs**: Use domain-specific MCP servers (Supabase, Shadcn, Playwright)
3. **Standard MCPs**: Use general-purpose MCP servers for bulk operations
4. **Standard Tools**: Use only for simple, single operations