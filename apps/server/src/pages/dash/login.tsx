import { useAuth0 } from "@auth0/auth0-react";

import { useRouter } from "next/router";
import { useEffect } from "react";
import LoginButton from "src/UI/components/LoginButton";
import LogoutButton from "src/UI/components/LogoutButton";
import { useAuth } from "src/UI/providers/AuthContext";

export const Auth = () => {
  const { isLoading, isAuthenticated, user } = useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user.name}!</span> <LogoutButton />
      </div>
    );
  }

  return <LoginButton />;
};

const Login = () => {
  const {
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    redirect,
    clearRedirect,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (redirect) {
          if (router.isReady) {
            router.push(redirect); // go to page which redirected to login
            clearRedirect();
          }
        } else {
          router.push("/dash"); // go to default protected page
        }
      } else {
        console.log("This part got executed");
        loginWithRedirect({
          redirectUri: `${
            typeof window !== "undefined" ? window.location.origin : ""
          }/dash/login`,
        });
      }
    }
  }, [
    isAuthenticated,
    router,
    redirect,
    clearRedirect,
    isLoading,
    loginWithRedirect,
  ]);

  return (
    <div>
      <h1>Loading...</h1>
    </div>
  );
};

export default Login;
