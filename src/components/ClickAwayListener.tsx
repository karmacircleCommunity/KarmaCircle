import { useEffect } from "react";
import type { ReactNode } from "react";

interface ClickAwayListenerProps {
  children?: ReactNode;
  onClickAway: () => void;
}

export default function ClickAwayListener({
  children,
  onClickAway,
}: ClickAwayListenerProps) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!(event.target as Element).closest(".click-away-listener")) {
        onClickAway();
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClickAway]);

  return <div className="click-away-listener">{children}</div>;
}
