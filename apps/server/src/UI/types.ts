import type { NextPage } from "next";

type PageAuth = { protected: boolean; roles: string[] };

export type NextPageWithAuth<P = object, IP = P> = NextPage<P, IP> & {
  auth: PageAuth;
};
