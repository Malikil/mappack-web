"use client";

import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { toast } from "react-toastify";
import { addPlayer } from "./actions";

async function handleSubmit(formData) {
   const data = Object.fromEntries(formData);
   data.osuId = parseInt(data.osuId);
   console.log(data);

   toast.promise(
      addPlayer(data).then(res => {
         if (res) return;
         throw new Error();
      }),
      {
         pending: "Adding registration",
         success: "Added",
         error: "Player already exists"
      }
   );
}

export default function RegisterCard() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Registration</CardTitle>
            <form className="d-flex flex-column gap-3" action={formData => handleSubmit(formData)}>
               <div>
                  <label htmlFor="osuid" className="form-label">
                     osu! ID
                  </label>
                  <input id="osuid" name="osuId" className="form-control" type="text" />
               </div>
               <div>
                  <label htmlFor="discordid" className="form-label">
                     Discord ID
                  </label>
                  <input id="discordid" name="discordId" className="form-control" type="text" />
               </div>
               <Button type="submit">Register</Button>
            </form>
         </CardBody>
      </Card>
   );
}
