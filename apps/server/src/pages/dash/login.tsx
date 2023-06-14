import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@mui/material";

export const Auth = () => {
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout } =
    useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user.name}!</span>{" "}
        <Button variant="contained" onClick={() => logout()}>
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Button variant="contained" onClick={() => loginWithRedirect()}>
      Login
    </Button>
  );
};

const Login = () => {
  return <Auth />;
};

export default Login;
