# Ghost-CLI Agent Guide

## Scope

These instructions apply to the entire repository.

## Project Snapshot

- Ghost-CLI is the command-line tool for installing, configuring, and updating Ghost.
- Primary source lives in `lib/` and `bin/ghost`.
- Built-in platform extensions live in `extensions/` (`mysql`, `nginx`, `systemd`).
- Tests live in `test/unit` and `extensions/**/test`.

## Runtime And Tooling

- Use Node.js `^20.11.1 || ^22.11.0 || ^24.0.0`.
- Use `pnpm`; this repo is configured around `pnpm-lock.yaml` and `package.json` scripts.
- Common validation commands:
  - `pnpm test`
  - `pnpm lint`
  - `pnpm link` followed by `ghost <command>` for manual CLI checks

## Code Conventions

- Follow the existing CommonJS module style and current file structure.
- Keep changes targeted; prefer updating existing commands, tasks, utils, or extensions over introducing new abstractions.
- Match the existing test style with Mocha, Chai, Sinon, Proxyquire, and Nock where applicable.
- Add or update tests for behavior changes, especially command flows, task execution, and extension behavior.

## Product Boundaries

- Keep work aligned with the documented Ghost-CLI goals in `README.md`.
- Prioritize the recommended Ghost production stack and supported local workflows.
- Avoid expanding support for unrelated platforms or broad new configuration surfaces unless explicitly requested.

## Contribution Expectations

- Ensure `pnpm test` passes before finishing substantial code changes. Note that `pnpm test` also triggers linting via `posttest`.
- Prefer small, reviewable changes with clear commit scope.
- Keep commit messages compatible with the repository's conventional commit expectations when preparing commits.

## Docs And Verification

- When changing behavior, cross-check the relevant repository docs first (`README.md`, `.github/CONTRIBUTING.md`, and command-specific docs if provided).
- If a task explicitly asks for external docs or current behavior verification, look them up before making assumptions.
