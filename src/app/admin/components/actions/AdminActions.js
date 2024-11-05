"use client";

import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { advancePools, clearScreenshots, exportPools } from "./actions";
import { toast } from "react-toastify";
import { useState } from "react";

export default function AdminActions() {
   const [confirmAdvance, setConfirmAdvance] = useState(false);
   return (
      <Card>
         <CardBody>
            <CardTitle>Actions</CardTitle>
            <div className="d-flex flex-column gap-3">
               <Button
                  onClick={() =>
                     toast.promise(clearScreenshots, {
                        pending: "Clearing old screenshots",
                        error: "Failed to clear screenshots",
                        success: "Screenshots cleared"
                     })
                  }
               >
                  Clean Screenshots
               </Button>
               <Button
                  onClick={() =>
                     toast.promise(exportPools, {
                        pending: "Exporting mappools",
                        error: "Failed to export mappools",
                        success: "Export completed"
                     })
                  }
               >
                  Export Mappools
               </Button>
               <Button
                  variant={confirmAdvance ? "warning" : "primary"}
                  onClick={() => {
                     if (confirmAdvance)
                        toast
                           .promise(advancePools, {
                              pending: "Advancing mappools",
                              error: "Failed to advance mappools",
                              success: "Pools advanced"
                           })
                           .then(() => setConfirmAdvance(false));
                     else setConfirmAdvance(true);
                  }}
               >
                  Advance Mappools
               </Button>
            </div>
         </CardBody>
      </Card>
   );
}
