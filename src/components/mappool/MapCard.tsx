"use client";

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
import MapCardBody from "./MapCardBody";
import { MapAction } from "@/types/mappool";
import { Rating } from "@/types/rating";
import { buildUrl, GameMode } from "osu-web.js";
import { BeatmapByMode } from "@/types/database/beatmap";

export default function MapCard<M extends GameMode>(props: {
   beatmap: BeatmapByMode[NoInfer<M>];
   starsPlus?: boolean;
   mapActions?: MapAction[];
   rating?: Rating;
   hideRatings?: boolean;
   mode: M;
}) {
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
               <div className="ms-auto">{props.beatmap._id}</div>
            </CardSubtitle>
            <Container className="mt-auto">
               <Row className="mb-2">
                  <Col>Submitted by</Col>
                  <Col>{props.beatmap.mapper}</Col>
               </Row>
            </Container>
            <MapCardBody
               {...props}
               mapActions={[
                  {
                     title: "Beatmap",
                     action: (
                        <CardLink
                           key="Beatmap"
                           href={buildUrl.beatmap(props.beatmap._id)}
                           target="_blank"
                           rel="noopener noreferrer"
                        >
                           Beatmap
                        </CardLink>
                     )
                  },
                  {
                     title: "Stats",
                     action: (
                        <CardLink key="Stats" href={`/maps/${props.mode}/${props.beatmap.setid}`}>
                           Stats
                        </CardLink>
                     )
                  }
               ]}
            />
         </CardBody>
      </Card>
   );
}
