"use client";

import {
   Button,
   Card,
   CardBody,
   CardTitle,
   Form,
   FormControl,
   FormGroup,
   FormLabel
} from "react-bootstrap";
import { toast } from "react-toastify";
import { submitPve } from "./actions";
import { serverActionToast } from "@/toaster";

export default function AddPvESession() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Submit Score Attack</CardTitle>
            <Form
               className="d-flex flex-column gap-2"
               action={async formData => {
                  serverActionToast(submitPve(formData), {
                     pending: "Submitting",
                     success: "Session added"
                  });
                  // const toastId = toast.loading("Submitting");
                  // try {
                  //    const result = await submitPve(formData);
                  //    if (!result.status || result.status === 200)
                  //       return toast.update(toastId, {
                  //          render: "Session added",
                  //          type: "success",
                  //          isLoading: false,
                  //          closeButton: true,
                  //          autoClose: 3000
                  //       });
                  //    toast.update(toastId, {
                  //       render: result.message,
                  //       type: "error",
                  //       isLoading: false,
                  //       closeButton: true,
                  //       autoClose: 3000
                  //    });
                  // } catch (err) {
                  //    console.warn(err);
                  //    toast.update(toastId, {
                  //       render: "Unknown error",
                  //       type: "error",
                  //       isLoading: false,
                  //       closeButton: true,
                  //       autoClose: 3000
                  //    });
                  // }
               }}
            >
               <FormGroup>
                  <FormLabel>Song Results</FormLabel>
                  <FormControl
                     as="textarea"
                     rows={7}
                     name="history"
                     placeholder={"12345+NM 600000\n54321+HD 550000\n..."}
                  />
               </FormGroup>
               {/* <FormGroup>
                  <FormLabel>
                     <strong className="text-decoration-underline">OR</strong> - MP Link
                  </FormLabel>
                  <FormControl type="text" name="mp" />
               </FormGroup> */}
               <Button type="submit">Submit</Button>
            </Form>
         </CardBody>
      </Card>
   );
}
