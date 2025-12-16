import interpolate from "color-interpolate";
import { Mod } from "osu-web.js";
import { Card, CardBody } from "react-bootstrap";

const WORST_MULT = 1.053;

const skillColor = interpolate(["red", "green"]);
const bgColor = (value: number) => {
   const baseColor = skillColor(value);
   const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
   if (!rgbMatch) return baseColor;
   const [, r, g, b] = rgbMatch;
   // Calculate alpha
   let alpha = 1;
   const transparent = 0.6;
   if (value < transparent) alpha = Math.sqrt(1 - value / transparent);
   else alpha = Math.sqrt((value - transparent) / (1 - transparent));
   alpha = Math.max(0, Math.min(1, alpha));
   return `rgba(${r},${g},${b},${alpha})`;
};

export default function SkillCard({ mod, value }: { mod: Mod; value: number }) {
   const zeroTarget = 2 * WORST_MULT - 1;
   const scale = (5 * zeroTarget) / (zeroTarget - 1);
   const skill = Math.max(0, Math.min(scale / value - scale + 5, 10));
   return (
      <Card style={{ backgroundColor: bgColor(Math.min(skill / 8, 1)) }}>
         <CardBody>
            <div>{mod}</div>
            <div>{skill.toFixed(2)}</div>
         </CardBody>
      </Card>
   );
}