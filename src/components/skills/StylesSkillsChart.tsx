"use client";

import "chart.js/auto";
import { Radar } from "react-chartjs-2";

export function StylesSkillsChart({ skills }: { skills: number[] }) {
   // const bootstrapBorderColor = () =>
   //    getComputedStyle(document.documentElement).getPropertyValue("--bs-border-color").trim();
   return (
      <Radar
         data={{
            labels: skills.map((n, i) => `Skill ${i + 1}`),
            datasets: [{ data: skills }]
         }}
         options={{
            elements: {
               line: {
                  borderWidth: 1
               },
               point: {
                  pointStyle: false
               }
            },
            plugins: {
               legend: { display: false },
               tooltip: { enabled: false }
            },
            scales: {
               r: {
                  angleLines: {
                     display: false
                     //color: bootstrapBorderColor
                  },
                  grid: {
                     display: false
                     //color: bootstrapBorderColor
                  },
                  ticks: {
                     display: false
                  }
               }
            }
         }}
      />
   );
}

export function SkillsChartWithVDivide({ skills }: { skills: number[] }) {
   return (
      <div className="d-flex gap-2">
         <div className="border" />
         <div>
            <StylesSkillsChart skills={skills} />
         </div>
      </div>
   );
}
