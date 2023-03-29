/**
 * This is the client-side entrypoint for your tRPC API. It is used to create the `api` object which
 * contains the Next.js App-wrapper, as well as your type-safe React Query hooks.
 *
 * We also create a few inference helpers for input and output types.
 */
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";



import { type AppRouter } from "~/server/api/root";


//TODO: need to get this from cookies! (Cookies -> JWTToken)
const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkxySkw0NkQ4WGhSVlgzdWFkTDBIZiJ9.eyJnaXZlbl9uYW1lIjoiQWFzaGlzaCIsImZhbWlseV9uYW1lIjoiRGhha2FsIiwibmlja25hbWUiOiJhYXNoaXNoLmRoYWthbCIsIm5hbWUiOiJBYXNoaXNoIERoYWthbCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BR05teXhaWmVXSzFNRjNIMHFqVWJESjh4QXlLNGNoQmttTndJN0hDRHRITj1zOTYtYyIsImxvY2FsZSI6ImVuIiwidXBkYXRlZF9hdCI6IjIwMjMtMDMtMjlUMDc6NDk6MDQuNDA0WiIsImVtYWlsIjoiYWFzaGlzaC5kaGFrYWxAcGxhbnQtZm9yLXRoZS1wbGFuZXQub3JnIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMucGxhbnQtZm9yLXRoZS1wbGFuZXQub3JnLyIsImF1ZCI6IkRSVTFsbWFoVVBlc3E3eGVmbjRNUW9QMUhiNWk2a05EIiwiaWF0IjoxNjgwMDc3MTExLCJleHAiOjE2ODAxMTMxMTEsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTA4MTgwOTg5NjU3MjY1NjI4Nzk3Iiwic2lkIjoiZ0RRMFFvblR0MGFoX0NZdzhhaUZjRDFlWllYak45bE8ifQ.TMxgTVTFZDuT3hx9K1SF8-A_7w7xFl9RQLhtit3E9vnvle2G6TduzEOqvy-Yq6AkfIlzRPNAuEgvOSCi0b1QfbmxlJxXRcNYuxfO6Rt6L0uFDAvhuu2-d-j0SJ9sqxOEUFY34sHgP4uwfY9ta5dcGzNlmc035b1wk4SzJvjKz2oPRgQHAmDWZVTFg5dMqIrnHkGbgAfwt7B7-YxzKGFOifAIf5KJD0YgF_9ukluZ7XX13N8qqUSbsFOwIc3f-sfsyBTc7YmRh8G5EOYZkLqoZ42Ki9Sizo7CIDvo9tBEOyLQxnlJkCh1WhHvuuG7zi-ycyzzqKtrOApWsua2W2OKYA"
const bearerToken = 'Bearer ' + token;


const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

/** A set of type-safe react-query hooks for your tRPC API. */
export const api = createTRPCNext<AppRouter>({
  config({ctx}) {

    // const session = getSe
    // I can use context here to get
    //ctx.req
    //ctx.res

    return {
      /**
       * Transformer used for data de-serialization from the server.
       *
       * @see https://trpc.io/docs/data-transformers
       */
      transformer: superjson,

      /**
       * Links used to determine request flow from client to server.
       *
       * @see https://trpc.io/docs/links
       */
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers: () => {
            return {
              authorization: bearerToken,
            }
          }

        }),
      ],
    };
  },
  /**
   * Whether tRPC should await queries when server rendering pages.
   *
   * @see https://trpc.io/docs/nextjs#ssr-boolean-default-false
   */
  ssr: false,
});

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
