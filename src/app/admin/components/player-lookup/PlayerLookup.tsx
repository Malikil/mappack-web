"use client";

import { Button, Card, CardBody, CardTitle, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { serverActionToast } from "@/toaster";
import { fetchPlayerList } from "./actions";

export default function PlayerLookup() {
   return (
      <Card>
         <CardBody className="d-flex flex-column">
            <CardTitle>Target for players</CardTitle>
            <Form
               className="d-flex flex-column gap-2 flex-fill"
               action={async formData => {
                  const playerListLink = formData.get('ids').toString().split('\n').map(s => s.trim()).filter(s => s);
                  const playerListId = playerListLink
                     .map(l => parseInt(l.slice(l.lastIndexOf("/") + 1)))
                     .filter(v => v)
                     .sort((a, b) => a - b);
                  serverActionToast(fetchPlayerList(playerListId).then(
                     result => navigator.clipboard.writeText(JSON.stringify(result)),
                     (err: Error) => ({
                        http: {
                           status: 500,
                           message: err.message
                        }
                     })
                  ), {
                     pending: `Fetching ${playerListId.length} players`,
                     success: "Data copied to clipboard"
                  });
               }}
            >
               <FormGroup>
                  <FormLabel>User IDs</FormLabel>
                  <FormControl
                     as="textarea"
                     style={{ width: '200px' }}
                     name="ids"
                     placeholder={"osu.ppy.sh/u/12345\n12345\netc..."}
                     rows={6}
                  />
               </FormGroup>
               <div className="mt-auto d-flex justify-content-end gap-1">
                  <Button type="submit">
                     Lookup Players
                  </Button>
               </div>
            </Form>
         </CardBody>
      </Card>
   );
}
