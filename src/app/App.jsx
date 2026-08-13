import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { BacktoTop } from "@components";
import "@styles/App.css";
import "@styles/Globals.scss";
import routesConfig from "@app/routes/routesConfig.jsx";

const App = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="app">
          <ToastContainer />
          <Suspense fallback={"Loading . . ."}>
            <Router>
              <Routes>
                {routesConfig.map((route, index) => (
                  <Route
                    key={index}
                    exact
                    path={route?.path}
                    element={route?.element}
                  />
                ))}
              </Routes>
            </Router>
          </Suspense>
          <BacktoTop />
        </div>
      </LocalizationProvider>
    </QueryClientProvider>
  );
};

export default App;
