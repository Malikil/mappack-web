/** @type {import('next').NextConfig} */
const nextConfig = {
   images: {
      remotePatterns: [
         {
            protocol: "https",
            hostname: "a.ppy.sh",
            pathname: "**"
         }
      ]
   }
};

export default nextConfig;
