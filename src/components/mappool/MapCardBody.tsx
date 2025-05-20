"use client";

import { convertTime } from "@/time";
import { CardLink, CardSubtitle, Col, Container, Row } from "react-bootstrap";
import { withinRange } from "@/helpers/rating-range";
import { BeatmapVersion } from "@/types/database.beatmap";
import { Rating } from "@/types/rating";
import { MapAction } from "@/types/mappool";

export type MapCardBodyProps = {
   className?: string;
   beatmap: BeatmapVersion;
   starsPlus?: boolean;
   mapActions?: MapAction[];
   rating?: Rating;
   hideRatings?: boolean;
};

export default function MapCardBody(props: MapCardBodyProps) {
   const withinRangeClass = (rating: Rating) => {
      if (withinRange(props.rating, rating)) return "border border-2 border-success rounded";
   };
   return (
      <div className={`d-flex flex-column ${props.className || ""}`}>
         <Container className="mb-auto">
            <Row>
               <Col>Length</Col>
               <Col>{convertTime(props.beatmap.length)}</Col>
            </Row>
            <Row>
               <Col>BPM</Col>
               <Col>{parseFloat(props.beatmap.bpm.toFixed(3))}</Col>
            </Row>
            <Row>
               <Col>Stars</Col>
               <Col className="d-flex align-items-center gap-1">
                  <div className={props.starsPlus ? "fst-italic" : undefined}>
                     {props.starsPlus && "("}
                     {props.beatmap.stars.toFixed(2)}
                     {props.starsPlus && ")"}
                  </div>
               </Col>
            </Row>
            <Row>
               <Col>CS</Col>
               <Col>{parseFloat(props.beatmap.cs.toFixed(2))}</Col>
            </Row>
            <Row>
               <Col>AR</Col>
               <Col>{parseFloat(props.beatmap.ar.toFixed(2))}</Col>
            </Row>
         </Container>
         {!props.hideRatings && (
            <>
               <hr className="mt-2" />
               <CardSubtitle>Ratings:</CardSubtitle>
               <Container>
                  <Row>
                     <Col className={withinRangeClass(props.beatmap.ratings.nm)}>
                        NM {props.beatmap.ratings.nm.rating.toFixed(0)}
                     </Col>
                     <Col className={withinRangeClass(props.beatmap.ratings.hd)}>
                        HD {props.beatmap.ratings.hd.rating.toFixed(0)}
                     </Col>
                  </Row>
                  <Row>
                     <Col className={withinRangeClass(props.beatmap.ratings.hr)}>
                        HR {props.beatmap.ratings.hr.rating.toFixed(0)}
                     </Col>
                     <Col className={withinRangeClass(props.beatmap.ratings.dt)}>
                        DT {props.beatmap.ratings.dt.rating.toFixed(0)}
                     </Col>
                  </Row>
               </Container>
            </>
         )}
         {props.mapActions && (
            <div className="d-flex">
               {props.mapActions
                  .map(fn =>
                     !fn.condition || fn.condition(props.beatmap) ? (
                        typeof fn.action === "function" ? (
                           <CardLink
                              key={fn.title}
                              role="button"
                              onClick={() => (fn.action as (beatmap: BeatmapVersion) => void)(props.beatmap)}
                           >
                              {fn.title}
                           </CardLink>
                        ) : (
                           fn.action
                        )
                     ) : null
                  )
                  .filter(p => p)}
            </div>
         )}
      </div>
   );
}
