"use client";

import { Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { generateAttack } from "./actions";

export default function AttackButton({ userId }) {
   return (
      <Button
         onClick={() =>
            toast.promise(() => generateAttack(userId), {
               pending: "Getting random maps",
               error: "Failed to generate score attack",
               success: {
                  render({ data }) {
                     return (
                        <div>
                           {data.map((m, i) => (
                              <div key={i}>{m}</div>
                           ))}
                        </div>
                     );
                  },
                  autoClose: 20000,
                  hideProgressBar: false
               }
            })
         }
      >
         Generate Score Attack
      </Button>
   );
}
