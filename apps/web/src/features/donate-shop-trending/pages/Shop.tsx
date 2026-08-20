import { ComingSoon, Navbar } from "@components";

const Shop = () => {
  return (
    <>
      <Navbar />
      <div className="shop_parent">
        <div className="shop_comingSoon">
          <ComingSoon launchitem={`shop's page.`} />
        </div>
      </div>
    </>
  );
};

export default Shop;
