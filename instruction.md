# Instruction: Expanding Meow's Capabilities via Ecosystem Skills

This document teaches Meow agents how to discover and install advanced superpowers from the Ecosystem Registry.

## 🔎 Discovery
When a task requires specialized workflows (TDD, persistence, context management, or autonomous research), the agent should first check the `ecosystem/registry/` directory for a matching capability.

## 🛠️ Installation Patterns

Depending on the project type defined in the registry's YAML, use the following patterns:

### 1. Marketplace Plugins (Recommended)
Most modern superpowers like `Superpowers`, `gstack`, and `Claude-Mem` are available via the marketplace.
- **Step 1**: Register the marketplace: `/plugin marketplace add [username]/[repository]`
- **Step 2**: Install the plugin: `/plugin install [plugin_name]`

### 2. NPM / NPX Tooling
Tools like `GSD` are distributed via npm and should be invoked or installed using `npx`:
- **Pattern**: `npx [package-name]@latest`
- **Scope**: Can be installed globally or locally within a project directory.

### 3. Manual Repository Linking
For infrastructure toolkits like `ECC`:
- **Pattern**: `git clone [url]` (into a temporary or configuration directory).
- **Integration**: Follow the `README` to link configuration files (like `CLAUDE.md`, `.clauderc`) into the current workspace.

### 4. Skill Files
If the project is a pure skill repository:
- **Location**: Skills can be manually placed in `~/.claude/skills/`.
- **Method**: Download the `.ts` or `.js` skill files and symlink them into the central skills directory.

## 🚀 Activation
After installation, most systems require a restart of the Claude Code session or a "refresh" of the environment to register new slash commands (e.g., `/gsd`, `/mem`, `/plan`).

## 🚨 Safety & Guardrails
- **Sandboxing**: Always prefer installing into a Docker-sandboxed environment if performing autonomous research.
- **Review**: Before installing, read the registry's `notes` for any specific dependencies or conflicts.
