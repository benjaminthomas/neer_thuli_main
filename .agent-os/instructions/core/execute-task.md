---
description: Rules to execute a task and its sub-tasks using Agent OS
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Task Execution Rules

## Overview

Execute a specific task along with its sub-tasks systematically following a TDD development workflow.

<pre_flight_check>
  EXECUTE: @.agent-os/instructions/meta/pre-flight.md
</pre_flight_check>


<process_flow>

<step number="1" name="task_understanding">

### Step 1: Task Understanding

Read and analyze the given parent task and all its sub-tasks from tasks.md to gain complete understanding of what needs to be built.

<task_analysis>
  <read_from_tasks_md>
    - Parent task description
    - All sub-task descriptions
    - Task dependencies
    - Expected outcomes
  </read_from_tasks_md>
</task_analysis>

<instructions>
  ACTION: Read the specific parent task and all its sub-tasks
  ANALYZE: Full scope of implementation required
  UNDERSTAND: Dependencies and expected deliverables
  NOTE: Test requirements for each sub-task
</instructions>

</step>

<step number="2" name="technical_spec_review">

### Step 2: Technical Specification Review

Search and extract relevant sections from technical-spec.md to understand the technical implementation approach for this task.

<selective_reading>
  <search_technical_spec>
    FIND sections in technical-spec.md related to:
    - Current task functionality
    - Implementation approach for this feature
    - Integration requirements
    - Performance criteria
  </search_technical_spec>
</selective_reading>

<instructions>
  ACTION: Search technical-spec.md for task-relevant sections
  EXTRACT: Only implementation details for current task
  SKIP: Unrelated technical specifications
  FOCUS: Technical approach for this specific feature
</instructions>

</step>

<step number="3" subagent="context-fetcher" name="standards_review">

### Step 3: Standards Review

Use the context-fetcher subagent to retrieve relevant sections from Agent OS standards that apply to the current task's technology stack and feature type.

<selective_reading>
  <search_standards>
    FIND sections relevant to:
    - Task's technology stack from @.agent-os/standards/best-practices.md
    - Feature type being implemented
    - Testing approaches needed
    - Code organization patterns
    - MCP server usage from @.agent-os/standards/mcp-servers.md
    - Design system components from @.agent-os/standards/design-systems.md
  </search_standards>
</selective_reading>

<instructions>
  ACTION: Use context-fetcher subagent
  REQUEST: "Find relevant standards sections for:
            - Task's technology stack: [CURRENT_TECH]
            - Feature type: [CURRENT_FEATURE_TYPE]
            - Testing approaches needed
            - Code organization patterns
            - Applicable specialized MCP servers (Context7, Supabase, Playwright, Shadcn)
            - Required design system components"
  PROCESS: Returned standards information
  PRIORITIZE: Context7 for documentation, specialized MCPs for domain tasks
  APPLY: Relevant patterns, MCP servers, and design components
</instructions>

</step>

<step number="4" subagent="context-fetcher" name="implementation_preparation">

### Step 4: Implementation Preparation

Use the context-fetcher subagent to gather implementation details including code style, MCP server configurations, and design system setup for the current task.

<selective_reading>
  <search_implementation_details>
    FIND implementation details for:
    - Code style rules from @.agent-os/standards/code-style.md
    - MCP server configurations from @.agent-os/standards/mcp-servers.md
    - Design system components from @.agent-os/standards/design-systems.md
    - Languages used in this task
    - File types being modified
    - Component patterns being implemented
  </search_implementation_details>
</selective_reading>

<instructions>
  ACTION: Use context-fetcher subagent
  REQUEST: "Find implementation details for:
            - Code style rules for languages: [LANGUAGES_IN_TASK]
            - File types: [FILE_TYPES_BEING_MODIFIED]
            - Specialized MCP server setup for: [TASK_TYPE]
            - Context7 documentation needs for: [TECH_STACK]
            - Supabase MCP for database operations: [DATA_REQUIREMENTS]
            - Shadcn MCP for UI components: [UI_REQUIREMENTS]
            - Playwright MCP for testing: [TEST_REQUIREMENTS]
            - Component patterns: [PATTERNS_BEING_IMPLEMENTED]"
  PROCESS: Returned implementation guidance
  PRIORITIZE: Specialized MCPs over standard tools
  APPLY: Style rules, MCP integration, and design components
</instructions>

</step>

