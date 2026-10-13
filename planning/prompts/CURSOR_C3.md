# C3 — Cursor popup builder

This is a prepared handoff, not a launch instruction. The current user instruction is planning only. Do not start implementation or spawn agents until the user explicitly kicks off the build.

At kickoff you must receive your absolute assigned worktree and baseline SHA. If they are missing, read only and report what is missing. Do not write in the shared main checkout.

Read MASTER_PLAN.md, planning/CONTRACTS.md and planning/TASK_BOARD.md from that worktree. You do not need the original chat. Product: BeforePay, a Chrome checkout guardian for unfamiliar shoe stores; Pip is its animated character. Ramp is inspiration, not an integration.

## Your assignment

Implement mountPopup() against PopupState and RuntimeReply. Provide Check this store, origin label, permissions explanation, reduced-motion preference and error/unsupported states. CORE supplies Chrome actions, actual settings persistence and entrypoint HTML. Optional per-site automatic checking must never appear enabled without granted runtime state; hide unavailable actions. Do not edit manifest/background/build files.

Owned paths: src/popup/**, tests/popup/**. All paths are relative to your assigned worktree. You may additionally update only your own task report under planning/reports/. Do not modify shared config, dependency manifests, another owner's code or the agreed contract. Request changes through CORE. Do not launch additional agents, make real payments, submit the project, publish, or contact anyone.

Deliverable: A clear popup component wired through callbacks, including rejected permission and unsupported page views.

Return a thin usable slice after roughly 15 minutes, then finish the assigned work. Flag a blocker after three minutes. Keep optional improvements behind the working core. Report task ID, baseline SHA, branch/worktree, commit or patch, files changed, exports, exact checks/outcomes, not-tested items and real/synthetic limitations. Follow the ownership/integration process in the master plan.
