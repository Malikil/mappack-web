"use client";

import { DbBeatmap } from "@/types/database.beatmap";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardImg, CardSubtitle, Form, FormControl, Spinner } from "react-bootstrap";
import { fetchMapFromDb, removePool, savePool } from "./actions";
import { buildUrl, GameMode, Mod } from "osu-web.js";
import Link from "next/link";
import { toast } from "react-toastify";
import { parseShortMods, ignoreSongMods } from "@/helpers/mods";

export default function PoolRow({
   teamid,
   data,
   mode,
   revalidate
}: {
   teamid: string;
   data: { name: string; maps: { map: DbBeatmap; mods?: Mod[]; sort?: number }[] };
   mode: GameMode;
   revalidate?: () => void;
}) {
   const collapseId = data.name.replace(/[\. ']/g, "");
   const [name, setName] = useState(data.name);
   const [maps, setMaps] = useState([...data.maps]);
   const [changed, setChanged] = useState(false);
   const [addMapId, setAddMapId] = useState("");
   const [addingMap, setAddingMap] = useState(false);
   const [editing, setEditing] = useState(false);

   useEffect(() => {
      console.log(maps);
      setChanged(
         data.name !== name ||
            maps.length !== data.maps.length ||
            maps.some((m, i) => m.map._id !== data.maps[i]?.map._id || m.sort !== data.maps[i].sort)
      );
   }, [data, name, maps]);

   const addMap = async () => {
      if (addMapId.trim().length < 5) return;
      setAddingMap(true);
      const [id, mod] = addMapId.split("+").map(s => s.trim());
      const intId = parseInt(id);
      const map = await fetchMapFromDb(intId, mode);
      // Incomplete type should be accepted below
      const mapinfo =
         map ||
         ({
            _id: intId
         } as DbBeatmap);
      const modinfo = ignoreSongMods(parseShortMods(mod));
      setMaps(arr => [...arr, { map: mapinfo, mods: modinfo }]);
      setAddMapId("");
      setAddingMap(false);
   };

   return (
      <Form>
         <div className="d-flex gap-3 align-items-center">
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
            {editing ? (
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
            ) : (
               <div
                  id={`collapse-control${collapseId}`}
                  role="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#collapse${collapseId}`}
                  aria-expanded="false"
                  aria-controls={`collapse${collapseId}`}
               >
                  <small className="text-decoration-underline">Expand</small>
               </div>
            )}
            <div className="ms-auto">
               {!editing && (
                  <Link href={`/teams/${teamid}/${data.name}`}>
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
                        const properMaplist = await toast.promise(savePool(teamid, data.name, name, maps), {
                           pending: "Saving pool",
                           success: "Pool saved",
                           error: "That name already exists"
                        });
                        setMaps(properMaplist.maps);
                        setEditing(false);
                        revalidate && revalidate();
                     }}
                  >
                     Save
                  </Button>
                  <Button variant="danger" onClick={() => removePool(teamid, data.name)}>
                     Delete
                  </Button>
                  <Button
                     onClick={() => {
                        if (changed) {
                           setName(data.name);
                           setMaps([...data.maps]);
                        }
                        setEditing(false);
                     }}
                  >
                     Cancel
                  </Button>
               </>
            ) : (
               <Button
                  onClick={() => {
                     const collapseDisplay = document.getElementById(`collapse${collapseId}`);
                     if (!collapseDisplay.classList.contains("show"))
                        document.getElementById(`collapse-control${collapseId}`).click();
                     setEditing(true);
                  }}
               >
                  Edit
               </Button>
            )}
         </div>
         <div className="collapse" id={`collapse${collapseId}`}>
            <div className="d-flex gap-1 mt-2 flex-wrap">
               {maps.map((m, i) => (
                  <Card key={i} className="flex-shrink-0 flex-grow-1" style={{ flexBasis: "140px" }}>
                     <Link href={`/maps/${mode}/${m.map.setid}`}>
                        <CardImg
                           src={buildUrl.beatmapsetCover(m.map.setid)}
                           alt="Cover"
                           style={{ objectFit: "cover" }}
                        />
                     </Link>
                     <CardBody className="d-flex flex-column">
                        <div className="d-flex justify-content-between">
                           <div>
                              <CardSubtitle className="text-break">
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
                        <div className="mt-auto" />
                        {editing && (
                           <div>
                              <FormControl
                                 placeholder="Sort"
                                 value={m.sort || ""}
                                 onChange={e =>
                                    setMaps(arr =>
                                       arr.map((m, idx) =>
                                          idx === i
                                             ? e.target.value
                                                ? { ...m, sort: parseInt(e.target.value) }
                                                : (() => {
                                                     const { sort, ...rest } = m;
                                                     return rest;
                                                  })()
                                             : m
                                       )
                                    )
                                 }
                              />
                           </div>
                        )}
                        <div className="d-flex">
                           <span>{!m.mods ? "FM" : m.mods.join("") || "NM"}</span>
                           <span className="ms-auto">{m.map._id}</span>
                        </div>
                     </CardBody>
                  </Card>
               ))}
            </div>
         </div>
      </Form>
   );
}
