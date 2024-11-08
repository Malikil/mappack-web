"use client";

import {
   Button,
   Card,
   CardBody,
   CardTitle,
   Form,
   FormControl,
   FormGroup,
   FormLabel
} from "react-bootstrap";
import { toast } from "react-toastify";
import { submitPve } from "./actions";

export default function AddPvESession() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Submit Score Attack</CardTitle>
            <Form
               className="d-flex flex-column gap-2"
               action={formData =>
                  toast.promise(submitPve(formData), {
                     pending: "Submitting",
                     error: "Failed to update ratings",
                     success: "Session added"
                  })
               }
            >
               <FormGroup>
                  <FormLabel>Song Results</FormLabel>
                  <FormControl
                     as="textarea"
                     rows={7}
                     name="history"
                     placeholder={"12345+NM 600000\n54321+HD 550000\n..."}
                  />
               </FormGroup>
               <Button type="submit">Submit</Button>
            </Form>
         </CardBody>
      </Card>
   );
}
