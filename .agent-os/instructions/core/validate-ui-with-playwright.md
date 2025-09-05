---
description: UI Validation and Visual Testing with Playwright MCP
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# UI Validation with Playwright MCP

## Overview

Use Playwright MCP server for comprehensive UI testing, visual validation, and accessibility audits in water infrastructure monitoring system. 

**IMPORTANT**: Playwright MCP is used for UI testing and validation, not test-driven development. This tool provides browser automation capabilities for visual regression testing, accessibility audits, and user flow validation.

<pre_flight_check>
  EXECUTE: @.agent-os/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="development_server_validation">

### Step 1: Development Server Validation

Ensure development servers are running before UI validation.

<server_requirements>
  <web_dashboard>
    - Next.js development server: http://localhost:3000
    - Ensure water infrastructure dashboard is accessible
    - Verify authentication system is functional
  </web_dashboard>
  <mobile_app>
    - React Native Expo server: http://localhost:8081
    - Ensure mobile app preview is available
    - Verify offline-first functionality demo
  </mobile_app>
</server_requirements>

<validation_command>
  mcp__playwright__browser_navigate: "http://localhost:3000"
  mcp__playwright__browser_snapshot: "Capture dashboard accessibility tree"
  mcp__playwright__browser_navigate: "http://localhost:8081"
  mcp__playwright__browser_snapshot: "Capture mobile app preview accessibility tree"
</validation_command>

</step>

<step number="2" name="responsive_design_testing">

### Step 2: Responsive Design Testing

Test water infrastructure UI across different device viewports.

<viewport_testing>
  <mobile_devices>
    - iPhone 14 Pro (393x852) - Field staff mobile usage
    - Galaxy S21 (360x800) - Android field staff
    - iPad Mini (768x1024) - Supervisor tablet usage
  </mobile_devices>
  <desktop_viewports>
    - MacBook Air (1366x768) - Manager dashboard
    - Desktop (1920x1080) - Admin full dashboard
    - Ultrawide (2560x1440) - Multi-project monitoring
  </desktop_viewports>
</viewport_testing>

<testing_commands>
  mcp__playwright__browser_resize: "393x852" # iPhone 14 Pro
  mcp__playwright__browser_take_screenshot: "mobile-navigation-menu.png"
  mcp__playwright__browser_resize: "768x1024" # iPad Mini  
  mcp__playwright__browser_take_screenshot: "tablet-map-interface.png"
  mcp__playwright__browser_resize: "1920x1080" # Desktop
  mcp__playwright__browser_take_screenshot: "desktop-dashboard-layout.png"
  mcp__playwright__browser_resize: "360x800" # Mobile form testing
  mcp__playwright__browser_take_screenshot: "mobile-form-inputs.png"
</testing_commands>

</step>

<step number="3" name="water_infrastructure_ui_validation">

### Step 3: Water Infrastructure Specific UI Testing

Test UI components specific to water infrastructure monitoring.

<infrastructure_components>
  <map_interface>
    - KML file visualization
    - Location pinning functionality
    - Color-coded progress indicators
    - Zoom and pan interactions
  </map_interface>
  <data_entry_forms>
    - Pipe measurement forms
    - Borewell depth entry
    - Motor specifications input
    - Photo upload validation
  </data_entry_forms>
  <progress_dashboards>
    - Village-wise progress charts
    - Component completion status
    - Real-time data updates
    - Export report functionality
  </progress_dashboards>
</infrastructure_components>

<validation_scenarios>
  mcp__playwright__browser_file_upload: "Test KML file upload functionality"
  mcp__playwright__browser_fill_form: "Validate infrastructure component data entry"
  mcp__playwright__browser_take_screenshot: "progress-dashboard-sample-data.png"
  mcp__playwright__browser_file_upload: "Test photo upload with validation"
  mcp__playwright__browser_take_screenshot: "color-coded-map-markers.png"
</validation_scenarios>

</step>

<step number="4" name="accessibility_audit">

### Step 4: Accessibility Audit for Water Infrastructure System

Ensure WCAG 2.1 AA compliance for field staff, supervisors, and administrators.

<accessibility_requirements>
  <field_staff_needs>
    - Large touch targets for mobile data entry
    - High contrast for outdoor usage
    - Simple navigation for quick data entry
    - Voice input support for hands-free operation
  </field_staff_needs>
  <supervisor_manager_needs>
    - Keyboard navigation for dashboard efficiency
    - Screen reader support for reports
    - Focus management in modal dialogs
    - Alternative text for chart visualizations
  </supervisor_manager_needs>
</accessibility_requirements>

