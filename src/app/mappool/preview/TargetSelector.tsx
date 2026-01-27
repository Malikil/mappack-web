"use client";

import { useRouter } from "next/navigation";
import { GameMode } from "osu-web.js";
import { Button, Form, FormControl, FormGroup, FormLabel, FormSelect } from "react-bootstrap";

export default function TargetSelector({
   initRating,
   initMode,
   counts
}: {
   initRating: number;
   initMode: GameMode | "4k" | "7k";
   counts: {
      nm: number;
      hd: number;
      hr: number;
      dt: number;
      fm: number;
   };
}) {
   const router = useRouter();

   return (
      <Form
         className="d-flex gap-2"
         onSubmit={e => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const params = new URLSearchParams(
               Array.from(formData.entries(), ([key, value]) => [key, value.toString()])
            );

            router.replace(`?${params.toString()}`, { scroll: false });
         }}
      >
         <FormGroup>
            <FormLabel>Rating</FormLabel>
            <FormControl type="text" name="r" placeholder="1500" defaultValue={initRating} />
         </FormGroup>
         <FormGroup>
            <FormLabel>Mode</FormLabel>
            <FormSelect name="m" defaultValue={initMode}>
               <option value="osu">osu!</option>
               <option value="fruits">Catch</option>
               <option value="taiko">Taiko</option>
               <option value="mania">Mania (Any)</option>
               <option value="4k">4k</option>
               <option value="7k">7k</option>
            </FormSelect>
         </FormGroup>
         <FormGroup>
            <FormLabel>Mod Counts</FormLabel>
            <table>
               <tbody>
                  <tr>
                     <td>NM</td>
                     <td>
                        <FormControl type="text" name="nm" placeholder="4" defaultValue={counts.nm} />
                     </td>
                     <td className="px-1" />
                     <td>DT</td>
                     <td>
                        <FormControl type="text" name="dt" placeholder="3" defaultValue={counts.dt} />
                     </td>
                  </tr>
                  <tr>
                     <td>HD</td>
                     <td>
                        <FormControl type="text" name="hd" placeholder="3" defaultValue={counts.hd} />
                     </td>
                     <td />
                     <td>FM</td>
                     <td>
                        <FormControl type="text" name="fm" placeholder="3" defaultValue={counts.fm} />
                     </td>
                  </tr>
                  <tr>
                     <td>HR</td>
                     <td>
                        <FormControl type="text" name="hr" placeholder="3" defaultValue={counts.hr} />
                     </td>
                  </tr>
               </tbody>
            </table>
         </FormGroup>
         <div className="ms-1 d-flex flex-column justify-content-end">
            <Button type="submit">Get Pool</Button>
         </div>
      </Form>
   );
}
