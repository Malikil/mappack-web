"use client";

import { Button, Form, FormControl } from "react-bootstrap";
import { getOpponentMappool, submitPvp } from "./actions";
import { serverActionToast } from "@/toaster";

export default function AddPvPSession({
   playerid,
   allowSubmit
}: {
   playerid: number;
   allowSubmit?: boolean;
}) {
   return (
      <div className="d-flex flex-column align-items-end gap-1 ms-auto">
         <Form action={formData => getOpponentMappool(playerid, formData)} className="d-flex gap-1 mb-auto">
            <FormControl type="text" name="opponent" placeholder="Opponent" />
            <Button className="text-nowrap" type="submit">
               Preview Pool
            </Button>
         </Form>
         {allowSubmit && (
            <Form
               className="d-flex gap-1"
               action={async formData => {
                  serverActionToast(submitPvp(formData), {
                     pending: "Submitting",
                     success: "Results submitted"
                  });
               }}
            >
               <FormControl type="text" name="mp" placeholder={"MP Link"} />
               <Button className="text-nowrap" type="submit">
                  Submit external match
               </Button>
            </Form>
         )}
      </div>
   );
}
