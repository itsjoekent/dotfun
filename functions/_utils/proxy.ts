type ProxyConfig = {
  origin: string;
};

export function createProxyHandler(config: ProxyConfig): PagesFunction {
  return async (context) => {
    const url = new URL(context.request.url);

    const proxyUrl = new URL(url.pathname, config.origin);
    proxyUrl.search = url.search;

    const proxyRequest = new Request(proxyUrl.toString(), {
      method: context.request.method,
      headers: context.request.headers,
      body: context.request.body,
      redirect: "manual",
    });

    return await fetch(proxyRequest);
  };
}