<audit_commands>
  mcp__playwright__browser_snapshot: "Accessibility audit for main dashboard"
  mcp__playwright__browser_press_key: "Tab" # Test keyboard navigation
  mcp__playwright__browser_evaluate: "Check ARIA labels and roles for charts"
  mcp__playwright__browser_evaluate: "Validate color contrast ratios"
  mcp__playwright__browser_click: "photo-upload-button" # Test focus management
</audit_commands>

</step>

<step number="5" name="user_flow_testing">

### Step 5: Critical User Flow Testing

Test complete user workflows for water infrastructure monitoring.

<critical_flows>
  <field_staff_workflow>
    1. Login with field staff credentials
    2. Select assigned village/project
    3. Navigate to infrastructure component location
    4. Enter measurement data (pipe size, depth, etc.)
    5. Upload photos as validation
    6. Submit data and sync to server
  </field_staff_workflow>
  
  <supervisor_workflow>
    1. Login to web dashboard
    2. Review submitted field data
    3. Validate photos and measurements
    4. Approve or reject submissions
    5. Assign new tasks by pinning locations on map
    6. Generate progress reports
  </supervisor_workflow>
  
  <manager_workflow>
    1. Access multi-project dashboard
    2. Review village-wise progress
    3. Analyze completion statistics
    4. Export one-page town reports
    5. Monitor real-time data updates
  </manager_workflow>
</critical_flows>

<flow_testing_commands>
  mcp__playwright__browser_fill_form: "Complete field staff login and data entry"
  mcp__playwright__browser_click: "approval-button" # Supervisor workflow
  mcp__playwright__browser_navigate: "multi-project dashboard" # Manager workflow
  mcp__playwright__browser_wait_for: "real-time data update indicators"
</flow_testing_commands>

</step>

<step number="6" name="visual_regression_testing">

### Step 6: Visual Regression Testing

Compare current UI state with approved designs for consistency.

<visual_comparison_areas>
  <component_states>
    - Button hover and active states
    - Form validation error states
    - Loading states for data fetching
    - Empty states for no data scenarios
  </component_states>
  <layout_consistency>
    - Header and navigation consistency
    - Sidebar layout across pages
    - Card component spacing and alignment
    - Table formatting and pagination
  </layout_consistency>
</visual_comparison_areas>

<regression_commands>
  mcp__playwright__browser_hover: "button-element" # Test hover states
  mcp__playwright__browser_take_screenshot: "button-states-comparison.png"
  mcp__playwright__browser_take_screenshot: "form-validation-errors.png"
  mcp__playwright__browser_take_screenshot: "loading-spinner-states.png"
  mcp__playwright__browser_take_screenshot: "progress-cards-layout.png"
</regression_commands>

</step>

<step number="7" name="performance_validation">

### Step 7: UI Performance Validation

Test UI performance with water infrastructure data loads.

<performance_scenarios>
  <data_heavy_scenarios>
    - Loading large village datasets (1000+ infrastructure components)
    - Rendering maps with multiple KML file overlays  
    - Displaying real-time data updates from multiple field teams
    - Generating reports with extensive photo galleries
  </data_heavy_scenarios>
  <network_conditions>
    - Slow 3G (field connectivity simulation)
    - Fast 3G (typical mobile connectivity)
    - WiFi (office environment)
    - Offline mode (field areas without connectivity)
  </network_conditions>
</performance_scenarios>

<performance_commands>
  mcp__playwright__browser_evaluate: "Measure page load performance metrics"
  mcp__playwright__browser_evaluate: "Test map rendering with performance timing"
  mcp__playwright__browser_evaluate: "Simulate slow network conditions"
  mcp__playwright__browser_evaluate: "Test offline mode and sync functionality"
</performance_commands>

</step>

<step number="8" name="cross_browser_testing">

### Step 8: Cross-Browser Compatibility Testing

Ensure compatibility across browsers used by different user types.

<browser_matrix>
  <field_staff_browsers>
    - Chrome Mobile (Android devices)
    - Safari Mobile (iOS devices) 
    - Samsung Internet (Samsung devices)
  </field_staff_browsers>
  <supervisor_manager_browsers>
    - Chrome Desktop (primary)
    - Firefox Desktop (alternative)
    - Safari Desktop (Mac users)
    - Edge Desktop (Windows users)
  </supervisor_manager_browsers>
</browser_matrix>

<cross_browser_commands>
  mcp__playwright__browser_take_screenshot: "dashboard-chrome.png"
  mcp__playwright__browser_take_screenshot: "dashboard-firefox.png"
  mcp__playwright__browser_take_screenshot: "mobile-app-safari.png"
  mcp__playwright__browser_take_screenshot: "form-rendering-comparison.png"
</cross_browser_commands>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.agent-os/instructions/meta/post-flight.md
</post_flight_check>