/* eslint-disable react/no-unknown-property */
import { Link } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import styles from "./Button.module.css";

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

const Button = ({
  children,
  type = "button",
  variant = "solid",
  className = "",
  size = "",
  fontweight = "",
  to = "",
  disabled,
  isLoading = false,
  cypressfield = "",
  onClickfunction,
  ...props
}: ButtonProps) => {
  const classes = `btn ${styles.btn} ${className}  ${styles[variant]} ${
    size ? styles[size] : ""
  } ${fontweight ? styles[fontweight] : ""}`;

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
