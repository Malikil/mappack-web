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
import { submitPve } from "./actions";
import { serverActionToast } from "@/toaster";

export default function AddPvESession() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Submit Score Attack</CardTitle>
            <Form
               className="d-flex flex-column gap-2"
               action={async formData => {
                  serverActionToast(submitPve(formData), {
                     pending: "Submitting",
                     success: "Session added"
                  });
               }}
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
