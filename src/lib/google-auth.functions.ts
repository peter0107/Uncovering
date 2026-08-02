import { createServerFn } from "@tanstack/react-start";

export const getGoogleClientId = createServerFn({ method: "GET" }).handler(
  () => ({
    clientId:
      process.env.VITE_GOOGLE_CLIENT_ID?.trim() ??
      process.env.GOOGLE_CLIENT_ID?.trim() ??
      "",
  }),
);
