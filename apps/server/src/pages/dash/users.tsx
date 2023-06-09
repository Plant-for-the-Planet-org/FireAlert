import { Avatar, Grid, styled } from "@mui/material";

const UserListCardWrapper = styled("div")({
  margin: 0,
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",

  "&:last-child": {
    borderBottom: "none",
  },
});

const LeftContainer = styled("div")({
  margin: 0,
  padding: 0,
  display: "flex",
  alignItems: "center",
});

const AvatarContainer = styled("div")({
  marginRight: "18px",
});

const UserNameIDContainer = styled("div")({
  margin: 0,
  padding: "5px",
  display: "flex",
  flexDirection: "column",
});

interface TextProps {
  fontSize?: string;
  color?: string;
}

const Line = styled("div")(({ theme }) => ({
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
}));

const GridItem = styled(Grid)(({ theme }) => ({
  borderTop: `1px solid ${theme.borderColor}`,
  "&:nth-child(2)": {
    borderTop: "none",
  },

  "&:nth-child(3)": {
    borderTop: "none",
  },
}));

const Text = styled("p")<TextProps>(({ theme, fontSize, color }) => ({
  fontSize: fontSize || theme.fontSize.text14,
  color: color || theme.fontColor.main,
}));

const UserListWrapper = styled("div")({
  padding: "40px",
});

const Dashboard = () => {
  enum Devices {
    VIIRS = "VIIRS",
    MODIS = "MODIS",
    GEOSTAT = "GEOSTAT",
  }
  interface User {
    displayName: string;
    guid: string;
    email: string;
    joined: Date;
    activeMethods: Devices[];
    lastSeen: Date;
    avatar: string | null;
  }

  const userList: User[] = [
    {
      displayName: "Nathan Court",
      guid: "user_aerf9e8rg9wer98gwer02",
      email: "nathan@court.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.VIIRS, Devices.MODIS, Devices.GEOSTAT],
      lastSeen: new Date(),
      avatar:
        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      displayName: "Nathan Court",
      guid: "user_aerf9e8rg9wer98gwer02",
      email: "nathan@court.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.VIIRS, Devices.MODIS, Devices.GEOSTAT],
      lastSeen: new Date(),
      avatar:
        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      displayName: "Nathan Court",
      guid: "user_aerf9e8rg9wer98gwer02",
      email: "nathan@court.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.VIIRS, Devices.MODIS, Devices.GEOSTAT],
      lastSeen: new Date(),
      avatar:
        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      displayName: "John Doe",
      guid: "user_qewergvaer342rgwrf",
      email: "john@doe.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.VIIRS, Devices.GEOSTAT],
      lastSeen: new Date(),
      avatar:
        "https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      displayName: "Jay Shattey",
      guid: "user_efergergqweqe78qe76r7",
      email: "jay@shetty.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.GEOSTAT],
      lastSeen: new Date(),
      avatar: null,
    },
    {
      displayName: "Bella Smith",
      guid: "user_wergwrwrev348r92348rsd",
      email: "bella@smith.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.VIIRS, Devices.MODIS],
      lastSeen: new Date(),
      avatar:
        "https://images.pexels.com/photos/1499327/pexels-photo-1499327.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      displayName: "Janice",
      guid: "user_wergwerhbjsf898",
      email: "janice@janice.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.MODIS],
      lastSeen: new Date(),
      avatar: null,
    },
    {
      displayName: "Nathan Court",
      guid: "user_aerf9e8rg9wer98gwer02",
      email: "nathan@court.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.VIIRS, Devices.MODIS, Devices.GEOSTAT],
      lastSeen: new Date(),
      avatar:
        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      displayName: "John Doe",
      guid: "user_qewergvaer342rgwrf",
      email: "john@doe.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.VIIRS, Devices.GEOSTAT],
      lastSeen: new Date(),
      avatar:
        "https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
      displayName: "Jay Shattey",
      guid: "user_efergergqweqe78qe76r7",
      email: "jay@shetty.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.GEOSTAT],
      lastSeen: new Date(),
      avatar: null,
    },
    {
      displayName: "Bella Smith",
      guid: "user_wergwrwrev348r92348rsd",
      email: "bella@smith.com",
      joined: new Date("2022-01-21"),
      activeMethods: [Devices.VIIRS, Devices.MODIS],
      lastSeen: new Date(),
      avatar:
        "https://images.pexels.com/photos/1499327/pexels-photo-1499327.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
  ];

  const getInitials = (displayName: string) => {
    const nameArray = displayName.split(" ");
    return nameArray.length > 1
      ? `${nameArray[0].charAt(0).toUpperCase()}${nameArray[1]
          .charAt(0)
          .toUpperCase()}`
      : `${nameArray[0].charAt(0).toUpperCase()}`;
  };

  const UserListCard = ({ displayName, guid, email, avatar }: User) => {
    return (
      <UserListCardWrapper>
        <LeftContainer>
          <AvatarContainer>
            {avatar ? (
              <Avatar src={avatar} />
            ) : (
              <Avatar>{getInitials(displayName)}</Avatar>
            )}
          </AvatarContainer>
          <UserNameIDContainer>
            <Text fontSize="20px">{displayName}</Text>
            <Text color={"#BDBDBD"}>{guid}</Text>
          </UserNameIDContainer>
        </LeftContainer>
        <Text fontSize="16px">{email}</Text>
      </UserListCardWrapper>
    );
  };

  return (
    <UserListWrapper>
      <Grid
        container
        justifyContent={"space-between"}
        style={{ position: "relative" }}
        columnGap={2}
      >
        <Line />
        {userList.map((user) => {
          return (
            <GridItem
              alignItems={"center"}
              item
              md={5}
              lg={5}
              sm={10}
              xs={10}
              key={user.guid}
            >
              <UserListCard {...user} />
            </GridItem>
          );
        })}
      </Grid>
    </UserListWrapper>
  );
};

export default Dashboard;
