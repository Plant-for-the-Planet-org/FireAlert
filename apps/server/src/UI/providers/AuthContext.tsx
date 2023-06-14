import { useContext, createContext, useMemo, useCallback, FC } from "react";
import {
  GetTokenSilentlyOptions,
  useAuth0,
  LogoutOptions,
  User,
  RedirectLoginOptions,
} from "@auth0/auth0-react";
import { useRouter } from "next/router";
import { GetTokenSilentlyVerboseResponse } from "@auth0/auth0-spa-js";
// import { UserProfile } from "src/type";
// import { GlobalContext } from "./GobalContext";

interface AuthContextInterface {
  //   user: UserProfile["data"];
  isLoading: boolean;
  isAuthenticated: boolean;
  getAccessTokenSilently: {
    (
      options: GetTokenSilentlyOptions & { detailedResponse: true }
    ): Promise<GetTokenSilentlyVerboseResponse>;
    (options?: GetTokenSilentlyOptions): Promise<string>;
    (options: GetTokenSilentlyOptions): Promise<
      GetTokenSilentlyVerboseResponse | string
    >;
  };
  logout: (options?: LogoutOptions) => void;
  loginWithRedirect: (options?: RedirectLoginOptions) => Promise<void>;
  auth0User: User;
  auth0Error: Error;
  setRedirect: (redirect: string) => void;
  getRedirect: () => string | null;
  clearRedirect: () => void;
}

const AuthContext = createContext<AuthContextInterface | null>(null);

const redirectKey = "sign_in_redirect";

interface Props {
  children: React.ReactNode;
}

export const AuthProvider: FC<Props> = ({ children }) => {
  const {
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    getAccessTokenSilently,
    logout,
    user,
    error,
  } = useAuth0();
  //   const { setAccessToken } = React.useContext(GlobalContext);
  const router = useRouter();
  //   const [profile, setUser] = useState<UserProfile["data"] | null>(null);
  // const [token, setToken] = useState<string | null>(null);

  // name, email, allowedCountries, roles
  //   const sendProfile = () => {
  //     return new Promise<UserProfile>((res, rej) => {
  //       setTimeout(() => {
  //         const shouldResolve = true;
  //         if (shouldResolve) {
  //           res({
  //             data: {
  //               name: "Ankit Gupta",
  //               email: "ankit@gupta.com",
  //               allCountries: ["DE", "US", "IN"],
  //               roles: ["ROLE_ADMIN", "ROLE_BACKEND"],
  //             },
  //           });
  //         } else {
  //           rej(new Error("Something went wrong"));
  //         }
  //       }, 2000);
  //     });
  //   };

  //   const fetchProfile = useCallback(async () => {
  //     try {
  //       const { data } = await sendProfile();
  //       setUser(data);
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   }, [setUser]);

  //   useEffect(() => {
  //     fetchProfile();
  //   }, [fetchProfile]);

  //   const loadToken = useCallback(async () => {
  //     if (!isLoading) {
  //       if (isAuthenticated) {
  //         const accessToken = await getAccessTokenSilently();
  //         // setAccessToken(accessToken);
  //       }
  //     }
  //   }, [isLoading, isAuthenticated, getAccessTokenSilently]);

  //   useEffect(() => {
  //     loadToken();
  //   }, [loadToken]);

  const setRedirect = useCallback((redirect: string) => {
    window.sessionStorage.setItem(redirectKey, redirect);
  }, []);

  const getRedirect = useCallback(() => {
    return window.sessionStorage.getItem(redirectKey);
  }, []);

  const clearRedirect = useCallback(() => {
    window.sessionStorage.removeItem(redirectKey);
  }, []);

  const value: AuthContextInterface | null = useMemo(
    () => ({
      setRedirect,
      getRedirect,
      clearRedirect,
      isLoading,
      isAuthenticated,
      loginWithRedirect,
      getAccessTokenSilently,
      logout,
      //   user: profile,
      auth0User: user,
      auth0Error: error,
    }),
    [
      setRedirect,
      getRedirect,
      clearRedirect,
      isLoading,
      isAuthenticated,
      loginWithRedirect,
      getAccessTokenSilently,
      logout,
      user,
      error,
      //   profile,
    ]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext must be used with AuthProvider!");
  return context;
};
