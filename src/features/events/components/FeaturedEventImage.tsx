const FeaturedEventImage = () => {
  return (
    <div className="relative inline-flex h-full flex-col items-start justify-center gap-3 rounded-2xl border border-black/[0.133] bg-white transition-all duration-300 ease-in-out">
      <div className="absolute top-[10px] left-[10px] rounded-[5px] bg-[#ff5a31] px-[10px] py-[5px] font-outfit text-[15px] font-semibold text-white uppercase">
        Featured
      </div>

      <img
        src="https://devfolio.co/_next/image?url=https%3A%2F%2Fassets.devfolio.co%2Fcontent%2Fd8b04d5b9f8c4412a40fbe8574c9f1db%2Fcd09ca5b-0e7d-4e96-b282-1d22fc0896a2.png&w=1440&q=75"
        alt=""
        className="h-full w-full rounded-2xl object-cover"
      />
    </div>
  );
};

export default FeaturedEventImage;
