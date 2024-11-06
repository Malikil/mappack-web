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
import { addMappool } from "./actions";
import { toast } from "react-toastify";

export default function CreatePool() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Add Mappool</CardTitle>
            <Form
               className="d-flex flex-column gap-2"
               action={formData =>
                  toast.promise(addMappool(formData), {
                     pending: "Adding Mappool",
                     error: "Failed to add mappool",
                     success: "Maps added"
                  })
               }
            >
               <FormGroup>
                  <FormLabel>Pack Name</FormLabel>
                  <FormControl type="text" name="packName" />
               </FormGroup>
               <FormGroup>
                  <FormLabel>Download Link</FormLabel>
                  <FormControl type="text" name="download" />
               </FormGroup>
               <FormGroup>
                  <FormLabel>Maps</FormLabel>
                  <FormControl as="textarea" rows={10} name="maps" />
               </FormGroup>
               <Button type="submit">Submit</Button>
            </Form>
         </CardBody>
      </Card>
   );
}
