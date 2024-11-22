import Link from "next/link";

export default function Mappools() {
   return (
      <div>
         <h3 id="mappools">Mappools</h3>
         <ul>
            <li>
               Maps are taken from officially released mappacks. A list of packs is available{" "}
               <Link
                  href="https://osu.ppy.sh/beatmaps/packs"
                  target="_blank"
                  rel="noopener noreferrer"
               >
                  here
               </Link>
            </li>
            <li>A new mappack will the used each Monday</li>
            <li>Each difficulty is taken individually</li>
            <li>
               Maps are given a rating on the system. The initial rating is determined from the
               map&apos;s star rating
            </li>
            <li>
               As different maps are used in matches, the map&apos;s rating will also be adjusted
            </li>
            <li>
               In all modes, the system will attempt to select maps where the player&apos;s expected
               score is 600k
            </li>
         </ul>
      </div>
   );
}
