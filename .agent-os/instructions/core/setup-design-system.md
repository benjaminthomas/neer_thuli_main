---
description: Design System Setup and Integration Workflow for Agent OS
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Design System Setup Workflow

## Overview

Establish design system standards and component integration for consistent UI/UX across Agent OS projects.

<pre_flight_check>
  EXECUTE: @.agent-os/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="analyze_ui_requirements">

### Step 1: Analyze UI Requirements

Use the context-fetcher subagent to analyze the project's UI/UX requirements from the product specifications and roadmap.

<analysis_areas>
  <component_needs>
    - Identify required UI components from specs
    - Map features to design system components
    - Identify custom component requirements
  </component_needs>
  <responsive_requirements>
    - Mobile-first design needs
    - Tablet and desktop considerations
    - Breakpoint requirements
  </responsive_requirements>
  <accessibility_needs>
    - WCAG compliance requirements
    - Keyboard navigation needs
    - Screen reader compatibility
  </accessibility_needs>
  <performance_targets>
    - Bundle size constraints
    - Loading performance requirements
    - Runtime performance needs
  </performance_targets>
</analysis_areas>

<instructions>
  ACTION: Use context-fetcher subagent
  REQUEST: "Analyze UI requirements from project specs:
            - Required components from roadmap features
            - Responsive design needs for target devices
            - Accessibility requirements for user types
            - Performance constraints from tech stack"
  PROCESS: Returned UI analysis
  IDENTIFY: Design system requirements and customizations
</instructions>

</step>

<step number="2" subagent="file-creator" name="create_design_config">

### Step 2: Create Design System Configuration

Use the file-creator subagent to create design system configuration and guidelines specific to the project.

<config_structure>
  .agent-os/
  └── design/
      ├── design-tokens.json      # Design tokens configuration
      ├── component-library.md    # Component usage guidelines
      └── accessibility.md        # Accessibility requirements
</config_structure>

<design_tokens_template>
/* globals.css - Tailwind CSS 4.0 + Shadcn/ui OKLCH */
@import 'tailwindcss';

:root {
  /* Shadcn/ui OKLCH Design Tokens */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  
  /* Chart Colors */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.145 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.488 0.243 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  
  /* Dark mode chart colors */
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}
</design_tokens_template>

</step>

<step number="3" subagent="file-creator" name="create_component_guidelines">

### Step 3: Create Component Usage Guidelines

Use the file-creator subagent to create comprehensive component usage guidelines for the project.

<component_guidelines_template>
# Component Library Guidelines

## Framework Integration

### [FRAMEWORK_NAME] Components

#### Primary Component Library
- **Library:** [COMPONENT_LIBRARY_NAME]
- **Installation:** [INSTALLATION_COMMAND]
- **Configuration:** [CONFIG_FILE_REFERENCE]

#### Required Components
- **Button:** Primary, secondary, outline, ghost variants
- **Input:** Text, email, password, validation states
- **Card:** Content containers with header/footer
- **Modal:** Dialogs and overlays
- **Table:** Data display with sorting/filtering
- **Form:** Form validation and submission

#### Custom Components
[LIST_PROJECT_SPECIFIC_COMPONENTS]

## Component Usage Patterns

### Button Component
```[FRAMEWORK_SYNTAX]
<Button variant="primary" size="md">
  Primary Action
</Button>
```

### Form Components
```[FRAMEWORK_SYNTAX]
<Form>
  <Input 
    label="Email"
    type="email"
    validation="email"
    required
  />
</Form>
```

## Responsive Design

### Breakpoints
- **Mobile:** 320px - 768px
- **Tablet:** 768px - 1024px  
- **Desktop:** 1024px+

### Mobile-First Approach
- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly interactive elements

## Accessibility Standards

### WCAG 2.1 AA Compliance
- Color contrast ratio 4.5:1 minimum
- Keyboard navigation for all interactive elements
- Screen reader compatible ARIA labels
- Focus indicators for all focusable elements

