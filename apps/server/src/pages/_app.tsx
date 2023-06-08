import { type AppType } from "next/app";
import { ThemeProvider } from "@mui/material";

import { api } from "../utils/api";
import "../styles/globals.css";
import theme from "../../src/UI/theme";

const MyApp: AppType = ({
  Component,
  pageProps,
}) => {
  return (
    <ThemeProvider theme={theme}>
        <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default api.withTRPC(MyApp);
