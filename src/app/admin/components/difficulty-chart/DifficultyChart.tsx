"use client";

import { Card, CardBody, CardTitle, Col, Row } from "react-bootstrap";
import { Scatter } from "react-chartjs-2";
import "chart.js/auto";
import { useEffect, useState } from "react";
import { fetchScatterData } from "./actions";

   const chartTitle = {
      scaling: "Difficulty Chart",
      recent: "Recent Pack"
   };

   export default function DifficultyChart({
      chartVersion,
      legend
   }: {
      chartVersion: "scaling" | "recent";
      legend?: boolean;
   }) {
      const [data, setData] = useState({
         hd: 0,
         hr: 0,
         dt: 0,
         chart: null,
         mapCount: 0
      });
      useEffect(() => {
         fetchScatterData(chartVersion).then(scatterData => {
            setData({
               ...scatterData,
               chart: {
                  datasets: scatterData.chart
               }
            });
         });
      }, [chartVersion]);

      return (
         <Card className="flex-grow-1">
            <CardBody>
               <CardTitle>{chartTitle[chartVersion]}</CardTitle>
               {!data.chart ? (
                  <div>No Data</div>
               ) : (
                  <Scatter
                     data={data.chart}
                     options={{
                        plugins: {
                           legend: {
                              display: !!legend
                           },
                           tooltip: {
                              callbacks: {
                                 label: ctx =>
                                    `${(ctx.raw as any).label || ctx.dataset.label} ${ctx.formattedValue}`
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
