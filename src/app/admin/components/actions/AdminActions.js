"use client";

import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { connectBancho } from "./actions";
import { toast } from "react-toastify";

export default function AdminActions() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Bancho Actions</CardTitle>
            <div className="d-flex flex-column gap-2">
               <Button
                  onClick={() =>
                     toast.promise(connectBancho, {
                        pending: "Connecting to Bancho",
                        error: "Failed to connect",
                        success: "Connected!"
                     })
                  }
               >
                  Connect
               </Button>
            </div>
         </CardBody>
      </Card>
   );
}
