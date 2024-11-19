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
import { serverActionToast } from "@/toaster";
import { submitPve } from "@/app/profile/pve/actions";

export default function AddAttack() {
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
                  <FormLabel>Player ID</FormLabel>
                  <FormControl name="player" type="text" placeholder="12345" />
               </FormGroup>
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
