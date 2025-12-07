import Link from "next/link";

export default function Mappools() {
   return (
      <div>
         <h3 id="mappools">Mappools</h3>
         <ul>
            <li>
               Maps are taken from officially released mappacks. A list of packs is available{" "}
               <Link href="https://osu.ppy.sh/beatmaps/packs" target="_blank" rel="noopener noreferrer">
                  here
               </Link>
            </li>
            <li>A new mappack will the used each Monday</li>
            <li>Two packs will be active at a time</li>
            <li>Each difficulty is taken individually</li>
         </ul>
      </div>
   );
}
