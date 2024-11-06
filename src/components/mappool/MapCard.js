"use client";

/**
 * @typedef Beatmap
 * @prop {number} id
 * @prop {number} setid
 * @prop {string} artist
 * @prop {string} title
 * @prop {string} version
 * @prop {number} length
 * @prop {number} drain
 * @prop {number} bpm
 * @prop {number} cs
 * @prop {number} ar
 * @prop {number} stars
 * @prop {number} mods
 */

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
import { getEnumMods } from "osu-web.js";

/**
 * @param {object} props
 * @param {Beatmap} props.beatmap
 * @param {boolean} props.showMods
 * @param {object[]} [props.mapActions]
 * @param {string} props.mapActions.title
 * @param {function} props.mapActions.action
 * @param {function} props.mapActions.condition
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
               <div>{props.beatmap.version}</div>
               {props.showMods && (
                  <div className="ms-2">+{getEnumMods(props.beatmap.mods).join("")}</div>
               )}
               <div className="ms-auto">{props.beatmap.id}</div>
            </CardSubtitle>
            <Container>
               <Row>
                  <Col>Length</Col>
                  <Col className="d-flex flex-wrap align-items-center gap-1">
                     <span className="d-inline-block">{convertTime(props.beatmap.length)}</span>{" "}
                     <span className="d-inline-block">
                        {props.beatmap.drain < props.beatmap.length &&
                           ` (${convertTime(props.beatmap.drain)} drain)`}
                     </span>
                  </Col>
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
            <div className="mt-auto d-flex">
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
                           onClick={() => fn.action(props.beatmap)}
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
