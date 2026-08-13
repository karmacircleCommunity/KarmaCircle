import { ComingSoon, Navbar } from "@components";

const Trending = () => {
  return (
    <>
      <Navbar />
      <div className="shop_parent">
        <div className="shop_comingSoon">
          <ComingSoon launchitem={`Trending section`} />
        </div>
      </div>
    </>
  );
};

export default Trending;
