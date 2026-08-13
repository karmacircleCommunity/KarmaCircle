import React, { useEffect, useState } from "react";
import { IoIosArrowUp } from "react-icons/io";
import "./BackToTop.scss";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  const goToBtn = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    return () => window.removeEventListener("scroll", listenToScroll);
  };

  const listenToScroll = () => {
    let heightToHidden = 250;
    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;
    if (winScroll > heightToHidden) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const debounce = (callback, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        callback(...args);
      }, delay);
    };
  };

  const debouncedFilter = debounce(listenToScroll, 300);

  useEffect(() => {
    window.addEventListener("scroll", debouncedFilter);
    return () => window.removeEventListener("scroll", debouncedFilter);
  }, []);

  return (
    <div className="wrapper">
      {isVisible && (
        <div className="top-btn" onClick={goToBtn}>
          <IoIosArrowUp className="icon" />
        </div>
      )}
    </div>
  );
};

export default BackToTop;
