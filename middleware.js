const protectedPaths = [
  /^\/panel\.html$/,
  /^\/_pliki-0xyqdz4t(?:\/|$)/
];

function isProtectedPath(pathname) {
  return protectedPaths.some((pattern) => pattern.test(pathname));
}

function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Sklep za Stodola Panel"',
      "Cache-Control": "no-store"
    }
  });
}

export function middleware(request) {
  const url = new URL(request.url);
  const { pathname } = url;
  const host = request.headers.get("host") || "";

  if (host === "brunimat.pl" || host === "www.brunimat.pl") {
    url.hostname = "www.sklepzastodola.pl";
    return Response.redirect(url, 301);
  }

  if (!isProtectedPath(pathname)) {
    return;
  }

  const user = process.env.PANEL_BASIC_USER;
  const password = process.env.PANEL_BASIC_PASSWORD || process.env.PANEL_PASSWORD;

  if (!user || !password) {
    return unauthorized();
  }

  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return unauthorized();
  }

  const decoded = atob(encoded);
  const separator = decoded.indexOf(":");
  const providedUser = decoded.slice(0, separator);
  const providedPassword = decoded.slice(separator + 1);

  if (providedUser !== user || providedPassword !== password) {
    return unauthorized();
  }
}

export const config = {
  matcher: ["/:path*"]
};
