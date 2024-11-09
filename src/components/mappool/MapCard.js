"use client";

import { convertTime } from "@/time";
import {
   Card,
   CardBody,
   CardImg,
   CardLink,
   CardSubtitle,
   CardTitle,
   Col,
   Container,
   Row
} from "react-bootstrap";
import styles from "./mappool.module.css";

/**
 * @param {object} props
 * @param {import("@/types/database.beatmap").DbBeatmap} props.beatmap
 * @param {object[]} [props.mapActions]
 * @param {string} props.mapActions.title
 * @param {function(import("@/types/database.beatmap").DbBeatmap)} props.mapActions.action
 * @param {function(import("@/types/database.beatmap").DbBeatmap): boolean} [props.mapActions.condition]
 * @param {import("@/types/database.beatmap").Rating} [props.rating]
 * @param {boolean} [props.hideRatings]
 */
export default function MapCard(props) {
   const withinRangeClass = rating => {
      const range = props.rating?.rd;
      const target = props.rating?.rating;
      if (Math.abs(target - rating) < range) return "border border-2 border-success rounded";
   };
   return (
      <Card className={styles.mapcard}>
         <CardBody className="d-flex flex-column">
            <CardImg
               src={`https://assets.ppy.sh/beatmaps/${props.beatmap.setid}/covers/cover.jpg`}
               alt="Cover"
               style={{ minHeight: "100px", objectFit: "cover" }}
            />
            <CardTitle className="mt-1">
               {props.beatmap.artist} - {props.beatmap.title}
            </CardTitle>
            <CardSubtitle className="d-flex">
               <div className="text-break">{props.beatmap.version}</div>
               <div className="ms-auto">{props.beatmap.id}</div>
            </CardSubtitle>
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
                     <div>{props.beatmap.stars.toFixed(2)}</div>
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
                        <Col className={withinRangeClass(props.beatmap.ratings.nm.rating)}>
                           NM {props.beatmap.ratings.nm.rating.toFixed(0)}
                        </Col>
                        <Col className={withinRangeClass(props.beatmap.ratings.hd.rating)}>
                           HD {props.beatmap.ratings.hd.rating.toFixed(0)}
                        </Col>
                     </Row>
                     <Row>
                        <Col className={withinRangeClass(props.beatmap.ratings.hr.rating)}>
                           HR {props.beatmap.ratings.hr.rating.toFixed(0)}
                        </Col>
                        <Col className={withinRangeClass(props.beatmap.ratings.dt.rating)}>
                           DT {props.beatmap.ratings.dt.rating.toFixed(0)}
                        </Col>
                     </Row>
                  </Container>
               </>
            )}
            <div className="d-flex">
               <CardLink
                  href={`https://osu.ppy.sh/beatmapsets/${props.beatmap.setid}#osu/${props.beatmap.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  Beatmap
               </CardLink>
               {props.mapActions
                  ?.map(fn =>
                     !fn.condition || fn.condition(props.beatmap) ? (
                        <CardLink
                           key={fn.title}
                           role="button"
                           onClick={() => fn.action(props.beatmap, props.mod, props.rating)}
                        >
                           {fn.title}
                        </CardLink>
                     ) : null
                  )
                  .filter(p => p)}
            </div>
         </CardBody>
      </Card>
   );
}
