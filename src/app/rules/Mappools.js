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
               .
            </li>
            <li>Each difficulty is taken individually.</li>
            <li>
               Maps are given a rating on the system. The initial rating is determined from the
               map's star rating.
            </li>
            <li>As different maps are used in matches, the map's rating will also be adjusted.</li>
         </ul>
      </div>
   );
}
