import { Auth } from "./login";

const Dashboard = () => {
  return (
    <>
      <h1> Dashboard </h1>
      <Auth />
    </>
  );
};

Dashboard.auth = { protected: true };

export default Dashboard;
