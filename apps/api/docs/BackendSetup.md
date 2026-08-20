# Backend Setup

Follow the below setup to setup the backend locally. We are using `npm` as the
package manager. So make sure you have `node` and `npm` installed in your
system.

**If not installed, please read
[installation guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).**

## Installing dependencies ⏳

- Open your terminal and navigate to the `Milan-Backend` directory.
- Type `npm install` to install all the dependencies.
- Once the installation is done, you can start the backend server in watch mode
  by typing `npm run dev`.
- This should start the backend server on `http://localhost:5000/`.
- Interactive API docs are served at `http://localhost:5000/docs` once the
  server is running.

## Techstack overview 🌀

- We are currently using `ExpressJS v4`, `TypeScript`, and `MongoDB` as the
  backend stack.
- `npm run dev` runs the server in watch mode via `tsx`.
- `npm run build` compiles TypeScript to `dist/`, and `npm start` runs the
  compiled build (used in production, on non-Vercel hosts).
- `npm run typecheck`, `npm run lint`, and `npm test` check types, lint, and
  run the Jest/Supertest test suite, respectively.
- List of all the other dependencies can be found in the `package.json` file.

## Setting up `.env`

We use a `.env` file using the `dotenv` package inside the root of the `server`
directory.

You must create a `.env` file similar to **[.env.example](../.env.example)** file, remember that if you are using your own database the data might vary.

## Setting up Google Client ID and Client Secret for `.env`

To set up the Google Client ID and Client Secret for your application, follow these steps:

1. **Project Creation:**
   - Go to the [Google Developers Console](https://console.developers.google.com/apis/).
   - Create a new project by clicking on the project dropdown.
   
   ![image](https://github.com/MilanCommunity/Milan-Backend/assets/98630752/94601cda-237d-4aed-acbf-171fd3cc3f3f)

2. **Enable API Services:**
   - Click on "Enabled API services" and select your project.
   
![image](https://github.com/MilanCommunity/Milan-Backend/assets/98630752/57258b52-9f02-40e1-92a0-2ffffde8b156)

3. **Create Credentials:**
   - Navigate to the "Credentials" section.
   - Click on "Create credentials" and choose "OAuth client ID."

![image](https://github.com/MilanCommunity/Milan-Backend/assets/98630752/f11f4180-0ea1-46f3-9c4c-f8fd72cc8ee6)

4. **Configure OAuth Client:**
   - Fill out the form:
     - Choose "Web application" as the application type.
     - Provide your support email.
     - You don't need to provide a logo for the OAuth consent screen.

5. **Obtain Client ID and Client Secret:**
   - After completing the configuration, you'll receive your Client ID and Client Secret.

   ![image](https://github.com/MilanCommunity/Milan-Backend/assets/98630752/1ce0705e-ff95-4c9c-9686-806ee08f9351)

6. **Final Steps:**
   - Update your application's `.env` file with the obtained Client ID and Client Secret.

   ```env
   CLIENT_ID="your-client-id"
   CLIENT_SECRET="your-client-secret"



### Setting up `razorpay api key` for `.env`
- Head on to [Razorpay API reference](https://razorpay.com/docs/api) and Sign Up to razor pay remember you don't need to KYC. 
- Login after Signing Up then you will see this interface, you can use the test mode.

<img width="945" alt="image" src="https://github.com/tejaskh3/Milan/assets/98630752/2de85099-8167-4db2-9fc7-9d539c5bcf64">

- Then move to `Account & Settings` there you will get API keys option where you can generate the keys.

<img width="960" alt="image" src="https://github.com/tejaskh3/Milan/assets/98630752/b1feb58c-f71a-4820-b298-40f05d27146e">

- Generate and copy the key and its secret and paste it to `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` respectively and you are done setting up backend.

<img width="359" alt="image" src="https://github.com/tejaskh3/Milan/assets/98630752/5f08bde3-17fa-472d-9587-9524fa737dd5">

## Coding standards 🔐

- Make sure to follow proper latest coding practices.
- Maintain a good readable folder structure
- Incase adding an API, do document it.

<br/>
<br/>

# Next steps 🚀

So now you have the the frontend up and running locally. Now you can start working on the issues. You can follow the below steps to get started with the frontend.

- [Setting up the frontend locally](https://github.com/MilanCommunity/Milan/blob/main/docs/FrontendSetup.md)
