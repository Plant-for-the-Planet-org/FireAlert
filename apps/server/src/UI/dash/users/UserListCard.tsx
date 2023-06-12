import { Avatar } from "@mui/material";
import {
  AvatarContainer,
  EmailContainer,
  LeftContainer,
  UserListCardWrapper,
  UserNameIDContainer,
} from "./StyledComponents";
import Text from "src/UI/DesignSystem/Text";

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
      <EmailContainer>
        <Text fontSize="16px">{email}</Text>
      </EmailContainer>
    </UserListCardWrapper>
  );
};

export default UserListCard;
