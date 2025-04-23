"use client";

import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { databaseDebug } from "./actions";
import { serverActionToast } from "@/toaster";

export default function AdminActions() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Actions</CardTitle>
            <div className="d-flex flex-column gap-2">
               <Button
                  onClick={() =>
                     serverActionToast(databaseDebug(), {
                        pending: "In progress",
                        success: "Done"
                     })
                  }
               >
                  Database Debug
               </Button>
            </div>
         </CardBody>
      </Card>
   );
}
