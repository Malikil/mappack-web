"use client";

import { scoreFromResult, predictOutcome } from "@/helpers/rating-range";
import { DbBeatmap } from "@/types/database.beatmap";
import { PracticePool } from "@/types/database.team";
import { Rating } from "@/types/rating";
import { buildUrl, GameMode, getModsEnum } from "osu-web.js";
import { Table } from "react-bootstrap";
import { stdev } from "@/mathplus";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

export default function StatsTable({
   players,
   pool,
   maplist,
   targetRating,
   mode,
   teamSize
}: {
   players: { id: number; osuname: string }[];
   pool: PracticePool;
   maplist: DbBeatmap[];
   targetRating: Rating;
   mode: GameMode;
   teamSize: number;
}) {
   const [sortCol, setSortCol] = useState([0, 1]);
   const [tableData, setTableData] = useState(
      [] as {
         sort: string | number;
         display: string | ReactNode;
         meta?: { setid: number; id: number };
      }[][]
   );

   useEffect(() => {
      setTableData(
         pool.maps.map(map => {
            const dbmap = maplist.find(dbm => dbm._id === map.id);
            const modMult = map.mods?.reduce((mult, mod) => mult * (dbmap.mods[mod] || 1), 1) || 1;
            const target = scoreFromResult(predictOutcome(targetRating, dbmap.rating), mode, {
               mods: map.mods || [],
               map: dbmap.mods,
               player: {}
            });
            const scoresWithAvg = Object.keys(map.scores)
               .map(pid => {
                  const player = parseInt(pid);
                  const sum = map.scores[player].reduce((p, c) => p + c);
                  return {
                     player,
                     scores: map.scores[player],
                     avg: sum / map.scores[player].length
                  };
               })
               .filter(s => s.avg)
               .sort((a, b) => b.avg - a.avg)
               .slice(0, teamSize);
            const allScores = scoresWithAvg.flatMap(s => s.scores);
            const combinedSd = stdev(target, ...allScores);
            const { wsum, wcount } = allScores
               .sort((a, b) => b - a)
               .reduce(
                  (agg, score, i) => {
                     agg.sum += score;
                     const weight = Math.sqrt(i + 1);
                     agg.wsum += score / weight;
                     agg.wcount += 1 / weight;
                     return agg;
                  },
                  { sum: 0, wsum: 0, wcount: 0 }
               );
            const wavg = wsum / wcount;
            return [
               {
                  sort: map.mods ? getModsEnum(map.mods, true) : 1 / 0,
                  display: map.mods ? map.mods.join("") || "NM" : "FM",
                  meta: { setid: dbmap.setid, id: dbmap._id }
               },
               {
                  sort: `${dbmap.artist} - ${dbmap.title} [${dbmap.version}]`,
                  display: (
                     <Link href={`/maps/${mode}/${dbmap.setid}`} className="text-reset text-decoration-none">
                        {dbmap.artist} - {dbmap.title}
                        <br />
                        {dbmap.version}
                     </Link>
                  )
               },
               { display: (dbmap.rating.rating * modMult).toFixed(), sort: dbmap.rating.rating * modMult },
               ...players.map(p => {
                  const sum = map.scores[p.id]?.reduce((s, c) => s + c);
                  return {
                     display: Math.round(sum / map.scores[p.id]?.length).toLocaleString(),
                     sort: Math.round(sum / map.scores[p.id]?.length) || 1 / 0
                  };
               }),
               {
                  display: ((wavg - target) / combinedSd).toFixed(2),
                  sort: (wavg - target) / combinedSd || 1 / 0
               },
               {
                  display: `${(
                     scoresWithAvg.reduce((p, c) => p + c.avg, 0) /
                     scoresWithAvg.length /
                     1000
                  ).toFixed()}k`,
                  sort: scoresWithAvg.reduce((p, c) => p + c.avg, 0) / scoresWithAvg.length || 1 / 0
               }
            ] as {
               sort: string | number;
               display: string | ReactNode;
               meta?: { setid: number; id: number };
            }[];
         })
      );
   }, [pool.maps]);
   useEffect(() => {
      setTableData(prev =>
         prev.toSorted((a, b) =>
            a[sortCol[0]].sort > b[sortCol[0]].sort
               ? sortCol[1]
               : a[sortCol[0]].sort < b[sortCol[0]].sort
               ? -sortCol[1]
               : 0
         )
      );
   }, [sortCol]);
   const updateSort = (i: number) => () => setSortCol(sort => (sort[0] === i ? [i, -sort[1]] : [i, 1]));

   return (
      <Table>
         <thead>
            <tr>
               <td>
                  <span role="button" onClick={updateSort(0)}>
                     Mod
                  </span>
               </td>
               <td>
                  <span role="button" onClick={updateSort(1)}>
                     Map
                  </span>
               </td>
               <td>
                  <span role="button" onClick={updateSort(2)}>
                     Rating
                  </span>
               </td>
               {players.map((p, i) => (
                  <td key={p.id}>
                     <span role="button" onClick={updateSort(3 + i)}>
                        {p.osuname}
                     </span>
                  </td>
               ))}
               <td>
                  <span role="button" onClick={updateSort(3 + players.length)}>
                     Perf.
                  </span>
               </td>
               <td>
                  <span role="button" onClick={updateSort(4 + players.length)}>
                     Team Avg
                  </span>
               </td>
            </tr>
         </thead>
         <tbody>
            {tableData.map(row => (
               <tr
                  key={row[0].meta.id}
                  className="text-outline"
                  style={{
                     backgroundImage: `url(${buildUrl.beatmapsetCover(row[0].meta.setid)})`,
                     backgroundSize: "cover",
                     backgroundPosition: "center",
                     backgroundRepeat: "no-repeat",
                     backgroundBlendMode: "overlay",
                     backgroundColor: "color-mix(in srgb, var(--bs-body-bg) 60%, transparent)"
                  }}
               >
                  {row.map((cell, i) => (
                     <td className="bg-transparent" key={i}>
                        {cell.display}
                     </td>
                  ))}
               </tr>
            ))}
         </tbody>
      </Table>
   );
}
