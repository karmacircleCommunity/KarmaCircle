import React, { useEffect } from "react";

const Test = () => {
  useEffect(() => {
    window.location.href = "https://www.google.com";
  }, []);

  return <div>Test</div>;
};

export default Test;
