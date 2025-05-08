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
import addCustomMap from "./actions";

export default function CustomPool() {
   return (
      <Card>
         <CardBody className="d-flex flex-column">
            <CardTitle>Add Map Manually</CardTitle>
            <Form
               className="d-flex flex-column gap-2 flex-fill"
               action={async formData => {
                  serverActionToast(addCustomMap(formData), {
                     pending: "Submitting",
                     success: "Mapset added"
                  });
               }}
            >
               <FormGroup>
                  <FormLabel>Mapset ID</FormLabel>
                  <FormControl name="setid" type="text" placeholder="12345" />
               </FormGroup>
               <Button type="submit" className="mt-auto">
                  Submit
               </Button>
            </Form>
         </CardBody>
      </Card>
   );
}
