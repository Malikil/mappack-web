"use server";

import { submitPve } from "@/app/profile/pve/actions";

export default async function adminPve(formData) {
   const id = parseInt(formData.get("player")) || 3208718;
   const history = formData.get("history").split("\n");
   const matchesData = {
      results: {
         [id]: history.map(line => {
            const [map, other] = line.split("+");
            const [mod, score] = other.split(" ");
            return {
               map: parseInt(map),
               mod: mod.toLowerCase(),
               score: parseInt(score)
            };
         })
      },
      mp: Date.now()
   };
   return submitPve(null, matchesData);
}
