"use client";

import {
   Button,
   Card,
   CardBody,
   CardTitle,
   Col,
   Form,
   FormControl,
   FormGroup,
   FormLabel,
   Row
} from "react-bootstrap";
import { toast } from "react-toastify";
import { submitPvp } from "./actions";

export default function AddPvPSession() {
   return (
      <Card>
         <CardBody>
            <CardTitle>Submit Match Result</CardTitle>
            <Form
               className="d-flex flex-column gap-2"
               action={formData =>
                  toast.promise(submitPvp(formData), {
                     pending: "Submitting",
                     error: "Failed to update ratings",
                     success: "Match added"
                  })
               }
            >
               <Row>
                  <Col>
                     <FormGroup>
                        <FormLabel>Winner</FormLabel>
                        <FormControl type="text" name="winner" />
                     </FormGroup>
                  </Col>
                  <Col>
                     <FormGroup>
                        <FormLabel>Loser</FormLabel>
                        <FormControl type="text" name="loser" />
                     </FormGroup>
                  </Col>
               </Row>
               <Row>
                  <Col>
                     <FormGroup>
                        <FormLabel>Songs Played</FormLabel>
                        <FormControl
                           as="textarea"
                           rows={7}
                           name="songs"
                           placeholder={"12345+NM\n54321+FM\n..."}
                        />
                     </FormGroup>
                  </Col>
                  <Col>
                     <FormGroup>
                        <FormLabel>Winner Scores</FormLabel>
                        <FormControl
                           as="textarea"
                           rows={7}
                           name="winnerScores"
                           placeholder={"600000\n550000+HD\n..."}
                        />
                     </FormGroup>
                  </Col>
                  <Col>
                     <FormGroup>
                        <FormLabel>Loser Scores</FormLabel>
                        <FormControl
                           as="textarea"
                           rows={7}
                           name="loserScores"
                           placeholder={"550000\n500000+HDHR\n..."}
                        />
                     </FormGroup>
                  </Col>
               </Row>
               <Row>
                  <Col className="d-flex gap-2">
                     <div className="flex-grow-1">
                        <hr />
                     </div>
                     <div>
                        <strong className="align-middle">OR</strong>
                     </div>
                     <div className="flex-grow-1">
                        <hr />
                     </div>
                  </Col>
               </Row>
               <Row>
                  <FormGroup>
                     <FormLabel>MP Link</FormLabel>
                     <FormControl type="text" name="mp" />
                  </FormGroup>
               </Row>
               <Button type="submit">Submit</Button>
            </Form>
         </CardBody>
      </Card>
   );
}
