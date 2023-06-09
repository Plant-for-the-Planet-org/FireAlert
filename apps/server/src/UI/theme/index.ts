import { Theme } from "@emotion/react";
import { createTheme } from "@mui/material";

interface CustomTheme extends Theme {
  fontSize: {
    text14: "14px";
    text16: "16px";
    text20: "20px";
  };
  fontColor: {
    grey: string;
    main: string;
  };
  borderColor: string;
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#E86F56",
      "100": "#EEE5E5",
    },
  },

  fontSize: {
    text14: "14px",
    text16: "16px",
    text20: "20px",
  },
  fontColor: {
    grey: "#BDBDBD",
    main: "#2F3336",
  },
  borderColor: "#E0E0E0",
});

declare module "@mui/material/styles" {
  interface Theme extends CustomTheme {
    fontSize: {
      text14: "14px";
      text16: "16px";
      text20: "20px";
    };
    fontColor: {
      grey: string;
      main: string;
    };
    borderColor: "#E0E0E0";
  }
  interface ThemeOptions extends CustomTheme {
    fontSize: {
      text14: "14px";
      text16: "16px";
      text20: "20px";
    };
    fontColor: {
      grey: string;
      main: string;
    };
    borderColor: string;
  }
}

export default theme;
