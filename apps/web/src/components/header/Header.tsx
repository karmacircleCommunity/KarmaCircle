import clsx from "clsx";
import data from "./HeaderData";

interface HeaderProps {
  type?: string;
}

const headerTextDivClasses = clsx(
  "mt-12 flex flex-col items-center justify-center gap-4 max-500px:mt-8 max-500px:gap-8",
);
const header1Classes = clsx(
  "z-3 mt-8 text-center font-mont text-[3.5rem] leading-none font-black text-brand-secondary uppercase max-500px:text-left max-500px:text-[45px] max-500px:leading-10.75",
);
const header2Classes = clsx(
  "z-3 mx-auto mt-4 w-[70%] text-center font-poppins text-lg font-normal tracking-[1.2px] text-brand-secondary max-500px:mt-0 max-500px:w-[95%] max-500px:text-left max-500px:tracking-[1px] max-500px:break-all max-500px:text-black",
);

const Header = ({ type }: HeaderProps) => {
  const headerData = data.find((item) => item.key === type);

  if (!headerData) {
    return (
      <header className="flex flex-col items-center justify-center text-center">
        <div className={headerTextDivClasses}>
          <h1 className={header1Classes}>Default Header</h1>
          <p className={header2Classes}>Default Description</p>
        </div>
      </header>
    );
  }

  const { topheader_large, bottomheader_large, bottomheader_small } =
    headerData.value;

  return (
    <header className="flex flex-col items-center justify-center text-center">
      <div className={headerTextDivClasses}>
        <h1 className={header1Classes}>{topheader_large}</h1>
        {window.innerWidth < 800 ? (
          <p className={header2Classes}>{bottomheader_small}</p>
        ) : (
          <p className={header2Classes}>{bottomheader_large}</p>
        )}
      </div>
    </header>
  );
};

export default Header;
