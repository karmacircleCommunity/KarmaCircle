/* eslint-disable react/no-unknown-property */
import { Link } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

// `motion-safe:active:scale-97` is the app-wide press feedback: every
// button dips very slightly under the pointer and springs back on release,
// which is what makes a click feel acknowledged before the network does
// anything. Two caveats it carries:
// - `motion-safe:` so it's absent under `prefers-reduced-motion`.
// - It writes a class-based `transform`, so it is silently overridden on any
//   button also driven by `useMagnetic` (which sets an inline transform —
//   see that hook). Those buttons express press/hover in colour instead.
const PRESS = "motion-safe:active:scale-97";

const variantClasses: Record<string, string> = {
  solid:
    `bg-brand text-white transition-all duration-200 ease-in-out hover:bg-brand-hover ${PRESS} disabled:cursor-not-allowed disabled:bg-brand disabled:text-white disabled:pointer-events-none disabled:opacity-50`,
  outline:
    `rounded-xl border border-heading bg-white transition-all duration-200 ease-in-out hover:border-brand-hover ${PRESS} focus:border-brand-hover active:border-brand-hover disabled:cursor-not-allowed disabled:border-black disabled:bg-heading disabled:text-black disabled:opacity-50`,
};

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> {
  children?: ReactNode;
  variant?: string;
  to?: string;
  isLoading?: boolean;
  cypressfield?: string;
  onClickfunction?: (event: MouseEvent<HTMLButtonElement>) => void;
}

const Button = ({
  children,
  type = "button",
  variant = "solid",
  className = "",
  to = "",
  disabled,
  isLoading = false,
  cypressfield = "",
  onClickfunction,
  ...props
}: ButtonProps) => {
  const classes =
    `btn cursor-pointer ${variantClasses[variant] ?? ""} ${className}`.trim();

  if (to && navigator.onLine === true) {
    return (
      // @ts-expect-error — `...props` carries button-only DOM attributes
      // (e.g. button-specific event handler types) that don't line up
      // with `<Link>`'s anchor-typed props; pre-existing, preserved as-is
      // for a types-only pass.
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      // @ts-expect-error — `isLoading` isn't a real DOM attribute for
      // `<button>`; pre-existing, preserved as-is for a types-only pass.
      isLoading={isLoading}
      className={classes}
      data-cy={cypressfield}
      {...props}
      onClick={onClickfunction}
    >
      {isLoading ? <ClipLoader color="#000000" size={25} /> : children}
    </button>
  );
};

export default Button;
