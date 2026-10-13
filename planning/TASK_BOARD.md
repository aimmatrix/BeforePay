# Task board

Status vocabulary: HELD → READY → IN_PROGRESS → REVIEW → INTEGRATED → VERIFIED. BLOCKED identifies a specific dependency. Only CORE updates this board. Workers update their own reports. Build kickoff authorized; shared checkout confirmed. Baseline: `3b8da96`. Contract v1 frozen. CORE is implementing; external workers may proceed only within owned paths.

| ID | State | First delivery | Completion evidence |
| --- | --- | --- | --- |
| CORE | IN_PROGRESS | Frozen contract, baseline, Chrome skeleton | Installed-extension end-to-end checks and package |
| RISK | IN_PROGRESS | Pure evaluator + demo evidence adapter | Independent expected outcomes and error cases |
| PIP | IN_PROGRESS | Mountable mascot with all static states | Animation, cleanup, keyboard and reduced-motion demonstration |
| C1 | INTEGRATED | Shoe product → checkout | Scenario switch and simulated purchase, no real data |
| C2 | INTEGRATED | Evidence panel from assessment fixture | Missing checks, source labels, dismiss/rescan |
| C3 | INTEGRATED | Popup presentation from state fixture | Manual scan intent, denied/unsupported states |
| S1 | REVIEW | Canonical synthetic scenarios | Expected outcomes, no real people or payments |
| S2 | IN_PROGRESS | Adversarial cases from contract | Actual run results after integration |
| S3 | REVIEW | Draft demo script and install guide | Commands verified against final artifact |
| C4 | READY / waiting for integration | Accessibility review | Reproducible findings with viewport/key sequence |
| C5 | HELD / optional | Opening/closing slides | Claims match actual implementation |
| S4 | HELD / optional | Performance/dependency checks | Measured numbers, no invented thresholds passed |
| S5 | REVIEW | Provider feasibility note | Primary sources, access constraints and recommended cutoff |

## Handoff template

Task ID:
Status:
Baseline SHA:
Assigned branch and absolute worktree:
Commit SHA or patch path:
Files changed:
Exports / contract version:
Checks run and exact outcomes:
Not tested:
Real / synthetic / unavailable:
Blockers and proposed owner:

## Integration ledger

CORE build pipeline and runtime implemented; eight core unit tests pass. Current bundles still use temporary integration adapters. S5 recommends no external evidence APIs for this sprint. Installed-extension verification pending.
