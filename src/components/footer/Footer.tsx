import { footerLinks } from "./footerLinksConfig";
import { FaGithub, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { Link } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import brand from "@assets/pictures/Navbar/MilanNavBrand.svg";

const Footer = () => {
  const icons: Record<string, typeof FaLinkedinIn> = {
    FaLinkedinIn: FaLinkedinIn,
    FaXTwitter: FaXTwitter,
    FaGithub: FaGithub,
  };

  return (
    <>
      <footer className="flex max-w-[100vw] items-start justify-between bg-[#1b1b1b] p-28 max-lg:flex-col max-lg:items-center max-lg:gap-12 max-lg:p-12 max-lg:px-4 max-[500px]:gap-8">
        <div className="flex items-start gap-20 max-lg:gap-12 max-[500px]:flex-col max-[500px]:gap-12">
          <div className="-mt-2">
            <img src={brand} alt="" />
          </div>

          <div className="flex gap-20">
            <div className="flex flex-col">
              <h1 className="mb-6 font-poppins text-[17px] text-white/85">
                QUICK STARTS
              </h1>

              {footerLinks?.quickStarts?.map((item, index) => {
                return (
                  <Link
                    key={index}
                    to={item?.path}
                    className="mb-[5px] font-poppins text-[15px] text-white/55 no-underline hover:text-white/85"
                  >
                    {item?.name}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col">
              <h1 className="mb-6 font-poppins text-[17px] text-white/85">
                RESOURCES
              </h1>
              {footerLinks?.resources?.map((item, index) => {
                return item?.path.startsWith("http") ? (
                  <a
                    key={index}
                    href={item?.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-[5px] font-poppins text-[15px] text-white/55 no-underline hover:text-white/85"
                  >
                    {item?.name}
                  </a>
                ) : (
                  <Link
                    key={index}
                    to={item?.path}
                    className="mb-[5px] font-poppins text-[15px] text-white/55 no-underline hover:text-white/85"
                  >
                    {item?.name}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col max-[500px]:hidden">
              <h1 className="mb-6 font-poppins text-[17px] text-white/85">
                POLICIES
              </h1>
              {footerLinks?.policies?.map((item, index) => {
                return (
                  <Link
                    key={index}
                    to={item?.path}
                    target="_blank"
                    className="mb-[5px] font-poppins text-[15px] text-white/55 no-underline hover:text-white/85"
                  >
                    {item?.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden w-full max-[500px]:flex max-[500px]:flex-wrap max-[500px]:justify-center max-[500px]:gap-4">
            {footerLinks?.policies?.map((item, index) => {
              return (
                <Link
                  key={index}
                  to={item?.path}
                  target="_blank"
                  className="font-poppins text-[15px] text-white/55 no-underline hover:text-white/85"
                >
                  {item?.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="z-90 flex gap-4">
          {footerLinks?.social?.map((item, index) => {
            const IconComponent = icons[item.icon ?? ""];
            return (
              <a
                key={index}
                href={item?.path}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconComponent className="h-[1.4rem] w-[1.4rem] cursor-pointer text-white! hover:text-brand" />
              </a>
            );
          })}
        </div>
      </footer>
    </>
  );
};

export default Footer;
