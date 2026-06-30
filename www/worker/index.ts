const LETTER_STRIKE_ORIGIN = "https://letter-strike.itsjoekent.workers.dev";
const GUESS_OFF_ORIGIN = "https://guess-off.itsjoekent.workers.dev";

function proxyTo(origin: string, request: Request, url: URL): Promise<Response> {
  const proxyUrl = new URL(url.pathname, origin);
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/letter-strike")) {
      return proxyTo(LETTER_STRIKE_ORIGIN, request, url);
    }

    if (url.pathname.startsWith("/guess-off")) {
      return proxyTo(GUESS_OFF_ORIGIN, request, url);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
