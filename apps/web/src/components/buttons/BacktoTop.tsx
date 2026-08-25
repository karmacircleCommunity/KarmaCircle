import { useEffect, useState } from "react";
import { IoIosArrowUp } from "react-icons/io";
import { useLenis } from "lenis/react";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  // SmoothScroll.tsx mounts the root Lenis instance app-wide; useLenis()
  // reaches it from anywhere without needing to sit inside that provider.
  // Undefined under prefers-reduced-motion (SmoothScroll skips Lenis
  // entirely there) — falls back to native smooth scroll in that case.
  const lenis = useLenis();

  const goToBtn = () => {
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    return () => window.removeEventListener("scroll", listenToScroll);
  };

  const listenToScroll = () => {
    const heightToHidden = 250;
    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;
    if (winScroll > heightToHidden) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const debounce = <T extends (...args: never[]) => void>(
    callback: T,
    delay: number,
  ) => {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
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
    <div className="flex items-center justify-center">
      {isVisible && (
        <div
          className="fixed right-7.5 bottom-7.5 z-999 flex size-10 cursor-pointer items-center justify-center rounded-10px bg-brand text-black transition-all duration-500 ease-in-out max-500px:right-6 max-500px:bottom-6 max-500px:size-8"
          onClick={goToBtn}
        >
          <IoIosArrowUp className="font-poppins text-[1.8rem] max-500px:text-[1.2rem]" />
        </div>
      )}
    </div>
  );
};

export default BackToTop;
