"use client";

import { serverActionToast } from "@/toaster";
import { createPvp } from "./actions";
import { Button, Form } from "react-bootstrap";

export default function CreatePvpStats({ playerid, gamemode }) {
   return (
      <Form
         action={async () => {
            serverActionToast(createPvp(playerid, gamemode), {
               pending: "Creating",
               success: "Success!"
            });
         }}
      >
         <Button type="submit">Create PvP</Button>
      </Form>
   );
}
