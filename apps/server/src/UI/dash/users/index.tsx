import Text from "src/UI/DesignSystem/Text";
import { Line, UserListContainer } from "src/UI/dash/users/StyledComponents";
import { GridItem } from "src/UI/dash/users/StyledComponents";
import { UserListWrapper } from "src/UI/dash/users/StyledComponents";
import UserListCard from "src/UI/dash/users/UserListCard";

export enum Devices {
  VIIRS = "VIIRS",
  MODIS = "MODIS",
  GEOSTAT = "GEOSTAT",
}

export interface User {
  displayName: string;
  guid: string;
  email: string;
  joined: Date;
  activeMethods: Devices[];
  lastSeen: Date;
  avatar: string | null;
}

interface UserListProps {
  users: User[];
}

const UserList = ({ users }: UserListProps) => {
  return (
    <UserListContainer>
      <Text fontSize={"24px"} fontWeight={700}>
        Users List
      </Text>

      <UserListWrapper
        container
        justifyContent={{
          xs: "space-around",
          xm: "space-around",
          md: "space-between",
          lg: "space-between",
        }}
      >
        <Line />

        {users.map((user) => {
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
      </UserListWrapper>
    </UserListContainer>
  );
};

export default UserList;
