"use client";

import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { advancePack } from "./actions";
import { serverActionToast } from "@/toaster";

export default function AdminActions() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Actions</CardTitle>
            <div className="d-flex flex-column gap-2">
               <Button
                  onClick={() =>
                     serverActionToast(advancePack(), {
                        pending: "Updating mappack",
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
