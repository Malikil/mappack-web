"use client";

import { serverActionToast } from "@/toaster";
import { useState } from "react";
import { Form, FormControl } from "react-bootstrap";
import { CheckSquareFill, PencilSquare, XSquareFill } from "react-bootstrap-icons";
import { updateTeamName } from "./actions";

export default function TeamName({ teamId, name }: { teamId: string; name: string }) {
   const [editing, setEditing] = useState(false);
   const [teamName, setTeamName] = useState(name);

   return editing ? (
      <div className="d-flex">
         <Form className="d-flex gap-3 align-items-center">
            <FormControl value={teamName} onChange={e => setTeamName(e.target.value)} />
            <CheckSquareFill
               className="text-success"
               size={20}
               role="button"
               onClick={() =>
                  serverActionToast(updateTeamName(teamName, teamId), {}).then(() => setEditing(false))
               }
            />
            <XSquareFill
               className="text-danger"
               size={20}
               role="button"
               onClick={() => {
                  setEditing(false);
                  setTeamName(name);
               }}
            />
         </Form>
      </div>
   ) : (
      <div>
         <span>{teamName}</span>
         <PencilSquare className="ms-3 text-muted" size={18} role="button" onClick={() => setEditing(true)} />
      </div>
   );
}
