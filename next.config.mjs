/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  experimental: {
    scrollRestoration: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "nationwidefd.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "www.acmecorp.com", pathname: "/**" },
      { protocol: "https", hostname: "acmecorp.com", pathname: "/**" },
      { protocol: "https", hostname: "www.zinatexrugs.com", pathname: "/**" },
      { protocol: "https", hostname: "zinatexrugs.com", pathname: "/**" },
      { protocol: "https", hostname: "d28fw8vtnbt3jx.cloudfront.net", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/favicon.png",
        destination: "/placeholder-furniture.svg",
        permanent: false,
      },
      {
        source: "/collections/bed",
        destination: "/collections/bedroom",
        permanent: true,
      },
      {
        source: "/collections/bedroom-furniture",
        destination: "/collections/bedroom",
        permanent: true,
      },
      {
        source: "/admin/promotions",
        destination: "/admin/sales",
        permanent: true,
      },
      {
        source: "/admin/banners",
        destination: "/admin/sales",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