<step number="5" name="task_execution">

### Step 5: Task and Sub-task Execution

Execute the parent task and all sub-tasks in order using test-driven development (TDD) approach.

<typical_task_structure>
  <first_subtask>Write tests for [feature]</first_subtask>
  <middle_subtasks>Implementation steps</middle_subtasks>
  <final_subtask>Verify all tests pass</final_subtask>
</typical_task_structure>

<execution_order>
  <subtask_1_tests>
    IF sub-task 1 is "Write tests for [feature]":
      - Write all tests for the parent feature
      - Include unit tests, integration tests, edge cases
      - Include design system component tests if applicable
      - Run tests to ensure they fail appropriately
      - Mark sub-task 1 complete
  </subtask_1_tests>

  <middle_subtasks_implementation>
    FOR each implementation sub-task (2 through n-1):
      - Use Context7 MCP for latest documentation and examples
      - Use Supabase MCP for database operations and validation
      - Use Shadcn MCP for component selection and integration
      - Use Playwright MCP for UI testing and visual validation
      - Prefer specialized MCPs over standard tools
      - Use design system components instead of custom styling
      - Implement the specific functionality
      - Make relevant tests pass
      - Update any adjacent/related tests if needed
      - Refactor while keeping tests green
      - Validate design system compliance
      - Mark sub-task complete
  </middle_subtasks_implementation>

  <final_subtask_verification>
    IF final sub-task is "Verify all tests pass":
      - Run entire test suite
      - Fix any remaining failures
      - Ensure no regressions
      - Use Playwright MCP for visual regression testing
      - Use Supabase MCP for data validation
      - Validate specialized MCP server integrations
      - Verify design system compliance
      - Mark final sub-task complete
  </final_subtask_verification>
</execution_order>

<test_management>
  <new_tests>
    - Written in first sub-task
    - Cover all aspects of parent feature
    - Include edge cases and error handling
  </new_tests>
  <test_updates>
    - Made during implementation sub-tasks
    - Update expectations for changed behavior
    - Maintain backward compatibility
  </test_updates>
</test_management>

<instructions>
  ACTION: Execute sub-tasks in their defined order
  RECOGNIZE: First sub-task typically writes all tests
  IMPLEMENT: Middle sub-tasks build functionality
  VERIFY: Final sub-task ensures all tests pass
  UPDATE: Mark each sub-task complete as finished
</instructions>

</step>

<step number="6" subagent="test-runner" name="task_test_verification">

### Step 6: Task-Specific Test Verification

Use the test-runner subagent to run and verify only the tests specific to this parent task (not the full test suite) to ensure the feature is working correctly.

<focused_test_execution>
  <run_only>
    - All new tests written for this parent task
    - All tests updated during this task
    - Tests directly related to this feature
  </run_only>
  <skip>
    - Full test suite (done later in execute-tasks.md)
    - Unrelated test files
  </skip>
</focused_test_execution>

<final_verification>
  IF any test failures:
    - Debug and fix the specific issue
    - Re-run only the failed tests
  ELSE:
    - Confirm all task tests passing
    - Ready to proceed
</final_verification>

<instructions>
  ACTION: Use test-runner subagent
  REQUEST: "Run tests for [this parent task's test files]"
  WAIT: For test-runner analysis
  PROCESS: Returned failure information
  VERIFY: 100% pass rate for task-specific tests
  CONFIRM: This feature's tests are complete
</instructions>

</step>

<step number="7" name="task_status_updates">

### Step 7: Mark this task and sub-tasks complete

IMPORTANT: In the tasks.md file, mark this task and its sub-tasks complete by updating each task checkbox to [x].

<update_format>
  <completed>- [x] Task description</completed>
  <incomplete>- [ ] Task description</incomplete>
  <blocked>
    - [ ] Task description
    ⚠️ Blocking issue: [DESCRIPTION]
  </blocked>
</update_format>

<blocking_criteria>
  <attempts>maximum 3 different approaches</attempts>
  <action>document blocking issue</action>
  <emoji>⚠️</emoji>
</blocking_criteria>

<instructions>
  ACTION: Update tasks.md after each task completion
  MARK: [x] for completed items immediately
  DOCUMENT: Blocking issues with ⚠️ emoji
  LIMIT: 3 attempts before marking as blocked
</instructions>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.agent-os/instructions/meta/post-flight.md
</post_flight_check>
