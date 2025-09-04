---
description: Create an Agent OS tasks list from an approved feature spec
globs:
alwaysApply: false
version: 1.1
encoding: UTF-8
---

# Spec Creation Rules

## Overview

With the user's approval, proceed to creating a tasks list based on the current feature spec.

<pre_flight_check>
  EXECUTE: @.agent-os/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="file-creator" name="create_tasks">

### Step 1: Create tasks.md

Use the file-creator subagent to create file: tasks.md inside of the current feature's spec folder.

<file_template>
  <header>
    # Spec Tasks
  </header>
</file_template>

<task_structure>
  <major_tasks>
    - count: 1-5
    - format: numbered checklist
    - grouping: by feature or component
  </major_tasks>
  <subtasks>
    - count: up to 8 per major task
    - format: decimal notation (1.1, 1.2)
    - first_subtask: typically write tests
    - last_subtask: verify all tests pass
  </subtasks>
</task_structure>

<task_template>
  ## Tasks

  - [ ] 1. [MAJOR_TASK_DESCRIPTION]
    - [ ] 1.1 Research with Context7 MCP for latest [FRAMEWORK] documentation
    - [ ] 1.2 Write tests for [COMPONENT]
    - [ ] 1.3 Setup Supabase MCP for database operations (if applicable)
    - [ ] 1.4 Use Shadcn MCP for UI component selection
    - [ ] 1.5 [IMPLEMENTATION_STEP]
    - [ ] 1.6 [IMPLEMENTATION_STEP]
    - [ ] 1.7 Validate with Playwright MCP for UI testing
    - [ ] 1.8 Verify all tests pass

  - [ ] 2. [MAJOR_TASK_DESCRIPTION]
    - [ ] 2.1 Use Context7 MCP for [TECH_STACK] best practices
    - [ ] 2.2 Write tests for [COMPONENT]
    - [ ] 2.3 Configure specialized MCP integration
    - [ ] 2.4 [IMPLEMENTATION_STEP]
    - [ ] 2.5 Validate with Playwright MCP
</task_template>

<ordering_principles>
  - Start with Context7 MCP for latest documentation and best practices
  - Consider technical dependencies
  - Follow TDD approach with Playwright MCP for UI validation
  - Group related functionality
  - Build incrementally
  - Integrate Supabase MCP early for database operations
  - Use Shadcn MCP for component selection before custom implementation
  - Setup design system components before custom styling
  - Prioritize accessibility compliance with Playwright accessibility audits
  - End with comprehensive testing using specialized MCPs
</ordering_principles>

</step>

<step number="2" name="execution_readiness">

### Step 2: Execution Readiness Check

Evaluate readiness to begin implementation by presenting the first task summary and requesting user confirmation to proceed.

<readiness_summary>
  <present_to_user>
    - Spec name and description
    - First task summary from tasks.md
    - Estimated complexity/scope
    - Key deliverables for task 1
  </present_to_user>
</readiness_summary>

<execution_prompt>
  PROMPT: "The spec planning is complete. The first task is:

  **Task 1:** [FIRST_TASK_TITLE]
  [BRIEF_DESCRIPTION_OF_TASK_1_AND_SUBTASKS]

  Would you like me to proceed with implementing Task 1? I will focus only on this first task and its subtasks unless you specify otherwise.

  Type 'yes' to proceed with Task 1, or let me know if you'd like to review or modify the plan first."
</execution_prompt>

<execution_flow>
  IF user_confirms_yes:
    REFERENCE: @.agent-os/instructions/core/execute-tasks.md
    FOCUS: Only Task 1 and its subtasks
    CONSTRAINT: Do not proceed to additional tasks without explicit user request
  ELSE:
    WAIT: For user clarification or modifications
</execution_flow>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.agent-os/instructions/meta/post-flight.md
</post_flight_check>
