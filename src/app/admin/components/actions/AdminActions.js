"use client";

import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { debug } from "./actions";
import { serverActionToast } from "@/toaster";

export default function AdminActions() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Actions</CardTitle>
            <div className="d-flex flex-column gap-2">
               <Button
                  onClick={() =>
                     serverActionToast(debug(), {
                        pending: "In progress",
                        success: "Done"
                     })
                  }
               >
                  Debug
               </Button>
            </div>
         </CardBody>
      </Card>
   );
}
