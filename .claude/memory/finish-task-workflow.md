---
name: finish-task-workflow
description: On finishing any task, sync new memory into the permanent guidelines and remind the operator to run /simplify and /code-review before committing
type: feedback
---

Two things are required at the end of **every** task, not just when asked:

1. **Sync memory → permanent guidelines.** Anything that became memory during the task (facts, feedback, decisions, references) must be folded into the version-controlled guidelines — `CLAUDE.md` (the enforced prompt) and this `.claude/memory/` dir (portable reference/feedback notes) — before the task counts as done. Memory is a scratch layer; `CLAUDE.md`/`.claude/` is the shared source of truth. Update the `.claude/memory/README.md` index when adding a file.

2. **Remind the operator to run `/simplify` and `/code-review` before committing.** After finishing, tell the human to run both for a tighter, more efficient delivery before it goes public (the repo is source-available). This is a reminder to the human — Claude does not run them on its own.

**Why:** the operator wants durable, versioned guidelines instead of knowledge that only lives in per-session memory, and a consistent quality gate before anything is published to the public repo.

**How to apply:** treat both as part of "definition of done" on all future tasks. Enforced in `CLAUDE.md` ("Regras permanentes").
