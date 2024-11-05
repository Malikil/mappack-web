import InfoAndRules from "./rules/InfoAndRules";
import MatchProcedure from "./rules/MatchProcedure";

export default async function Home() {
   return (
      <main>
         <h1>Pick Your Own Pool Tournament</h1>
         <InfoAndRules />
         <MatchProcedure />
         <img
            src="/bracket_preview.svg"
            alt="Double Elimination Bracket Preview"
            width="100%"
            height="auto"
         />
      </main>
   );
}
