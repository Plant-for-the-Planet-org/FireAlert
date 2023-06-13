import { Grid, styled } from "@mui/material";

export const UserListCardWrapper = styled("div")({
  margin: 0,
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
});

export const LeftContainer = styled("div")({
  margin: 0,
  padding: 0,
  display: "flex",
  alignItems: "center",
});

export const AvatarContainer = styled("div")({
  marginRight: "18px",
});

export const UserNameIDContainer = styled("div")({
  margin: 0,
  display: "flex",
  flexDirection: "column",
});

export const EmailContainer = styled("div")({
  margin: "10px 0 10px 58px",
});

export const UserListWrapper = styled(Grid)({
  position: "relative",
});

export const UserListContainer = styled("div")({
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  rowGap: "20px",
});

export const Line = styled("div")(({ theme }) => ({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "50%",
  width: "1px",
  background: theme.borderColor,
  content: '""',
  transform: "translateX(-50%)",
  transformOrigin: "top center",
  height: "inherit",
  [theme.breakpoints.down("md")]: {
    display: "none",
  },
}));

export const GridItem = styled(Grid)(({ theme }) => ({
  borderTop: `1px solid ${theme.borderColor}`,

  "&:nth-of-type(-n + 3)": {
    borderTop: "none",
  },

  [theme.breakpoints.down("md")]: {
    "&:nth-of-type(2)": {
      borderTop: "none",
    },
    "&:nth-of-type(3)": {
      borderTop: `1px solid ${theme.borderColor}`,
    },
  },
}));
