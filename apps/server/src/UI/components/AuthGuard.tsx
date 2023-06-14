import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../providers/AuthContext";

interface Props {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: Props) => {
  const { isLoading, isAuthenticated, setRedirect } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      //auth is initialized and there is no user
      if (!isAuthenticated) {
        // remember the page that user tried to access
        if (router.isReady) {
          setRedirect(router.asPath);
          router.push("/dash/login");
        }
      }
    }
  }, [isLoading, router, router.isReady, isAuthenticated, setRedirect]);

  if (isLoading) {
    return <h4>Loading...</h4>;
  }

  if (!isLoading && router.isReady) {
    return <>{children}</>;
  }

  return null;
};

export default AuthGuard;
