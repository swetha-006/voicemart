import { NextResponse } from "next/server";


const protectedPrefixes = ["/cart", "/checkout", "/orders", "/profile", "/admin"];


export function middleware(request) {
  const { pathname } = request.nextUrl;
  const requiresAuth = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get("voicemart_token")?.value;
  const role = request.cookies.get("voicemart_role")?.value;
  const exp = request.cookies.get("voicemart_exp")?.value;
  const isExpired = exp ? Number(exp) <= Math.floor(Date.now() / 1000) : true;

  if (!token || isExpired) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("voicemart_token");
    response.cookies.delete("voicemart_role");
    response.cookies.delete("voicemart_exp");
    return response;
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}


export const config = {
  matcher: ["/cart/:path*", "/checkout/:path*", "/orders/:path*", "/profile/:path*", "/admin/:path*"],
};
