const Loading = () => {
  return (
    <div className="w-screen text-center">
      <div
        className="m-5 inline-block size-16 animate-spin rounded-full border-4 border-brand! border-r-transparent align-middle"
        role="status"
      ></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Loading;
