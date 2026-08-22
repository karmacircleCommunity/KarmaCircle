import { useEffect } from "react";

/**
 * Dev scratch file, not wired into routesConfig.jsx — unreachable
 * through any navigation in the live app. Almost certainly leftover
 * from verifying redirect behavior; see SPEC.md before deleting.
 */
const Test = () => {
  useEffect(() => {
    window.location.href = "https://www.google.com";
  }, []);

  return <div>Test</div>;
};

export default Test;
