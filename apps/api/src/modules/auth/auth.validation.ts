import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
  })
  .passthrough();

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const updatePasswordSchema = z.object({
  email: z.string().email(),
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(5, "Password Length must be greater than 5 characters"),
});

export const checkEmailSchema = z.object({
  email: z.string().email(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type CheckEmailInput = z.infer<typeof checkEmailSchema>;
