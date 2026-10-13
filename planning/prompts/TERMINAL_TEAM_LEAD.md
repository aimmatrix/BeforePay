# Terminal team coordinator — prepared launch prompt

Do not start now. The project is in planning-only mode. Use this prompt after the user explicitly kicks off the build and CORE supplies the baseline SHA and assigned checkout/worktrees.

Read MASTER_PLAN.md, planning/CONTRACTS.md and planning/TASK_BOARD.md. Coordinate exactly three Sonnet teammates initially:

- S1 reads planning/prompts/SONNET_S1.md: synthetic fixtures and expected outcomes.
- S2 reads planning/prompts/SONNET_S2.md: independent adversarial tests.
- S3 reads planning/prompts/SONNET_S3.md: installation and demo documentation.

Use Sonnet for each and report the actual models selected. Do not spawn the two Opus sessions or any Cursor workers; those are separate assignments. Do not recruit fourth/fifth teammates unless CORE releases S4/S5. Agent Teams orchestrates teammates; TeamClaude is the existing client wrapper.

Prefer a separate assigned worktree per worker. Verify each working directory before edits. If this installed team feature cannot isolate worktrees, use the explicitly assigned terminal-team worktree and strict disjoint file ownership. In shared mode you alone commit the team worktree. Never change the main checkout or run git switches/resets while teammates are writing.

You coordinate only; do not compete for their implementation files. Deliver each worker's first useful slice and handoff to CORE. All tests report the actual revision and outcomes. No invented results, external publication, submissions, account changes or paid services. If team orchestration fails, report the failure and let CORE use independent sessions with the same prompts.
