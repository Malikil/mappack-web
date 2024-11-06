"use client";

import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { advancePack } from "./actions";
import { toast } from "react-toastify";

export default function AdminActions() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Actions</CardTitle>
            <div className="d-flex flex-column gap-2">
               <Button
                  onClick={() =>
                     toast.promise(advancePack, {
                        pending: "Updating mappack",
                        error: "Failed to update",
                        success: "Updated current mappack"
                     })
                  }
               >
                  Advance Mappack
               </Button>
            </div>
         </CardBody>
      </Card>
   );
}
