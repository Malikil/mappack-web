"use client";

import { Button, Card, CardBody, CardTitle, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { serverActionToast } from "@/toaster";
import { submitTournamentStage } from "./actions";

export default function TournamentSubmit() {
   return (
      <Card>
         <CardBody className="d-flex flex-column">
            <CardTitle>Multi-Submit MP Links</CardTitle>
            <Form
               className="d-flex flex-column gap-2 flex-fill"
               action={async formData => {
                  serverActionToast(submitTournamentStage(formData), {
                     pending: "Submitting",
                     success: "Stage submitted"
                  });
               }}
            >
               <FormGroup>
                  <FormLabel>Multiplayer ID</FormLabel>
                  <FormControl
                     as="textarea"
                     name="mp"
                     placeholder={"osu.ppy.sh/mp/12345\n12345\netc..."}
                     rows={6}
                  />
               </FormGroup>
               <div className="mt-auto d-flex justify-content-end gap-1">
                  <Button type="submit" name="submitType" value="pve">
                     Submit PvE
                  </Button>
                  <Button type="submit" name="submitType" value="pvp">
                     Submit PvP
                  </Button>
               </div>
            </Form>
         </CardBody>
      </Card>
   );
}
