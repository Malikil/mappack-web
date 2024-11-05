"use client";

import { Button, Container, FormControl, FormLabel, Modal, Spinner } from "react-bootstrap";
import AddMapButton from "./addmap";
import { ModsEnum } from "osu-web.js";
import usePlayer from "@/hooks/usePlayer";
import { useRouter } from "next/navigation";
import PoolStats from "@/components/mappool/PoolStats";
import { useEffect, useState } from "react";
import MapList from "@/components/mappool/MapList";
import { useSWRConfig } from "swr";
import { toast } from "react-toastify";
import { uploadScreenshot } from "./actions";

const compressImage = imgData =>
   new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
         console.log(img);
         const canvas = document.createElement("canvas");
         const context = canvas.getContext("2d");

         const originalWidth = img.width;
         const originalHeight = img.height;
         console.log(originalWidth, originalHeight);

         const baseWidth = 480;
         const baseHeight = 270;
         const canvasWidth = Math.min(
            baseWidth,
            ((originalWidth * baseHeight) / originalHeight) | 0
         );
         const canvasHeight = Math.min(
            baseHeight,
            ((originalHeight * baseWidth) / originalWidth) | 0
         );
         console.log(canvasWidth, canvasHeight);

         canvas.width = Math.min(originalWidth, canvasWidth);
         canvas.height = Math.min(originalHeight, canvasHeight);
         console.log(canvas.width, canvas.height);

         try {
            context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
         } catch (err) {
            return reject(err);
         }

         // Reduce quality
         canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject("No blob");
         }, "image/jpeg");
      };
      img.onerror = () => reject("Image loading error");
      img.src = imgData;
   });

export default function Mappool() {
   const { mutate } = useSWRConfig();
   const { data: player, isLoading, isError } = usePlayer();
   const router = useRouter();

   const [maps, setMaps] = useState({
      nm: [],
      hd: [],
      hr: [],
      dt: [],
      other: []
   });
   const [screenshot, setScreenshot] = useState(null);
   const [selectedMap, setSelectedMap] = useState(null);
   const [showModal, setShowModal] = useState(false);
   const [submitting, setSubmitting] = useState(false);
   useEffect(() => {
      if (isError || isLoading) return;
      setMaps(
         player.maps.current.reduce(
            (sorted, map) => {
               switch (map.mods) {
                  case 0:
                     sorted.nm.push(map);
                     break;
                  case ModsEnum.HD:
                     sorted.hd.push(map);
                     break;
                  case ModsEnum.HR:
                     sorted.hr.push(map);
                     break;
                  case ModsEnum.DT:
                     sorted.dt.push(map);
                     break;
                  default:
                     sorted.other.push(map);
               }
               return sorted;
            },
            {
               nm: [],
               hd: [],
               hr: [],
               dt: [],
               other: []
            }
         )
      );
   }, [player, isLoading, isError]);

   if (isLoading) return <Spinner className="m-4" />;
   if (isError || !player) return router.push("/");
   return (
      <Container className="py-2">
         <MapList
            maps={maps}
            mapActions={[
               {
                  title: "Remove",
                  action: beatmap =>
                     mutate(
                        "/api/db/player",
                        () =>
                           fetch(`/api/db/maps?id=${beatmap.id}&mods=${beatmap.mods}`, {
                              method: "DELETE"
                           }).then(res => res.json()),
                        {
                           optimisticData: player => {
                              const index = player.maps.current.findIndex(
                                 m => m.id === beatmap.id && m.mods === beatmap.mods
                              );
                              return {
                                 ...player,
                                 maps: {
                                    ...player.maps,
                                    current: player.maps.current.filter((_, i) => i !== index)
                                 }
                              };
                           },
                           populateCache: (result, player) => ({
                              ...player,
                              maps: {
                                 ...player.maps,
                                 current: result
                              }
                           })
                           //revalidate: true
                        }
                     )
               },
               {
                  title: "Screenshot",
                  action: async beatmap => {
                     setSelectedMap(beatmap);
                     if (beatmap.screenshot) {
                        console.log(beatmap.screenshot);
                        const buf = Buffer.from(beatmap.screenshot.data);
                        const blob = new Blob([buf], { type: "image/jpeg" });
                        console.log(blob);
                        const blobUrl = URL.createObjectURL(blob);
                        setScreenshot(blobUrl);
                     } else setScreenshot(null);

                     setShowModal(true);
                  },
                  condition: beatmap => !beatmap.approval || beatmap.approval === "pending"
               }
            ]}
         />
         <PoolStats maps={player.maps.current} />
         <AddMapButton count={player.maps.current.length} />
         <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
               <Modal.Title>Screenshot</Modal.Title>
            </Modal.Header>
            <Modal.Body>
               {screenshot && (
                  <img
                     src={screenshot}
                     alt="Submitted Screenshot"
                     width="100%"
                     style={{ objectFit: "contain" }}
                  />
               )}
               <form
                  id="screenshotForm"
                  action={async formData => {
                     setSubmitting(true);
                     const screenshotFile = formData.get("screenshot");
                     // Is this actually redundant?
                     const screenshotData = await new Promise(resolve => {
                        const fr = new FileReader();
                        fr.addEventListener("load", e => resolve(e.target.result));
                        fr.readAsDataURL(screenshotFile);
                     });
                     try {
                        const compressedData = await compressImage(screenshotData);
                        const blobUrl = URL.createObjectURL(compressedData);
                        setScreenshot(blobUrl);
                        const formData = new FormData();
                        formData.append("image", compressedData);
                        formData.append("beatmapId", selectedMap.id);
                        formData.append("mods", selectedMap.mods);
                        await toast.promise(
                           mutate("/api/db/player", () => uploadScreenshot(formData), {
                              optimisticData: oldData => {
                                 const updatedMaplist = oldData.maps.current;
                                 const index = updatedMaplist.findIndex(
                                    m => m.id === selectedMap.id && m.mods === selectedMap.mods
                                 );
                                 updatedMaplist[index].screenshot = compressedData.arrayBuffer();
                                 return {
                                    ...oldData,
                                    maps: {
                                       ...oldData.maps,
                                       current: updatedMaplist
                                    }
                                 };
                              },
                              populateCache: (result, oldData) => {
                                 console.log(result);
                                 return {
                                    ...oldData,
                                    maps: {
                                       ...oldData.maps,
                                       current: result
                                    }
                                 };
                              }
                           }),
                           {
                              pending: "Uploading",
                              success: "Image uploaded",
                              error: "Unable to upload image"
                           }
                        );
                     } catch (err) {
                        toast.error("Error during upload");
                        console.error(err);
                     }
                     setSubmitting(false);
                  }}
               >
                  <FormLabel htmlFor="imageUpload">Upload Screenshot</FormLabel>
                  <FormControl type="file" accept="image/*" id="imageUpload" name="screenshot" />
               </form>
            </Modal.Body>
            <Modal.Footer>
               <Button type="submit" form="screenshotForm" disabled={submitting}>
                  Submit {submitting && <Spinner size="sm" />}
               </Button>
               <Button onClick={() => setShowModal(false)}>Done</Button>
            </Modal.Footer>
         </Modal>
      </Container>
   );
}
