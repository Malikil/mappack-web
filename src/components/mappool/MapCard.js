"use client";

import {
   Card,
   CardBody,
   CardImg,
   CardSubtitle,
   CardTitle,
   Col,
   Container,
   Row
} from "react-bootstrap";
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
            <CardSubtitle className="d-flex mb-2">
               <div className="text-break">{props.beatmap.version}</div>
               <div className="ms-auto">{props.beatmap.id}</div>
            </CardSubtitle>
            <Container className="mt-auto">
               <Row className="mb-2">
                  <Col>Submitted by</Col>
                  <Col>{props.beatmap.mapper}</Col>
               </Row>
            </Container>
            <MapCardBody {...props} />
         </CardBody>
      </Card>
   );
}
