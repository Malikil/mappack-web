"use client";

import { Card, CardBody, CardHeader, Row, Col, FormControl } from "react-bootstrap";

export default function SetupCommands() {
   return (
      <Card>
         <CardHeader>Setup Commands</CardHeader>
         <CardBody>
            <Row className="align-items-center">
               <Col>Create match</Col>
               <Col>
                  <FormControl
                     type="text"
                     value="!mp make "
                     readOnly
                     role="button"
                     onClick={e => navigator.clipboard.writeText(e.target.value)}
                  />
               </Col>
            </Row>
         </CardBody>
      </Card>
   );
}
