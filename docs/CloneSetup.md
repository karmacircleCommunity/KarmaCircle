<!-- TOC -->

- [Getting started](#getting-started)
  - [Forking 🍴](#forking-)
  - [Cloning 🌀](#cloning-)
  - [Next steps 🚀](#next-steps-)

<!-- /TOC -->

# Getting started

## Forking 🍴

- There will be a `Fork` button on the top right corner of the repository. Click on it.
- **Uncheck** the option which says `Copy the main branch only`.
- This is important as we have multiple branches in the repository and `beta` is the development branch.

## Cloning 🌀

- After the fork is done, you will be redirected to your forked repository.
- The next step is to clone the repository to your local storage.
- Open your terminal and enter the following command and hit enter.

```shell
git clone https://github.com/karmacircleCommunity/KarmaCircle.git
```
- This will clone the repository to your local storage and you can start working on it. This is a monorepo — the clone gets you both `apps/web` (frontend) and `apps/api` (backend).

## Next steps 🚀

So now you have the repository in your local storage. The next step is to setup the frontend and backend locally. You can refer to the following links to setup each app.

1. [Setting up frontend locally](/docs/FrontendSetup.md)
2. [Setting up the backend locally](/apps/api/docs/BackendSetup.md)
3. [Setting up the app with docker](/docs/DockerSetup.md)
