const LETTER_STRIKE_ORIGIN = "https://letter-strike.itsjoekent.workers.dev";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/letter-strike")) {
      const proxyUrl = new URL(url.pathname, LETTER_STRIKE_ORIGIN);
      proxyUrl.search = url.search;

      return fetch(
        new Request(proxyUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: "manual",
        }),
      );
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
