import { CiFilter } from "react-icons/ci";
import { PiCaretLeftBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { Button, Footer, Loading, Navbar } from "@components";
import OrganizationCard from "@features/organizations/components/OrganizationCard";
import ComponentHelmet from "@components/ComponentHelmet";
import { UserType } from "@/types/user";
import type { Organization } from "../types";

const Organizations = () => {
  // demo 20 array of organizations
  const organizations: Organization[] = Array.from({ length: 20 }, () => ({
    _id: "673ac2814c6e89e58af8ca11",
    userType: UserType.Organization,
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
      <ComponentHelmet type="Organizations" />
      <Navbar />

      <div className="mx-12 flex items-center gap-[1.2rem] px-28 py-8 font-outfit">
        <div className="flex h-15.5 w-full grow items-center gap-4 rounded-lg bg-white p-2.5 shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
          <input
            type="text"
            name=""
            id=""
            placeholder="Type to begin search, or use the filters"
            className="grow rounded-5px border border-black/25 bg-surface-muted px-4 py-2 font-outfit text-body outline-none"
          />
          <button className="flex w-[15%] items-center justify-center gap-2.5 rounded-5px border border-black/25 bg-surface-muted px-4 py-2 text-center font-outfit text-body outline-none">
            Filters <CiFilter className="min-h-5 min-w-5" />
          </button>
        </div>

        <Button
          className="flex h-13.75 w-1/5 items-center justify-center rounded-lg border-2 border-brand/50 bg-[#fba18b55] text-center font-outfit text-body font-semibold whitespace-nowrap text-brand/95 outline-none"
          onClickfunction={() => {
            navigate("/dashboard");
          }}
        >
          Your Dashboard <PiCaretLeftBold className="size-5 rotate-180" />
        </Button>
      </div>

      <div className="mx-12 grid min-h-screen grid-cols-3 grid-rows-3 gap-8 px-28 py-8 max-[1200px]:grid-cols-2 max-[1200px]:grid-rows-3 max-[1200px]:px-12 max-[1200px]:py-8 max-[800px]:mx-0 max-[800px]:grid-cols-1 max-[800px]:grid-rows-4 max-[800px]:px-8 max-[800px]:py-12">
        {!organizations || organizations?.length === 0 ? (
          <Loading />
        ) : (
          organizations?.map((organization, id) => (
            <OrganizationCard organization={organization} key={id} />
          ))
        )}
      </div>

      <Footer />
    </>
  );
};

export default Organizations;
