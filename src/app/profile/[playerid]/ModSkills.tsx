import { Mod } from "osu-web.js";
import { Card, CardBody, CardHeader } from "react-bootstrap";
import { SkillsChartWithVDivide } from "@/components/skills/StylesSkillsChart";
import SkillCard from "@/components/skills/SkillCard";

export default function ModSkills({
   mods,
   skills
}: {
   mods: Partial<Record<Mod, number>>;
   skills: number[];
}) {
   return (
      <Card>
         <CardHeader>Skills</CardHeader>
         <CardBody className="d-flex gap-2 justify-content-between">
            <div className="d-flex flex-wrap gap-2 align-items-start">
               {Object.keys(mods)
                  .filter(m => mods[m] || mods[m])
                  .map((mod: Mod) => (
                     <SkillCard key={mod} mod={mod} value={mods[mod]} />
                  ))}
            </div>
            <SkillsChartWithVDivide skills={skills} />
         </CardBody>
      </Card>
   );
}
