"use client";

import { useRouter } from "next/navigation";
import { GameMode } from "osu-web.js";
import { Button, Form, FormControl, FormGroup, FormLabel, FormSelect } from "react-bootstrap";

export default function TargetSelector({ initRating, initMode }: { initRating: number, initMode: GameMode | "4k" | "7k" }) {
   const router = useRouter();

   return (
      <Form className="d-flex gap-1" onSubmit={e => {
         e.preventDefault();
         const formData = new FormData(e.currentTarget);
         const rating = formData.get('rating') as string;
         const mode = formData.get('mode') as string;

         const params = new URLSearchParams();
         if (rating) params.set('r', rating);
         if (mode) params.set('m', mode);

         router.replace(`?${params.toString()}`, { scroll: false });
      }}>
         <FormGroup>
            <FormLabel>Rating</FormLabel>
            <FormControl type="text" name="rating" placeholder="1500" defaultValue={initRating} />
         </FormGroup>
         <FormGroup>
            <FormLabel>Mode</FormLabel>
            <FormSelect name="mode" defaultValue={initMode}>
               <option value='osu'>osu!</option>
               <option value='fruits'>Catch</option>
               <option value='taiko'>Taiko</option>
               <option value='mania'>Mania (Any)</option>
               <option value='4k'>4k</option>
               <option value='7k'>7k</option>
            </FormSelect>
         </FormGroup>
         <div className="ms-1 d-flex flex-column justify-content-end">
         <Button type="submit">Get Pool</Button></div>
      </Form>
   );
}
