import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

function isAppNavigation(req: Request): boolean {
  const accept = req.headers.get("accept") ?? "";
  const secFetchDest = req.headers.get("sec-fetch-dest");
  return (
    secFetchDest === "document" ||
    accept.includes("text/html") ||
    accept.includes("text/x-component")
  );
}

export default clerkMiddleware(
  async (auth, req) => {
    if (isPublicRoute(req)) return;

    if (process.env.NODE_ENV === "development" || process.env.BYPASS_CLERK === "true") {
      return;
    }

    const { userId } = await auth();
    if (userId) return;

    if (isAppNavigation(req)) {
      const signInUrl = new URL("/sign-in", req.url);
      if (req.nextUrl.pathname !== "/") {
        signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
      }
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-in",
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
