import { useEffect, FC } from "react";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import { useAuth } from "src/provider/AuthContext";
import { useRouter } from "next/router";

const AuthGuard: FC = ({ children }) => {
  const { isLoading, isAuthenticated, user, loginWithRedirect, setRedirect } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      //auth is initialized and there is no user
      if (!isAuthenticated) {
        // remember the page that user tried to access
        if (router.isReady) {
          setRedirect(router.asPath);
          router.push("/login");
        }
      }
    }
  }, [isLoading, router, router.isReady, isAuthenticated, setRedirect]);

  if (isLoading) {
    return <h4>Loading...</h4>;
  }

  if (!isLoading && user && router.isReady) {
    return <>{children}</>;
  }

  return null;
};

export default AuthGuard;