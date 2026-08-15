import { CiFilter } from "react-icons/ci";
import { PiCaretLeftBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { Button, Footer, Loading, Navbar } from "@components";
import ClubCard from "@features/clubs/components/ClubCard";
import ComponentHelmet from "@components/seo/ComponentHelmet";
import { UserType } from "@/types/user";
import type { Club } from "../types";

const Clubs = () => {
  // demo 20 array of clubs
  const clubs: Club[] = Array.from({ length: 20 }, () => ({
    _id: "673ac2814c6e89e58af8ca11",
    userType: UserType.Club,
    userName: "tamalcodes",
    name: "God Father Org",
    email: "tamalcodes@gmail.com",
    password: "$2a$10$90vC9McfHXpXpLlzUOFeuulorPR9dIQ2ns37uIP5sX5ehyO5C.Mmm",
    cart: [],
    __v: 0,
  }));

  const navigate = useNavigate();

  return (
    <>
      <ComponentHelmet type="Clubs" />
      <Navbar />

      <div className="mx-12 flex items-center gap-[1.2rem] px-28 py-8 font-outfit">
        <div className="flex h-[62px] w-full grow items-center gap-4 rounded-lg bg-white p-[10px] shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
          <input
            type="text"
            name=""
            id=""
            placeholder="Type to begin search, or use the filters"
            className="grow rounded-[5px] border border-[#00000041] bg-[#f5f7f7] px-4 py-2 font-outfit text-[15px] outline-none"
          />
          <button className="flex w-[15%] items-center justify-center gap-[10px] rounded-[5px] border border-[#00000041] bg-[#f5f7f7] px-4 py-2 text-center font-outfit text-[15px] outline-none">
            Filters <CiFilter className="min-h-[20px] min-w-[20px]" />
          </button>
        </div>

        <Button
          className="flex h-[55px] w-1/5 items-center justify-center rounded-lg border-2 border-[#ff5a317a] bg-[#fba18b55] text-center font-outfit text-[15px] font-semibold whitespace-nowrap text-[#ff5a31f0] outline-none"
          onClickfunction={() => {
            navigate("/dashboard");
          }}
        >
          Your Dashboard <PiCaretLeftBold className="h-5 w-5 rotate-180" />
        </Button>
      </div>

      <div className="mx-12 grid min-h-screen grid-cols-3 grid-rows-3 gap-8 px-28 py-8 max-[1200px]:grid-cols-2 max-[1200px]:grid-rows-3 max-[1200px]:px-12 max-[1200px]:py-8 max-[800px]:mx-0 max-[800px]:grid-cols-1 max-[800px]:grid-rows-4 max-[800px]:px-8 max-[800px]:py-12">
        {!clubs || clubs?.length === 0 ? (
          <Loading />
        ) : (
          clubs?.map((club, id) => <ClubCard club={club} key={id} />)
        )}
      </div>

      <Footer />
    </>
  );
};

export default Clubs;
