"use client";

import { convertTime } from "@/time";
import { CardLink, CardSubtitle, Col, Container, Row } from "react-bootstrap";
import { withinRange } from "@/helpers/rating-range";
import { BeatmapVersion } from "@/types/mappool";
import { Rating } from "@/types/rating";
import { MapAction } from "@/types/mappool";
import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode } from "osu-web.js";

export type MapCardBodyProps = {
   className?: string;
   beatmap: DbBeatmap;
   starsPlus?: boolean;
   mapActions?: MapAction[];
   rating?: Rating;
   hideRatings?: boolean;
   mode?: GameMode;
};

export default function MapCardBody(props: MapCardBodyProps) {
   const withinRangeClass = (rating: Rating) => {
      if (props.rating && withinRange(props.rating, rating)) return "border border-2 border-success rounded";
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
            {props.beatmap.cs && (
               <Row>
                  <Col>CS</Col>
                  <Col>{parseFloat(props.beatmap.cs.toFixed(2))}</Col>
               </Row>
            )}
            {props.beatmap.ar && (
               <Row>
                  <Col>AR</Col>
                  <Col>{parseFloat(props.beatmap.ar.toFixed(2))}</Col>
               </Row>
            )}
         </Container>
         {!props.hideRatings && (
            <>
               <hr className="mt-2" />
               <CardSubtitle>Rating:</CardSubtitle>
               <Container>
                  <Row>
                     <Col className={withinRangeClass(props.beatmap.rating)}>
                        NM {props.beatmap.rating.rating.toFixed(0)}
                     </Col>
                     <Col
                        className={withinRangeClass({
                           ...props.beatmap.rating,
                           rating: props.beatmap.rating.rating * (props.beatmap.mods.DT || 1)
                        })}
                     >
                        DT x{(props.beatmap.mods.DT || 1).toFixed(2)}
                     </Col>
                  </Row>
                  {props.mode !== "mania" && (
                     <Row>
                        <Col
                           className={withinRangeClass({
                              ...props.beatmap.rating,
                              rating: props.beatmap.rating.rating * (props.beatmap.mods.HD || 1)
                           })}
                        >
                           HD x{(props.beatmap.mods.HD || 1).toFixed(2)}
                        </Col>
                        <Col
                           className={withinRangeClass({
                              ...props.beatmap.rating,
                              rating: props.beatmap.rating.rating * (props.beatmap.mods.HR || 1)
                           })}
                        >
                           HR x{(props.beatmap.mods.HR || 1).toFixed(2)}
                        </Col>
                     </Row>
                  )}
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
