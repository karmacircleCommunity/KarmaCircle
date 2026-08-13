import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

/**
 * Type declarations for the plain-JS shared `Button.jsx` sitting next
 * to this file — out of scope for this pass (used across every
 * feature), but consumed by the now-typed authentication/clubs pages.
 * `disabled` and `onClickfunction` have no destructuring default in the
 * JS, so TS's own JS-inference treats them as required; both are
 * genuinely optional at every real call site (e.g. a `type="submit"`
 * button inside a `<form>` needs neither).
 */
export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children?: ReactNode;
  variant?: string;
  size?: string;
  fontweight?: string;
  to?: string;
  isLoading?: boolean;
  cypressfield?: string;
  onClickfunction?: (event: MouseEvent<HTMLButtonElement>) => void;
}

declare const Button: (props: ButtonProps) => JSX.Element;

export default Button;
