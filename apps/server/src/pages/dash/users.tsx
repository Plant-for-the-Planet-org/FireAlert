import UserList, { Devices, User } from "src/UI/dash/users";
import { Auth } from "./login";

const userList: User[] = [
  {
    displayName: "Nathan Court",
    guid: "user_aerf9e8er02",
    email: "nathan@court.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.VIIRS, Devices.MODIS, Devices.GEOSTAT],
    lastSeen: new Date(),
    avatar:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    displayName: "John Doe",
    guid: "user_qewerefrg2rgwrf",
    email: "john@doe.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.VIIRS, Devices.GEOSTAT],
    lastSeen: new Date(),
    avatar:
      "https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    displayName: "Jay Shattey",
    guid: "user_eferewfwefqe76r7",
    email: "jay@shetty.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.GEOSTAT],
    lastSeen: new Date(),
    avatar: null,
  },
  {
    displayName: "Bella Smith",
    guid: "user_wewefr2348rsd",
    email: "bella@smith.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.VIIRS, Devices.MODIS],
    lastSeen: new Date(),
    avatar:
      "https://images.pexels.com/photos/1499327/pexels-photo-1499327.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    displayName: "Janice",
    guid: "user_wergbjsf898",
    email: "janice@janice.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.MODIS],
    lastSeen: new Date(),
    avatar: null,
  },
  {
    displayName: "Nathan Court",
    guid: "user_aer8gwer02",
    email: "nathan@court.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.VIIRS, Devices.MODIS, Devices.GEOSTAT],
    lastSeen: new Date(),
    avatar:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    displayName: "John Doe",
    guid: "user_qewer3wef42rgwrf",
    email: "john@doe.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.VIIRS, Devices.GEOSTAT],
    lastSeen: new Date(),
    avatar:
      "https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    displayName: "Jay Shattey",
    guid: "user_efer7wewqe76r7",
    email: "jay@shetty.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.GEOSTAT],
    lastSeen: new Date(),
    avatar: null,
  },
  {
    displayName: "Bella Smith",
    guid: "user_we8r92348rsd",
    email: "bella@smith.com",
    joined: new Date("2022-01-21"),
    activeMethods: [Devices.VIIRS, Devices.MODIS],
    lastSeen: new Date(),
    avatar:
      "https://images.pexels.com/photos/1499327/pexels-photo-1499327.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
];

const Dashboard = () => {
  return (
    <>
      <Auth />
      <UserList users={userList} />
    </>
  );
};

export default Dashboard;
