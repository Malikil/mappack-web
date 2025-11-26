import interpolate from "color-interpolate";
import { Mod } from "osu-web.js";
import { Card, CardBody, CardHeader } from "react-bootstrap";

const skillColor = interpolate(['red', 'green']);
const bgColor = (value: number) => {
   const baseColor = skillColor(value);
   const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
   if (!rgbMatch)
      return baseColor;
   const [, r, g, b] = rgbMatch;
   // Calculate alpha
   let alpha = 1;
   if (value < 0.5)
      alpha = Math.sqrt(1 - value * 2);
   else alpha = Math.sqrt(value * 2 - 1);
   alpha = Math.max(0, Math.min(1, alpha));
   return `rgba(${r},${g},${b},${alpha})`;
}

function SkillCard({ mod, value }: { mod: Mod; value: number }) {
   const skill = Math.max(0, Math.min((20 / value) - 15, 10));
   return (
      <Card style={{ backgroundColor: bgColor(skill / 10) }}>
         <CardBody>
            <div>{mod}</div>
            <div>{skill.toFixed(2)}</div>
         </CardBody>
      </Card>
   );
}

export default function ModSkills({ mods }: { mods: Partial<Record<Mod, number>> }) {
   return (
      <Card>
         <CardHeader>Mod Skills</CardHeader>
         <CardBody className="d-flex flex-wrap gap-2">
            {Object.keys(mods)
               .filter(m => mods[m] || mods[m])
               .map((mod: Mod, i) => (
                  <SkillCard key={mod} mod={mod} value={mods[mod]} />
               ))}
         </CardBody>
      </Card>
   );
}
