"use client";

import { serverActionToast } from "@/toaster";
import { Button, Form, FormControl } from "react-bootstrap";
import { invitePlayer } from "./actions";

export default function InvitePlayer({ teamId }: { teamId: string }) {
   return (
      <Form
         className="d-flex gap-1"
         action={formData =>
            serverActionToast(invitePlayer(formData, teamId), {
               pending: "Inviting",
               success: "Invite created"
            })
         }
      >
         <FormControl type="text" name="player" placeholder={"Profile Link or ID"} />
         <Button type="submit">Invite</Button>
      </Form>
   );
}
