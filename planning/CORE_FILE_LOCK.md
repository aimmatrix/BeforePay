# Core-owned files — integration freeze

CORE is currently fixing and validating src/runtime/**, src/contracts/**, extension/**, scripts/**, package*.json and server.cjs. Other agents must NOT edit these paths, even to fix an integration issue. Report the requested change in your handoff or planning feedback.

A shared-folder edit replaced observation.js and removed tested privacy fixes. CORE is restoring them. Do not overwrite the file with an earlier draft. C1 owns demo/** only; RISK owns src/risk/** and src/evidence/**; PIP owns src/pip/**; test owners own their tests only.

Current contract is v1. canonical demo server is 4173; preview 4174 redirects. CORE owns all integration. Respect this lock until CORE publishes the final package.
