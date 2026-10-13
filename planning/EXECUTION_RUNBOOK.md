# Execution runbook — do not run until user kickoff

## Verified environment and limits

Read-only inspection found `/Users/ammad/.local/bin/claude`, `/Users/ammad/.local/bin/teamclaude` and `/Users/ammad/.local/bin/agent` (Cursor CLI). The `cursor` launcher was not found on PATH. No application was launched and no account configuration was inspected or changed.

Installed TeamClaude package: `@karpeleslab/teamclaude`, version 1.1.25, under `/Users/ammad/.local/lib/node_modules/@karpeleslab/teamclaude/`. Its installed README/source describe a proxy wrapper for Claude Code. It does not supply this project's work breakdown, worktree isolation or cross-application task board. Those are explicit in our plan.

Claude Code Agent Teams provides the teammate orchestration. Official documentation currently describes it as experimental and enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Use an interactive session for a team; do not assume `claude -p` starts teammates. Installed support, model access and the actual chosen model must be checked at kickoff. The user's requested 'Opus 5.5' is a preference, not a version verified by this plan.

## Preparation order

1. CORE records the actual deadline and validates the available runtime/tool versions.
2. CORE reviews the partial scaffold, writes contract stubs and the build pipeline, and makes one baseline commit. Do not initialize worktrees from an empty/uncommitted directory.
3. CORE assigns absolute worktree paths and branches. Copy this complete planning pack into the common baseline so external sessions need no chat history.
4. Main Opus receives prompts/OPUS_RISK.md. The separate Opus receives prompts/OPUS_PIP.md. Each gets its actual worktree path and baseline SHA in the handoff.
5. Open three Cursor sessions in their assigned worktrees and paste C1/C2/C3 prompts. Their instructions are separate from Sonnet's.
6. Start one interactive terminal team lead in the assigned terminal checkout. Paste TERMINAL_TEAM_LEAD.md and identify the Sonnet worker worktrees or the shared team-checkout mode explicitly.
7. CORE gathers first slices and integrates in the order in MASTER_PLAN.md. Only CORE owns the main dev server/recording browser. Workers use assigned separate ports if needed.

## Terminal launch shape

These examples are documentation, not commands executed by this planning turn. First navigate to the worktree CORE has assigned. Preserve existing account configuration; do not change credentials, routing, model substitutions or global settings as part of launch.

If the existing TeamClaude proxy is already running, reuse it. If it is not running, the installed README documents `teamclaude server`; start it only at kickoff if the user wants the existing wrapper. The installed `run` parser passes arguments after `--` to Claude Code.

A session-local Agent Teams launch is:

```sh
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 teamclaude run
```

Then paste the terminal lead prompt and explicitly request three Sonnet teammates. Verify the reported model and each teammate's working directory. Do not assume launching TeamClaude itself creates a team. If this installed Claude version lacks team support, use three explicitly assigned independent interactive Sonnet sessions and the same handoff contracts; report the fallback.

For the two independent Opus sessions, use the installed application's model selection and the user's requested version if available. A launch may use `teamclaude run -- <verified Claude CLI arguments>`, but do not invent a version-specific model identifier. Verify the CLI's supported arguments first. Do not silently substitute a different model when the exact requested version matters.

## Coordination between applications

No automatic communication bridge is assumed. The user can paste each prepared prompt into its intended application. CORE can later orchestrate supported sessions if explicitly asked and the tools permit it. Cursor and Claude internal task boards do not replace planning/TASK_BOARD.md.

A worker must have the task ID, its worktree, its owned paths and the baseline commit before writing code. If missing, read the plans and return the missing handoff information; do not edit the shared main checkout. No session recruits additional agents except the explicitly designated terminal team lead after kickoff. Add optional workers only when CORE releases their task IDs.

## Source references

- [Installed TeamClaude README](/Users/ammad/.local/lib/node_modules/@karpeleslab/teamclaude/README.md)
- [Installed TeamClaude launcher](/Users/ammad/.local/lib/node_modules/@karpeleslab/teamclaude/src/index.js)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [Cursor worktrees](https://cursor.com/docs/configuration/worktrees)

The hackathon pack says entries close at 20:10 London time on 13 October 2026 and videos must be at most 90 seconds. The reference PDFs are not authorization to submit or message anyone. Publication/submission remains a separate user action or later explicit instruction.
