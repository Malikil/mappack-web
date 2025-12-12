"use client";

import { serverActionToast } from "@/toaster";
import { useState } from "react";
import { Form, FormControl, FormSelect } from "react-bootstrap";
import { CheckSquareFill, PencilSquare, XSquareFill } from "react-bootstrap-icons";
import { updateTeam } from "./actions";
import { GameMode } from "osu-web.js";

export default function TeamName({
   teamId,
   data
}: {
   teamId: string;
   data: { name: string; mode: GameMode };
}) {
   const [editing, setEditing] = useState(false);
   const [teamName, setTeamName] = useState(data.name);
   const [mode, setMode] = useState(data.mode);

   return editing ? (
      <div className="d-flex">
         <Form className="d-flex flex-column gap-2">
            <div className="d-flex gap-3 align-items-center">
               <FormControl value={teamName} onChange={e => setTeamName(e.target.value)} />
               <CheckSquareFill
                  className="text-success"
                  size={20}
                  role="button"
                  onClick={() =>
                     serverActionToast(updateTeam(teamId, { teamName, gameMode: mode }), {}).then(() =>
                        setEditing(false)
                     )
                  }
               />
               <XSquareFill
                  className="text-danger"
                  size={20}
                  role="button"
                  onClick={() => {
                     setEditing(false);
                     setTeamName(data.name);
                  }}
               />
            </div>
            <div className="d-flex gap-2">
               <FormSelect value={mode} onChange={e => setMode(e.target.value as GameMode)}>
                  <option value={"osu" as GameMode}>osu!</option>
                  <option value={"fruits" as GameMode}>Catch</option>
                  <option value={"taiko" as GameMode}>Taiko</option>
                  <option value={"mania" as GameMode}>Mania</option>
               </FormSelect>
            </div>
         </Form>
      </div>
   ) : (
      <div>
         <span>{teamName}</span>
         <PencilSquare className="ms-3 text-muted" size={18} role="button" onClick={() => setEditing(true)} />
      </div>
   );
}
