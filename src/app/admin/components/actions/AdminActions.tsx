"use client";

import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { debug } from "./actions";
import { serverActionToast } from "@/toaster";
import { useState } from "react";

export default function AdminActions() {
   const [output, setOutput] = useState("Output here");
   return (
      <Card>
         <CardBody>
            <CardTitle>Actions</CardTitle>
            <div className="d-flex flex-column gap-2">
               <Button
                  onClick={() =>
                     serverActionToast(
                        debug().then(res => setOutput(res)),
                        {
                           pending: "In progress",
                           success: "Done"
                        }
                     )
                  }
               >
                  Debug
               </Button>
               <pre>{output}</pre>
            </div>
         </CardBody>
      </Card>
   );
}
