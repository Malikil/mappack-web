"use client";

import { serverActionToast } from "@/toaster";
import { Button, Form, FormControl } from "react-bootstrap";
import { addOpponent } from "./actions";

export default function AddOpponent({ teamId }: { teamId: string }) {
   return (
      <Form
         className="d-flex gap-1"
         action={formData =>
            serverActionToast(addOpponent(formData, teamId), {
               pending: "Adding",
               success: "Added"
            })
         }
      >
         <FormControl type="text" name="player" placeholder={"Profile Link or ID"} />
         <Button type="submit">Add</Button>
      </Form>
   );
}