### Implementation Requirements
- Semantic HTML structure
- Proper heading hierarchy
- Form label associations
- Error message accessibility

</component_guidelines_template>

</step>

<step number="4" subagent="file-creator" name="create_accessibility_guide">

### Step 4: Create Accessibility Guidelines

Use the file-creator subagent to create project-specific accessibility requirements and testing guidelines.

<accessibility_guide_template>
# Accessibility Guidelines

## WCAG 2.1 Compliance Requirements

### Level AA Standards (Minimum)
- **Color Contrast:** 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation:** All functionality accessible via keyboard
- **Screen Reader:** Compatible with assistive technologies
- **Focus Management:** Visible focus indicators required

### Implementation Checklist

#### Forms
- [ ] All inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Required fields are properly indicated
- [ ] Form validation is accessible

#### Navigation
- [ ] Keyboard navigation works throughout application
- [ ] Skip links provided for main content
- [ ] Navigation landmarks are properly marked
- [ ] Tab order is logical and intuitive

#### Content
- [ ] Heading hierarchy is semantic (h1, h2, h3...)
- [ ] Images have appropriate alt text
- [ ] Color is not the only means of conveying information
- [ ] Text can be zoomed to 200% without horizontal scrolling

### Testing Requirements

#### Automated Testing
- Use axe-core for accessibility testing
- Include accessibility tests in CI/CD pipeline
- Minimum 90% accessibility test coverage

#### Manual Testing
- Keyboard-only navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Color contrast validation
- Mobile accessibility testing

### Component Accessibility

#### Buttons
```[FRAMEWORK_SYNTAX]
<Button
  aria-label="Submit form"
  disabled={isLoading}
  aria-describedby={errorId}
>
  Submit
</Button>
```

#### Forms
```[FRAMEWORK_SYNTAX]
<Input
  id="email"
  label="Email Address"
  required
  aria-describedby="email-error"
  aria-invalid={hasError}
/>
```

</accessibility_guide_template>

</step>

<step number="5" name="integration_setup">

### Step 5: Framework Integration Setup

Configure the chosen framework's design system integration based on the project's tech stack.

<framework_integrations>
  <react_typescript>
    - Setup Shadcn/ui with Tailwind CSS 4.0
    - Configure OKLCH design tokens in globals.css
    - Use CSS-first configuration with @theme inline
    - Setup component prop interfaces with TypeScript
    - Configure Storybook for documentation
    - Remove tailwind.config.js (use CSS-first approach)
  </react_typescript>
  <react_native>
    - Setup NativeBase or React Native Elements
    - Configure theme provider
    - Setup platform-specific adaptations
    - Configure responsive utilities
  </react_native>
  <ruby_rails>
    - Setup ViewComponent with Tailwind CSS
    - Configure SCSS variables
    - Setup Stimulus JavaScript behaviors
    - Configure component testing
  </ruby_rails>
</framework_integrations>

<instructions>
  ACTION: Identify project's primary framework
  CONFIGURE: Framework-specific design system integration
  SETUP: Design tokens and component library
  VALIDATE: Integration works with build system
</instructions>

</step>

<step number="6" name="testing_setup">

### Step 6: Design System Testing Setup

Configure testing infrastructure for design system components and accessibility validation.

<testing_configuration>
  <visual_regression>
    - Screenshot comparison testing
    - Cross-browser validation
    - Component state testing
  </visual_regression>
  <accessibility_testing>
    - Automated axe-core integration
    - Keyboard navigation testing
    - Screen reader compatibility
  </accessibility_testing>
  <performance_testing>
    - Bundle size monitoring
    - Runtime performance validation
    - Loading performance testing
  </performance_testing>
</testing_configuration>

<instructions>
  ACTION: Setup testing infrastructure
  CONFIGURE: Visual regression and accessibility testing
  INTEGRATE: Testing into CI/CD pipeline
  VALIDATE: All tests pass with sample components
</instructions>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.agent-os/instructions/meta/post-flight.md
</post_flight_check>