import { type AppType } from "next/app";
import { ThemeProvider } from "@mui/material";
import { Auth0Provider } from "@auth0/auth0-react";

import { api } from "../utils/api";
import "../styles/globals.css";
import theme from "../../src/UI/theme";

const MyApp: AppType = ({ Component, pageProps }) => {
  const getRedirectURL = () => {
    if (typeof window !== "undefined") {
      return window.location.origin + "/dash/users";
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Auth0Provider
        domain={process.env.AUTH0_DOMAIN!}
        clientId={process.env.NEXT_AUTH0_CLIENT_ID!}
        cacheLocation="localstorage"
        authorizationParams={{
          redirect_uri: getRedirectURL(),
        }}
      >
        <Component {...pageProps} />
      </Auth0Provider>
    </ThemeProvider>
  );
};

export default api.withTRPC(MyApp);
