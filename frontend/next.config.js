const remoteApiOrigin = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const shouldProxyRemoteApi =
  /^https?:\/\//.test(remoteApiOrigin) &&
  !/localhost|127\.0\.0\.1/i.test(remoteApiOrigin);


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!shouldProxyRemoteApi) {
      return [];
    }

    return [
      {
        source: "/api/proxy/:path*",
        destination: `${remoteApiOrigin}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
