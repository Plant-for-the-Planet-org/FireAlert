import { AppProps, type AppType } from "next/app";
import { ThemeProvider } from "@mui/material";
import { Auth0Provider } from "@auth0/auth0-react";
import type { NextComponentType, NextPageContext } from "next";

import { api } from "../utils/api";
import "../styles/globals.css";
import theme from "../../src/UI/theme";
import { AuthProvider } from "src/UI/providers/AuthContext";
import { NextPageWithAuth } from "src/UI/types";
import AuthGuard from "src/UI/components/AuthGuard";
import { env } from "src/env.mjs";

type NextComponentWithAuth = NextComponentType<NextPageContext, any, object> &
  Partial<NextPageWithAuth>;

type ExtendedAppProps<P = object> = AppProps<P> & {
  Component: NextComponentWithAuth;
};

const MyApp: AppType = ({ Component, pageProps }: ExtendedAppProps) => {
  const getRedirectURL = () => {
    if (typeof window !== "undefined") {
      return env.NEXT_PUBLIC_WEBAPP_URL + "/dash/login";
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Auth0Provider
        domain={env.NEXT_PUBLIC_AUTH0_DOMAIN}
        clientId={env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
        cacheLocation="localstorage"
        authorizationParams={{
          redirect_uri: getRedirectURL(),
        }}
      >
        <AuthProvider>
          {Component.auth?.protected ? (
            <AuthGuard>
              <Component {...pageProps} />
            </AuthGuard>
          ) : (
            <Component {...pageProps} />
          )}
        </AuthProvider>
      </Auth0Provider>
    </ThemeProvider>
  );
};

export default api.withTRPC(MyApp);
