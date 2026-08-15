import { useEffect, useState } from "react";
import { IoIosArrowUp } from "react-icons/io";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  const goToBtn = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
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
          className="fixed right-[30px] bottom-[30px] z-999 flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] bg-[#ff5b31] text-black transition-all duration-500 ease-in-out max-[500px]:right-6 max-[500px]:bottom-6 max-[500px]:h-8 max-[500px]:w-8"
          onClick={goToBtn}
        >
          <IoIosArrowUp className="font-poppins text-[1.8rem] max-[500px]:text-[1.2rem]" />
        </div>
      )}
    </div>
  );
};

export default BackToTop;
