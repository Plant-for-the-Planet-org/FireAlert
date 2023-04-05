import styles from "./index.module.css";
import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCookies } from "react-cookie"


import { api } from "../utils/api";
import Sites from "../Components/SiteComponent";

const Home: NextPage = () => {
  const hello = api.example.hello.useQuery({ text: "from tRPC" });
  const { data: sessionData } = useSession();

  const idToken = sessionData?.user?.id_token;

  const [cookie, setCookie] = useCookies(["JWTToken"])
  try {
    setCookie("JWTToken", idToken, {
      path: "/",
      sameSite: true,
    })
  } catch (err) {
    console.log(err)
  }

  return (
    <>
      <Head>
        <title>Fire Alert Next</title>
        <meta name="description" content="Frontend demo for FireAlert T3 stack" />
        <link rel="icon" href="https://play-lh.googleusercontent.com/H1lnAWzD9x9uCyEWfjTz2-Ub1zHLhvSj29P_ZsWpFXKiB92pWAuKSk0wk3OhYarQzvM6=w240-h480-rw" />
      </Head>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.showcaseContainer}>
            <p className={styles.showcaseText}>
              {hello.data ? hello.data.greeting : "Loading tRPC query..."}
            </p>
            <AuthShowcase />
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();

  const { data: secretMessage } = api.example.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined },
  );

  return (
    <div className={styles.authContainer}>
      <p className={styles.showcaseText}>
        {sessionData && <span>Logged in as {sessionData.user.id} {sessionData.user.name} {sessionData.user.email} {sessionData.user.image} {sessionData.expires}</span>}
        {secretMessage && <span> - {secretMessage}</span>}
      </p>
      <Sites />
      <button
        className={styles.loginButton}
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};



