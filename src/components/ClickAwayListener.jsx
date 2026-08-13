import React, { useEffect } from "react";

export default function ClickAwayListener(props) {
  const { children, onClickAway } = props;

  useEffect(() => {
    function handleClick(event) {
      if (!event.target.closest(".click-away-listener")) {
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
