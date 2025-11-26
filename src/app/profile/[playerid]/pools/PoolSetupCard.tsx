import { Card, CardBody, CardHeader, Row } from "react-bootstrap";
import { PracticePool } from "@/types/database.player";
import { GameMode, getModsEnum } from "osu-web.js";
import CreatePoolButton from "./CreatePoolButton";
import PoolRow from "./PoolRow";
import { mapsDb } from "@/app/api/db/connection";
import { revalidatePath } from "next/cache";

export default async function PoolSetupCard({
   data,
   osuid,
   mode
}: {
   data: PracticePool[];
   osuid: number;
   mode: GameMode;
}) {
   const maplist = await mapsDb[mode]
      .find({ _id: { $in: data.flatMap(pool => pool.maps.map(m => m.id)) } })
      .toArray();
   const pools = data.map(p => {
      const mapinfo = p.maps.map(m => {
         const map = maplist.find(dbbm => dbbm._id === m.id);
         return {
            mods: m.mods,
            map
         };
      });
      return {
         name: p.name,
         maps: mapinfo.sort((a, b) => {
            if (!a.mods)
               if (!b.mods) return 0;
               else return 1;
            else if (!b.mods) return -1;
            return getModsEnum(a.mods) - getModsEnum(b.mods);
         })
      };
   });
   return (
      <Card>
         <CardHeader className="d-flex justify-content-between align-items-center">
            <span>Tournament Practice</span>
            <CreatePoolButton osuid={osuid} mode={mode} />
         </CardHeader>
         <CardBody className="d-flex flex-column gap-3">
            {pools
               .flatMap((pool, i) => [
                  <PoolRow
                     key={pool.name}
                     osuid={osuid}
                     data={pool}
                     mode={mode}
                     revalidate={async () => {
                        "use server";
                        revalidatePath("/profile");
                     }}
                  />,
                  <hr key={i} />
               ])
               .slice(0, -1)}
         </CardBody>
      </Card>
   );
}
