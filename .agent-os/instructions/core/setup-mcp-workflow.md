---
description: MCP Server Setup and Integration Workflow for Agent OS
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# MCP Server Setup Workflow

## Overview

Configure Model Context Protocol (MCP) servers for enhanced Agent OS capabilities and tool integration.

<pre_flight_check>
  EXECUTE: @.agent-os/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="assess_project_needs">

### Step 1: Assess Project MCP Requirements

Use the context-fetcher subagent to analyze the project's tech stack and features to determine which MCP servers would be beneficial.

<assessment_areas>
  <database_operations>
    - Check for PostgreSQL or SQLite usage
    - Identify complex query requirements
    - Assess migration and schema needs
  </database_operations>
  <file_operations>
    - Bulk file processing needs
    - Template management requirements
    - Asset organization complexity
  </file_operations>
  <git_operations>
    - Repository analysis needs
    - Branch management complexity
    - Commit history requirements
  </git_operations>
  <external_integrations>
    - API integrations
    - Web service dependencies
    - External data fetching needs
  </external_integrations>
</assessment_areas>

<instructions>
  ACTION: Use context-fetcher subagent
  REQUEST: "Analyze project requirements for MCP server integration:
            - Database operations from tech-stack.md
            - File processing needs from roadmap features
            - Git workflow complexity
            - External service integrations"
  PROCESS: Returned project analysis
  IDENTIFY: Applicable MCP servers for this project
</instructions>

</step>

<step number="2" subagent="file-creator" name="create_mcp_config">

### Step 2: Create MCP Configuration

Use the file-creator subagent to create MCP server configuration files based on the project's needs.

<config_structure>
  .agent-os/
  └── config/
      ├── mcp-servers.json        # MCP server configurations
      └── mcp-usage.md           # Usage guidelines for this project
</config_structure>

<mcp_servers_json_template>
{
  "mcpServers": {
    "postgres": {
      "command": "mcp-server-postgres",
      "args": ["--connection-string", "${DATABASE_URL}"],
      "enabled": true
    },
    "filesystem": {
      "command": "mcp-server-filesystem", 
      "args": ["--allowed-dirs", "/project", "/tmp"],
      "enabled": true
    },
    "git": {
      "command": "mcp-server-git",
      "args": ["--repository", "."],
      "enabled": true
    },
    "fetch": {
      "command": "mcp-server-fetch",
      "args": ["--timeout", "30"],
      "enabled": false
    },
    "sqlite": {
      "command": "mcp-server-sqlite",
      "args": ["--db-path", "./tmp/development.sqlite3"],
      "enabled": true
    }
  }
}
</mcp_servers_json_template>

</step>

<step number="3" subagent="file-creator" name="create_usage_guidelines">

### Step 3: Create MCP Usage Guidelines

Use the file-creator subagent to create project-specific MCP usage guidelines.

<usage_guidelines_template>
# MCP Server Usage Guidelines

## Project-Specific MCP Integration

### Enabled MCP Servers

[LIST_OF_ENABLED_SERVERS_WITH_USE_CASES]

### Usage Patterns

#### Database Operations (mcp-server-postgres)
- Migration management: Use for complex schema changes
- Data analysis: Use for reporting and analytics queries
- Bulk operations: Use for large data imports/exports

#### File Operations (mcp-server-filesystem) 
- Template management: Use for generating multiple files
- Asset organization: Use for bulk asset processing
- Project scaffolding: Use for creating directory structures

#### Git Operations (mcp-server-git)
- Repository analysis: Use for commit history and statistics
- Branch management: Use for complex branching workflows
- Code review: Use for analyzing changes across branches

### When to Use Standard Tools vs MCP Servers

#### Use MCP Servers For:
- Batch operations (multiple files/database operations)
- Complex queries and analysis
- Performance-critical operations
- External service integrations with retry logic

#### Use Standard Tools For:
- Simple single operations
- Interactive user input
- Basic file reads/writes
- Standard bash commands

</usage_guidelines_template>

</step>

<step number="4" name="integration_validation">

### Step 4: Integration Validation

Validate that MCP servers are properly configured and accessible for the project.

<validation_checklist>
  - [ ] MCP configuration file syntax is valid
  - [ ] Required environment variables are documented
  - [ ] Server permissions are properly configured
  - [ ] Usage guidelines are project-specific
  - [ ] Integration points are identified in workflows
</validation_checklist>

<instructions>
  ACTION: Review MCP configuration
  VALIDATE: JSON syntax and server accessibility
  DOCUMENT: Any environment setup requirements
  CONFIRM: MCP servers match project needs
</instructions>

</step>

<step number="5" name="workflow_integration">

### Step 5: Update Workflow Integration

Update existing Agent OS workflow files to reference MCP server usage where applicable.

<integration_points>
  <execute_task_md>
    - Add MCP server preference in implementation steps
    - Update tool selection guidance
    - Include MCP error handling patterns
  </execute_task_md>
  <create_spec_md>
    - Include MCP considerations in technical specs
    - Add MCP server requirements to spec templates
  </create_spec_md>
  <create_tasks_md>
    - Include MCP setup tasks where applicable
    - Update task ordering to prioritize MCP integration
  </create_tasks_md>
</integration_points>

<instructions>
  ACTION: Reference updated workflow files
  ENSURE: MCP integration is properly documented
  VALIDATE: Workflows include MCP considerations
</instructions>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.agent-os/instructions/meta/post-flight.md
</post_flight_check>