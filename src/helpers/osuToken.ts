export async function getOsuToken() {
   console.log("Get osu token");
   const url = new URL("https://osu.ppy.sh/oauth/token");
   const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
   };
   const body = `client_id=${process.env.AUTH_OSU_ID}&client_secret=${process.env.AUTH_OSU_SECRET}&grant_type=client_credentials&scope=public`;
   const osuResponse = await fetch(url, {
      method: "POST",
      headers,
      body
      // cache: "no-store" // TODO Investigate if this will be needed in production
   }).then(res => res.json());
   return osuResponse.access_token;
}
