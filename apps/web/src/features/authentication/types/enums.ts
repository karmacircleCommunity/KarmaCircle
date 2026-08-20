/**
 * Which live form is submitting. Passed into `useAuth(authType)`
 * (`hooks/useAuth.js`) to pick `LoginUser` vs `RegisterUser`.
 */
export enum AuthType {
  SignIn = "signin",
  SignUp = "signup",
}
