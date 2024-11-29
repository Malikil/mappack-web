"use client";

import { Card, CardBody, CardTitle, Col, Row } from "react-bootstrap";
import { Scatter } from "react-chartjs-2";
import "chart.js/auto";
import { useEffect, useState } from "react";
import { fetchScatterData } from "./actions";

export default function DifficultyChart() {
   const [data, setData] = useState({
      hd: 0,
      hr: 0,
      dt: 0,
      chart: null
   });
   useEffect(() => {
      fetchScatterData().then(scatterData => {
         setData({
            ...scatterData,
            chart: {
               datasets: scatterData.chart
            }
         });
      });
   }, []);

   return (
      <Card className="flex-grow-1">
         <CardBody>
            <CardTitle>Difficulty Chart</CardTitle>
            {!data.chart ? (
               <div>No Data</div>
            ) : (
               <Scatter
                  data={data.chart}
                  options={{
                     plugins: {
                        tooltip: {
                           callbacks: {
                              label: ctx =>
                                 `${ctx.raw.label || ctx.dataset.label} ${ctx.formattedValue}`
                           }
                        }
                     },
                     scales: {
                        x: {
                           title: {
                              display: true,
                              text: "Stars"
                           }
                        },
                        y: {
                           title: {
                              display: true,
                              text: "System Rating"
                           }
                        }
                     }
                  }}
               />
            )}
            <Row>
               <Col>{data.mapCount || 0} maps</Col>
               <Col>HD: {data.hd.toFixed(2)}x</Col>
               <Col>HR: {data.hr.toFixed(2)}x</Col>
               <Col>DT: {data.dt.toFixed(2)}x</Col>
            </Row>
         </CardBody>
      </Card>
   );
}
