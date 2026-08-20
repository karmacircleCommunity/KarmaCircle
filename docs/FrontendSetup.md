# Frontend Setup

Follow the below steps to setup the Frontend locally. We are using `npm` as the package manager. So make sure you have `node` and `npm` installed in your system.

**If not installed, please read [installation guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).**
## Installing dependencies ⏳

- Open your terminal and navigate to the `KarmaCircle/apps/web` directory (this repo is a monorepo — the frontend lives at `apps/web`, not the repo root).
- Type `npm install` to install all the dependencies.
- Once the installation is done, you can start the frontend server by typing `npm run dev`.
- This should start the frontend server on `http://localhost:3000/`.

## Techstack overview 🌀

- We are currently using `ReactJS v18` along with `vite v3` as the frontend framework.
- We using `CSS (Bootstrap v5)` for the styling.
- We have also implemented `service workers` which might not run in the development environment but will be used in the production environment. Please clear your cache if you are facing any issues.
- To test service workers in development environment, you can run `npm run build` and then `serve dist` to serve the production build locally.
- Then you can navigate to `http://localhost:5000/` to see the production build running locally with service workers which can be found in `Application tab -> Service workers`  in the dev tools.
- List of all the other dependencies can be found in the `package.json` file.


## Coding standards 🔐

- We are using `ESLint` and `Prettier` for linting and formatting.
- Maintain the same coding standards as the rest of the codebase.
- Follow good naming conventions for the files, variables and functions along with proper documentation (if needed).
- We also use `husky` and `lint-staged` to run the linter and formatter before every commit. Read about this in our [Contributing Guidelines](/CONTRIBUTING.md).
- Maintain a good folder structure, incase you use anu new components or pages make sure you put them in the right folder.
- If you are using any new dependencies, make sure you mention them in the PR.
- If you are using any new Image , compress it using [online tools]("https://www.iloveimg.com/compress-image") and then use it in the project.
- **Remember**, writing readable and clean code while following the coding standards is the best thing for any developer.

## Setting up the `.env` file

We use a `.env` file using the `dotenv` package inside the root of the directory. You must create a `.env` file similar to [.env.example](../apps/web/.env.example) file.

<br/>
<br/>

# Next steps 🚀

So now you have the the frontend up and running locally. Now you can start working on the issues. You can follow the below steps to get started with the frontend.

- [Setting up the backend locally](/apps/api/docs/BackendSetup.md)