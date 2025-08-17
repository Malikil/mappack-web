"use client";

import { Button, Card, CardBody, CardTitle, Form, FormControl } from "react-bootstrap";
import { adminPve, adminPvp } from "./actions";
import { serverActionToast } from "@/toaster";

export default function AddPvPSession() {
   return (
      <Card>
         <CardBody className="d-flex flex-column gap-1">
            <CardTitle>Add MP Links</CardTitle>
            <Form
               className="d-flex gap-1"
               action={async formData => {
                  serverActionToast(adminPve(formData), {
                     pending: "Submitting",
                     success: "Results submitted"
                  });
               }}
            >
               <FormControl type="text" name="mp" placeholder={"PvE Link"} />
               <Button type="submit">Submit</Button>
            </Form>
            <Form
               className="d-flex gap-1"
               action={async formData => {
                  serverActionToast(adminPvp(formData), {
                     pending: "Submitting",
                     success: "Results submitted"
                  });
               }}
            >
               <FormControl type="text" name="mp" placeholder="PvP Link" />
               <FormControl type="text" name="warmup" placeholder="Warmups" />
               <Button className="text-nowrap" type="submit">
                  Submit
               </Button>
            </Form>
         </CardBody>
      </Card>
   );
}
