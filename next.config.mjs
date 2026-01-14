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
         },
         {
            protocol: "https",
            hostname: "osu.ppy.sh",
            pathname: "/images/layout/*"
         }
      ]
   }
};

export default nextConfig;
