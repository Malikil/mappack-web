'use client';

import "chart.js/auto";
import { Radar } from "react-chartjs-2";

export default function StylesSkillsChart({ skills }: { skills: number[] }) {
   const bootstrapBorderColor = () => getComputedStyle(document.documentElement).getPropertyValue('--bs-border-color').trim();
   return <Radar
      data={{
         labels: skills.map((n, i) => `Skill ${i + 1}`),
         datasets: [{
            data: skills
         }]
      }}
      options={{
         plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
         },
         scales: {
            r: {
               angleLines: {
                  color: bootstrapBorderColor
               },
               grid: {
                  color: bootstrapBorderColor
               },
               ticks: {
                  display: false
               }
            }
         }
      }}
   />
}