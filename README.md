[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![GitHub release (latest by date)](https://img.shields.io/github/v/release/karmacircleCommunity/KarmaCircle)](https://github.com/karmacircleCommunity/KarmaCircle/releases) ![GitHub repo size](https://img.shields.io/github/repo-size/karmacircleCommunity/KarmaCircle)

# What is KarmaCircle ?

KarmaCircle is a hub to **connect** NGOs, Charities, and the world to **collaborate** and **build** a better tomorrow. Sign up as an organization/user and be a cause for change. Don't forget to drop a star ⭐.

<br/>

<div align="center">

<div align="center">
<a href="https://www.karmacircle.org/"><img alt="Frontend" src="https://img.shields.io/badge/Frontend-07C160?style=for-the-badge&logo=vercel&logoColor=white"></a>
<a href="https://api.karmacircle.org/"><img alt="Backend" src="https://img.shields.io/badge/Backend-07C160?style=for-the-badge&logo=vercel&logoColor=white"></a>
<a href="https://github.com/sponsors/tamalCodes"><img alt="Sponsor Tamal" src="https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white"></a>

</div>

<img alt="KarmaCircle Readme Banner" src="./apps/web/src/assets/pictures/readme/KarmaCircleBanner.png" width="700px"/>

</div>

<br>

## This is a monorepo

This repo holds both apps that make up KarmaCircle:

| App | Path | What it is |
|---|---|---|
| Frontend | [`apps/web`](./apps/web) | `karmacircle-frontend` — React 19 + Vite SPA |
| Backend | [`apps/api`](./apps/api) | `karmacircle-api` — Express + TypeScript + MongoDB API |

They're independently deployed (two separate Vercel projects) but share this repo, CI, and contribution workflow. See [CLAUDE.md](./CLAUDE.md) and [AGENTS.md](./AGENTS.md) for the fuller architecture/agentic-workflow notes, and each app's own `docs/specs/README.md` for its feature/module map.

# Tech Stack 💻

<p>
    <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"></a>
    <a href="https://vitejs.dev/"><img alt="Vite" src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white"></a>
    <a href="https://nodejs.org/it/docs"><img alt="Node.js" src="https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white"></a>
    <a href="https://expressjs.com/"><img alt="Express" src="https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge"></a>
    <a href="https://www.mongodb.com/docs/"><img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white"></a>
    <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"></a>
    <a href="https://tailwindcss.com/"><img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white"></a>
    <a href="https://turborepo.com/"><img alt="Turborepo" src="https://img.shields.io/badge/Turborepo-%23EF4444.svg?style=for-the-badge&logo=turborepo&logoColor=white"></a>
    <a href="https://docs.github.com/en/actions"><img alt="GitHub Actions" src="https://img.shields.io/badge/GitHub%20Actions-%232671E5.svg?style=for-the-badge&logo=github-actions&logoColor=white"></a>
</p>

# Contributing to KarmaCircle 🔐

Remember, Good PR makes you a Good contributor!

We at KarmaCircle work hard to maintain the structure, and [use conventional Pull](https://github.com/karmacircleCommunity/KarmaCircle/blob/main/CONTRIBUTING.md#pull-request-title-format-) request titles and commits. Without a proper template for the PR, not following the guidelines and spam might get the pull request closed, or banned.

## 1. Setting up the project locally

- [Forking + Cloning Guide](/docs/CloneSetup.md)
- [Setting up the Frontend](/docs/FrontendSetup.md)
- [Setting up the Backend](/apps/api/docs/BackendSetup.md)
- [Setting up with docker](/docs/DockerSetup.md)
- [**Full local dev setup (frontend + backend + MongoDB in one go)**](/docs/LocalDevSetup.md) — the fastest path if you just want everything running

## 2. Contributing guidelines & more

- [Contributing Guidelines](/CONTRIBUTING.md) to be followed.
- [Proper API documentation](https://api.karmacircle.org/docs) for developers.

# License 👮

KarmaCircle is Licensed under the <a href="./LICENSE">MIT License</a>. Please go through the License at least once before contributing.

# Support 🙏

**Don't forget to drop a star ⭐.** A heartfelt thank you to those who have contributed to this project. We are really grateful for your contribution. You all are amazing. Opensource for the win 🚀
