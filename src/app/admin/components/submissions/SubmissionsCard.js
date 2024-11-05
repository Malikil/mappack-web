"use client";

import useSubmissionRequirements from "@/hooks/useSubmissionRequirements";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import { saveSubmissionSettings } from "./actions";
import { toast } from "react-toastify";

async function handleSubmit(formData) {
   const data = {
      minStars: parseFloat(formData.get("starsMin")),
      maxStars: parseFloat(formData.get("starsMax")),
      submissionsOpen: !!formData.get("submissionsOpen")
   };
   console.log(data);

   toast.promise(
      saveSubmissionSettings(data).then(res => {
         if (res) return;
         throw new Error();
      }),
      {
         pending: "Updating settings",
         success: "Saved settings",
         error: "Settings didn't update"
      }
   );
}

export default function SubmissionsCard() {
   const { data, isLoading } = useSubmissionRequirements();
   const [minStars, setMinStars] = useState("");
   const [maxStars, setMaxStars] = useState("");
   const [submissionsOpen, setSubmissionsOpen] = useState(false);
   useEffect(() => {
      if (isLoading || !data) return;

      setMinStars(data.maps.stars.min);
      setMaxStars(data.maps.stars.max);
      setSubmissionsOpen(data.submissionsOpen);
   }, [data]);
   return (
      <Card>
         <CardBody className="d-flex flex-column">
            <CardTitle>Submissions</CardTitle>
            <form
               className="d-flex flex-column flex-fill gap-3"
               action={formData => handleSubmit(formData)}
            >
               <div className="form-check form-switch">
                  <input
                     id="submissions_open"
                     name="submissionsOpen"
                     className="form-check-input"
                     type="checkbox"
                     checked={submissionsOpen}
                     onChange={e => setSubmissionsOpen(e.target.checked)}
                  />
                  <label htmlFor="submissions_open" className="form-check-label">
                     Submissions open
                  </label>
               </div>
               <div>
                  <div className="fs-5">Stars</div>
                  <div className="d-flex gap-2">
                     <div>
                        <label htmlFor="minstar" className="form-label">
                           Min
                        </label>
                        <input
                           id="minstar"
                           name="starsMin"
                           className="form-control"
                           type="number"
                           value={minStars}
                           onChange={e => setMinStars(e.target.value)}
                        />
                     </div>
                     <div>
                        <label htmlFor="maxstar" className="form-label">
                           Max
                        </label>
                        <input
                           id="maxstar"
                           name="starsMax"
                           className="form-control"
                           type="number"
                           value={maxStars}
                           onChange={e => setMaxStars(e.target.value)}
                        />
                     </div>
                  </div>
               </div>
               <Button className="mt-auto" type="submit">
                  Save
               </Button>
            </form>
         </CardBody>
      </Card>
   );
}
