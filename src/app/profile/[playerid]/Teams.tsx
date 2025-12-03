import { Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";

export default async function TeamsCard({ osuid }: { osuid: number }) {
   return (
      <Card>
         <CardHeader>Teams Practice</CardHeader>
         <CardBody>
            <CardTitle>WIP</CardTitle>
            <p>
               Set up team name and members here, and add pools from above. Teams will probably form their own
               collection.
               <br />
               There will then be a link to a team page where all member scores for the given pools are
               displayed as a grid
            </p>
            <p>
               Eventually perhaps tracking scores can be stored in the teams collection. In additon or instead
               of in the player object.
               <br />
               Also consider eventually making teams the default for tournament practice. Then the card above
               can be phased out.
            </p>
         </CardBody>
      </Card>
   );
}
