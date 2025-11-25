"use client";

import { Button, Form, FormControl } from "react-bootstrap";
import { submitPve } from "./actions";
import { serverActionToast } from "@/toaster";

export default function AddPvESession() {
   return (
      <div className="d-flex flex-column align-items-end gap-1 ms-auto">
         <Form
            className="d-flex gap-1"
            action={async formData => {
               serverActionToast(submitPve(formData), {
                  pending: "Submitting",
                  success: "Results submitted"
               });
            }}
         >
            <FormControl type="text" name="mp" placeholder={"MP Link"} />
            <Button type="submit">Submit</Button>
         </Form>
      </div>
   );
}
