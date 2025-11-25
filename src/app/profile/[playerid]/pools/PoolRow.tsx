"use client";

import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool } from "@/types/rating";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardImg, CardSubtitle, Form, FormControl, Spinner } from "react-bootstrap";
import { fetchMapFromDb, removePool, savePool } from "./actions";
import { buildUrl, GameMode } from "osu-web.js";
import Link from "next/link";
import { toast } from "react-toastify";

const mods = ["nm", "hd", "hr", "dt", "fm"];

export default function PoolRow({
   osuid,
   data,
   mode,
   revalidate
}: {
   osuid: number;
   data: { name: string; maps: { map: DbBeatmap; mod: ModPool }[] };
   mode: GameMode;
   revalidate?: () => void;
}) {
   const [name, setName] = useState(data.name);
   const [maps, setMaps] = useState(data.maps);
   const [changed, setChanged] = useState(false);
   const [addMapId, setAddMapId] = useState("");
   const [addingMap, setAddingMap] = useState(false);
   const [linkParams, setLinkParams] = useState(new URLSearchParams());
   const [editing, setEditing] = useState(false);

   useEffect(() => {
      setChanged(
         data.name !== name ||
            maps.length !== data.maps.length ||
            maps.some((m, i) => m.map._id !== data.maps[i]?.map._id)
      );
   }, [data, name, maps]);

   useEffect(() => {
      const params = new URLSearchParams();
      params.append("m", mode);
      if (data.name) params.append("p", data.name);
      mods.forEach(mod => {
         const list = data.maps.filter(m => m.mod === mod);
         const idlist = list.map(m => m.map._id).join(",");
         if (idlist) params.append(mod, idlist);
      });
      setLinkParams(params);
   }, [data]);

   const addMap = async () => {
      if (addMapId.trim().length < 5) return;
      setAddingMap(true);
      const [id, mod] = addMapId.split("+").map(s => s.trim().toLowerCase());
      const intId = parseInt(id);
      const map = await fetchMapFromDb(intId, mode);
      // Incomplete type should be accepted below
      const mapinfo =
         map ||
         ({
            _id: intId
         } as DbBeatmap);
      const modinfo = (mods.includes(mod) ? mod : "nm") as ModPool;
      setMaps(arr => [...arr, { map: mapinfo, mod: modinfo }]);
      setAddMapId("");
      setAddingMap(false);
   };

   return (
      <Form>
         <div className="d-flex gap-3">
            <div>
               <FormControl
                  type="text"
                  name="name"
                  placeholder="Pool Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!editing}
               />
            </div>
            {editing && (
               <div className="d-flex gap-1">
                  <FormControl
                     type="text"
                     name="addmap"
                     placeholder="MapID +NM"
                     value={addMapId}
                     onChange={e => setAddMapId(e.target.value)}
                     onKeyDown={e => {
                        if (e.key !== "Enter") return;
                        addMap();
                     }}
                  />
                  <Button disabled={addingMap} onClick={addMap}>
                     {addingMap ? <Spinner size="sm" /> : "+"}
                  </Button>
               </div>
            )}
            <div className="ms-auto">
               {!editing && (
                  <Link href={`/maps?${linkParams.toString()}`}>
                     <Button>View Stats</Button>
                  </Link>
               )}
            </div>
            {editing ? (
               <>
                  <Button
                     variant="success"
                     disabled={!changed}
                     onClick={async () => {
                        if (!changed) return;
                        const properMaplist = await toast.promise(
                           savePool(osuid, mode, data.name, name, maps),
                           {
                              pending: "Saving pool",
                              success: "Pool saved",
                              error: "That name already exists"
                           }
                        );
                        setMaps(properMaplist.maps);
                        setEditing(false);
                        revalidate && revalidate();
                     }}
                  >
                     Save
                  </Button>
                  <Button variant="danger" onClick={() => removePool(osuid, mode, data.name)}>
                     Delete
                  </Button>
                  <Button
                     onClick={() => {
                        if (changed) {
                           setName(data.name);
                           setMaps(data.maps);
                        }
                        setEditing(false);
                     }}
                  >
                     Cancel
                  </Button>
               </>
            ) : (
               <Button onClick={() => setEditing(true)}>Edit</Button>
            )}
         </div>
         <div className="d-flex gap-1 mt-2 flex-wrap">
            {maps.map((m, i) => {
               const mod = m.mod.toUpperCase();
               const modMult = m.map.mods[mod] || 1;
               return (
                  <Card key={i} className="flex-shrink-0 flex-grow-1" style={{ flexBasis: "140px" }}>
                     <Link href={buildUrl.beatmap(m.map._id)} target="_blank" rel="noopener noreferrer">
                        <CardImg
                           src={buildUrl.beatmapsetCover(m.map.setid)}
                           alt="Cover"
                           style={{ objectFit: "cover" }}
                        />
                     </Link>
                     <CardBody className="d-flex flex-column">
                        <div className="d-flex justify-content-between">
                           <div>
                              <CardSubtitle>
                                 {m.map.artist || m.map._id} - {m.map.title}
                              </CardSubtitle>
                              <div className="d-flex justify-content-between align-items-center">
                                 <span>{m.map.version || "No Info"}</span>
                              </div>
                           </div>
                           {editing && (
                              <div>
                                 <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() =>
                                       setMaps(arr => arr.filter(rmMap => rmMap.map._id !== m.map._id))
                                    }
                                 >
                                    x
                                 </Button>
                              </div>
                           )}
                        </div>
                        <div className="d-flex mt-auto">
                           <span>{mod}</span>
                           {"rating" in m.map && (
                              <span className="ms-auto">{(m.map.rating.rating * modMult).toFixed()}</span>
                           )}
                        </div>
                     </CardBody>
                  </Card>
               );
            })}
         </div>
      </Form>
   );
}
