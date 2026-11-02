# Using AI with KarmaCircle

AI coding tools can help contributors understand the repository, find the right code, plan changes, write or update code and documentation, and review likely problems.
They can save time on navigation and repetitive work, but their suggestions can be wrong or out of date.
The person submitting a change remains responsible for understanding the behavior, security, tests, and compatibility of that change.

## Start with the project rules

Before asking a tool to change files, point it to the repository's shared [AGENTS.md](../AGENTS.md) instructions.
That file explains the project's contribution and Git rules, safety boundaries, app-specific guardrails, and expectations for keeping documentation in sync with code.
The root [CLAUDE.md](../CLAUDE.md) adds repository navigation and coding conventions for tools that read it.
Use one shared source of truth for project rules, and do not copy a conflicting rule into a prompt or another instruction file.

## Give the task enough context

A clear request says what needs to change, who uses it, what success looks like, and what should stay out of scope.
Include the issue, affected app or feature, known constraints, and important user states when you know them.
For a visual change, describe the screen, viewport, interaction, and expected appearance.
For an API change, name the request or response behavior and the frontend flow that depends on it.
Ask the tool to inspect the code and project specs before suggesting an implementation.

Use this as a starting point:

```text
Goal:
Expected behavior:
Relevant app or feature:
Acceptance criteria:
Constraints and non-goals:
Important states or edge cases:
Please inspect the relevant project instructions, specs, known issues, and code first.
If a key decision is unclear or multiple implementations could match this request, ask me before choosing.
After the change, update the documentation that describes the behavior and report the checks you actually ran.
```

## Read the guides for the part you are changing

| Work area | Read first |
|---|---|
| Frontend feature | [Frontend spec map](./specs/README.md), the feature spec, and [known issues](./specs/known-issues.md) |
| Backend module | [Backend spec map](../apps/api/docs/specs/README.md), the module spec, and [backend known issues](../apps/api/docs/specs/known-issues.md) |
| Route, request, or response change | [API contract](../apps/api/docs/specs/api-contract.md), then the frontend [API integration guide](./specs/api-integration.md) and affected feature specs |
| Frontend UI | The feature spec and [design system](./specs/design-system/README.md); use the [UI quality checklist](./agentic-readiness-checklist.md#4-ui-quality-checklist) for UI work |
| Authentication or authorization | The relevant frontend auth spec and backend [auth spec](../apps/api/docs/specs/auth.md), plus the guardrails in `AGENTS.md` |
| App setup or test changes | The relevant setup guide and [testing guide](./specs/testing.md) or [backend testing guide](../apps/api/docs/specs/testing.md) |
| Architecture or user flow | The spec maps, [current flow diagrams](./specs/user-flows.md), and the Miro board when the task involves a flow represented there |

The code shows what currently runs.
Tests show which behavior is checked automatically.
Specs describe contracts, known limitations, and decisions that may not be obvious from one file.
The code graph and Miro board help with navigation and flow discovery, but verify important claims against the owning code and relevant tests.
If those sources disagree and the correct behavior is not clear, stop and ask the project owner before making a product decision.

## A practical work loop

1. **Understand the task.** Restate the expected result and identify the app, route, feature, and related code.
2. **Check the local context.** Read the applicable instructions, spec, known issues, and current implementation before editing.
3. **Clarify important gaps.** Ask before choosing between duplicate or retired implementations, changing product behavior, or assuming an API contract.
4. **Make a focused change.** Prefer the smallest complete change that satisfies the stated acceptance criteria and follows existing patterns.
5. **Keep the guides true.** Update the relevant feature or module spec, route/API map, flow diagram, or setup guide in the same change when behavior or structure changes.
6. **Verify the change.** Run the checks that apply to the files touched, following the repository testing guide and user authorization boundaries.
7. **Review the result.** Read the final diff, look for unrelated changes, and check that any claimed behavior has evidence.
8. **Report clearly.** Say what changed, what checks ran, what did not run, and any remaining decision or limitation.

For bug fixes, start by tracing or reproducing the behavior as an end user experiences it when the available test setup allows that.
For frontend work, do not open a local browser or test the UI unless the project owner has authorized it.
When a check was not run, state that plainly instead of implying that it passed.

## Keep work safe

- Never give an AI tool passwords, API secrets, private user data, or production-only information.
- Use the documented local setup and isolated test data; do not point tests at production or a developer's personal database.
- Follow the current branch and Git instructions in `AGENTS.md` and `CONTRIBUTING.md`.
- Do not merge, publish, deploy, change repository settings, or contact people unless the project owner has authorized that action.
- Treat generated files according to their owning instructions; do not hand-edit generated changelogs or other generated output.
- Review code for access control, private data exposure, payment behavior, and input validation, even when a tool says a change is complete.

## Frontend and visual work

Read the design-system guide before changing the frontend UI.
Follow existing components, tokens, responsive patterns, and accessibility conventions.
Think through the applicable loading, empty, error, success, disabled, and permission states before coding.
When visual review is authorized, record the viewport sizes and states inspected, and include useful before-and-after images for review.
The UI quality checklist is for UI tasks; it is separate from the repository's core agentic-readiness score.

## Tests and documentation

Choose checks based on the changed app and the repository's test guide.
The root `pnpm test` runs the API and frontend suites, while app-specific commands can focus on one side.
The suites are designed to use isolated test services and data; do not repoint them at a developer's local database.
Update the relevant documentation in the same change when behavior, route contracts, environment settings, setup steps, or file organization changes.
Do not claim a test passed unless it ran successfully in the current work.

## AI disclosure for community contributions

AI assistance is allowed.
Community contributors must disclose AI assistance in the pull request description and say which parts it helped with, as required by [CONTRIBUTING.md](../CONTRIBUTING.md).
Review and understand all submitted changes before opening the pull request.

## Example requests

### Understand a flow

```text
Explain how an organization profile is loaded and how its follow button works.
Read the frontend and backend specs first, then trace the current route and API code.
Separate current behavior from known gaps, and link me to the files that support the explanation.
```

### Fix a bug

```text
Fix the event detail behavior described in issue #123.
First inspect the events specs and known issues, then trace the user path and reproduce the problem with the documented test setup if possible.
Update the code and its specs together.
Run the relevant checks and report any checks you could not run.
```

### Update an API contract

```text
Add the requested response field to the organization dashboard.
Check the backend route, validation and response code, the API contract, and the dashboard frontend spec before editing.
Update both apps' documentation in the same change and verify the relevant API and frontend checks.
```

### Improve a screen

```text
Improve the organization directory's filter experience for mobile.
Read its feature spec and the design system first.
Keep the existing product behavior unless the acceptance criteria say otherwise.
List the states and viewports you plan to review, then implement and report the checks you actually performed.
Do not open a local browser unless I authorize UI review.
```
