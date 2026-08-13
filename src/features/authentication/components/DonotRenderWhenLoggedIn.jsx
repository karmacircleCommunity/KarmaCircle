import { selectIsLoggedIn } from "@app/store/slices/userSlice.js";
import Cookies from "js-cookie";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const DonotRenderWhenLoggedIn = (Component) => {
  const WrappedComponent = (props) => {
    const token = Cookies.get("Token");
    const isLoggedIn = useSelector(selectIsLoggedIn);

    if (token && isLoggedIn) {
      return <Navigate to={`/`} />;
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `WithUserLoggedInRoute(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
};

export default DonotRenderWhenLoggedIn;
