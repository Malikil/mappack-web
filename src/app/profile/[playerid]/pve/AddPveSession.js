"use client";

import { Button, Form, FormControl } from "react-bootstrap";
import { submitPve, generateAttack } from "./actions";
import { serverActionToast } from "@/toaster";
import { toast } from "react-toastify";

export default function AddPvESession({ userId }) {
   return (
      <div className="d-flex flex-column align-items-end gap-1 ms-auto">
         <Button
            onClick={() =>
               toast.promise(() => generateAttack(userId), {
                  pending: "Getting random maps",
                  error: "Failed to generate score attack",
                  success: {
                     render({ data }) {
                        return (
                           <div>
                              {data.map((m, i) => (
                                 <div key={i}>{m}</div>
                              ))}
                           </div>
                        );
                     },
                     autoClose: 15000,
                     hideProgressBar: false
                  }
               })
            }
         >
            Generate Score Attack
         </Button>
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
