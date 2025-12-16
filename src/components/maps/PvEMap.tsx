import Link from "next/link";
import { buildUrl, GameMode, Mod } from "osu-web.js";
import { Card, CardBody, CardImg, CardSubtitle } from "react-bootstrap";

export default function PvEMap({
   id,
   setid,
   version,
   mode,
   score,
   mods,
   rating
}: {
   id: number;
   setid: number;
   version: string;
   mode: GameMode;
   score: number;
   mods: Mod[];
   rating?: number;
}) {
   return (
      <Card className="flex-shrink-0 flex-grow-1" style={{ flexBasis: "140px" }}>
         <Link href={`/maps/${mode}/${setid}`}>
            <CardImg src={buildUrl.beatmapsetCover(setid)} alt="Cover" style={{ objectFit: "cover" }} />
         </Link>
         <CardBody className="d-flex flex-column">
            <CardSubtitle>{score.toLocaleString()}</CardSubtitle>
            <div>{version}</div>
            <div className="d-flex mt-auto">
               <span>{mods.join("") || "NM"}</span>
               {rating && <span className="ms-auto">{rating.toFixed()}</span>}
            </div>
         </CardBody>
      </Card>
   );
}
