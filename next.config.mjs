/** @type {import('next').NextConfig} */
const nextConfig = {
   images: {
      remotePatterns: [
         {
            protocol: "https",
            hostname: "a.ppy.sh",
            pathname: "**"
         },
         {
            protocol: "https",
            hostname: "s.ppy.sh",
            pathname: "/a/*"
         }
      ]
   }
};

export default nextConfig;
