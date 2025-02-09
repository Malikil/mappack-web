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
import { serverActionToast } from "@/toaster";
import useGamemode from "@/hooks/useGamemode";

export default function CreatePool() {
   const { gamemode } = useGamemode();

   return (
      <Card>
         <CardBody>
            <CardTitle>Add Mappool</CardTitle>
            <Form
               className="d-flex flex-column gap-2"
               action={formData =>
                  serverActionToast(addMappool(formData, gamemode), {
                     pending: "Adding Mappool",
                     success: "Maps added",
                     error: "Failed to add maps"
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
                  <FormLabel>Mapsets</FormLabel>
                  <FormControl as="textarea" rows={10} name="maps" />
               </FormGroup>
               <Button type="submit">Submit</Button>
            </Form>
         </CardBody>
      </Card>
   );
}
