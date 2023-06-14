import { useContext, createContext, useMemo } from "react";
import {
  GetTokenSilentlyOptions,
  useAuth0,
  LogoutOptions,
  User,
  RedirectLoginOptions,
} from "@auth0/auth0-react";
import { GetTokenSilentlyVerboseResponse } from "@auth0/auth0-spa-js";
import useLocalStorageState from "../customHooks/use-local-storage";

interface AuthContextInterface {
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
  redirect: string;
  clearRedirect: () => void;
}

const AuthContext = createContext<AuthContextInterface | null>(null);

const redirectKey = "sign_in_redirect";

interface Props {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: Props) => {
  const {
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    getAccessTokenSilently,
    logout,
    user,
    error,
  } = useAuth0();

  const [redirect, setRedirect, clearRedirect] =
    useLocalStorageState<string>(redirectKey);

  const value: AuthContextInterface | null = useMemo(
    () => ({
      setRedirect,
      redirect,
      clearRedirect,
      isLoading,
      isAuthenticated,
      loginWithRedirect,
      getAccessTokenSilently,
      logout,
      auth0User: user,
      auth0Error: error,
    }),
    [
      setRedirect,
      redirect,
      clearRedirect,
      isLoading,
      isAuthenticated,
      loginWithRedirect,
      getAccessTokenSilently,
      logout,
      user,
      error,
    ]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext must be used with AuthProvider!");
  return context;
};
