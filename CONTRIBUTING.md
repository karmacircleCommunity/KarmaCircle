# Contributing to KarmaCircle

Thanks for helping improve KarmaCircle.
This repository contains two independently deployed apps: `apps/web` (React and Vite) and `apps/api` (Express, TypeScript, and MongoDB).
These contribution guidelines apply to both apps.

## Find and claim an issue

1. Browse [open issues](https://github.com/karmacircleCommunity/KarmaCircle/issues?q=is%3Aissue+is%3Aopen) and check for an existing issue before opening another.
2. Choose one issue at a time and read its discussion, expected outcome, relevant project area, and labels.
3. Comment that you would like to work on it, or use the issue form's willingness checkbox.
4. Wait for a maintainer to confirm assignment before starting work or opening a pull request.
5. If the issue is unclear or has no expected outcome, ask for clarification in the issue before coding.

For Winter of Code Social (WOCS), contributors should say they are participating when claiming an issue.
Maintainers assign a difficulty level and keep issue status current.
Please do not open duplicate issues or pull requests made only to collect points.

## Set up the project

### Requirements

- Node.js 20.19+ or 22.12+, matching the frontend tooling's supported versions.
- pnpm 11.22.0, as declared by the root `package.json`.
- Docker Desktop, OrbStack, or another Docker-compatible runtime if you want to run the complete local stack with MongoDB.

### Install and configure

Install the pinned pnpm version and workspace dependencies from the repository root:

```bash
npm install --global pnpm@11.22.0
pnpm install --frozen-lockfile
```

The workspace explicitly allows install scripts for `esbuild` and `mongodb-memory-server`, which the build and isolated API tests need.
It blocks the optional `@scarf/scarf` install script.

Copy the relevant `.env.example` files and follow the [full local setup guide](./docs/LocalDevSetup.md) to run the frontend, API, and local MongoDB.
The frontend and backend setup guides are also available for [frontend-only work](./docs/FrontendSetup.md) and [backend-only work](./apps/api/docs/BackendSetup.md).
Never commit `.env` files, credentials, or other secrets.

## Project conventions

- Keep changes focused on the assigned issue and explain user-visible behavior in the pull request.
- Follow the existing code patterns and formatting in the app you change.
- Backend changes use TypeScript, ESLint, and Prettier.
- Frontend changes use the existing React and Vite patterns and TypeScript checks where applicable.
- Use conventional commit and pull request titles in lowercase, formatted as `type(scope): subject`.
- Supported types are `feat`, `fix`, `docs`, `style`, `refactor`, `test`, and `chore`.
- Do not rely on a pre-commit hook to run linting or formatting; the current pre-commit hook does not run `lint-staged`.

## AI-assisted contributions

AI tools are allowed.
If you use AI assistance, disclose it in the pull request description and say which parts it helped with.
Review and understand all submitted changes, and remain responsible for their correctness, tests, security, and license compatibility.
Do not provide AI tools with credentials, private user data, or other confidential project information.

## Checks

Run checks that cover the app you changed before opening a pull request.

```bash
pnpm test
pnpm lint
pnpm type-check
pnpm build
```

`pnpm test` runs the API Jest suite and the frontend Playwright end-to-end suite.
`pnpm lint` runs ESLint for both apps.
`pnpm type-check` checks TypeScript in both apps.
These commands provide the clean-checkout smoke procedure and match the pull request CI gates.
The Playwright suite starts its own isolated test services.
See the [testing guide](./docs/specs/testing.md) for browser setup and coverage details.
The pull request CI workflow runs the same suites, lint, type checks, and app builds.
Do not point tests at your local development database or send real email.
If a check fails, include the failure and reason in your pull request instead of claiming it passed.

## Pull requests

- Open a pull request only after a maintainer has assigned you the issue.
- Link the issue with `Closes #123` when the pull request resolves it.
- Describe what changed, why it changed, and how you checked it.
- Disclose any AI assistance in the pull request description and identify the parts it helped with.
- Include screenshots for visual changes when useful.
- Keep the pull request focused and respond to review comments respectfully.
- Use a lowercase conventional title such as `feat(events): add event filtering`.
- Confirm required checks pass before asking for review.

### WOCS labels

For every WOCS-eligible pull request, maintainers must apply the exact `wocs` label and exactly one difficulty label: `level 1`, `level 2`, or `level 3`.
Apply the labels before merging, since the WOCS tracker uses them for points.
Use the same difficulty level on the issue so contributors can see the scope before claiming it.
The difficulty level is assigned by a project admin or mentor.

## Issues

Issue templates help collect the details maintainers need to plan work.
Each contribution issue should have a descriptive title, a focused task, acceptance criteria, an expected outcome, the relevant app or files when known, and a maintainer-assigned difficulty level.
For larger or user-facing work, include affected user types, supported platforms, constraints, non-goals, and the important UI states.
Split work that cannot be reviewed as one focused change into linked issues before assigning it.
Maintainers should update, reassign, or close issues when availability or scope changes.

## License

By contributing, you agree that your contributions are provided under the repository's [MIT License](./LICENSE).
