"use client";

import { Card, CardBody, CardImg, CardSubtitle, CardTitle } from "react-bootstrap";
import styles from "./mappool.module.css";
import MapCardBody from "./MapCardBody";

/**
 * @param {object} props
 * @param {import("@/types/database.beatmap").DbBeatmap} props.beatmap
 * @param {boolean} [props.starsPlus]
 * @param {object[]} [props.mapActions]
 * @param {string} props.mapActions.title
 * @param {function(import("@/types/database.beatmap").DbBeatmap)} props.mapActions.action
 * @param {function(import("@/types/database.beatmap").DbBeatmap): boolean} [props.mapActions.condition]
 * @param {import("@/types/database.beatmap").Rating} [props.rating]
 * @param {boolean} [props.hideRatings]
 */
export default function MapCard(props) {
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
            <MapCardBody {...props} className="mt-auto" />
         </CardBody>
      </Card>
   );
}
