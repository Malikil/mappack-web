"use client";

export default function Schedule() {
   const start = new Date(Date.UTC(2025, 6, 12, 16));
   const end = new Date(Date.UTC(2025, 6, 12, 20));
   const start2 = new Date(Date.UTC(2025, 6, 13, 16));

   return (
      <div className="mb-2">
         Current schedule is Saturday/Sunday from 16 to 20 UTC (
         {start.toLocaleString("default", { weekday: "short" })}/
         {start2.toLocaleString("default", { weekday: "short" })}{" "}
         {start.toLocaleTimeString("default", { hour: "numeric", hourCycle: "h23" })} to{' '}
         {end.toLocaleTimeString("default", { hour: "numeric", hourCycle: "h23" })} local time)
      </div>
   );
}
