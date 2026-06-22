import { createProxyHandler } from "../_utils/proxy";

export const onRequest = createProxyHandler({
  origin: "https://letter-strike.itsjoekent.workers.dev",
});
