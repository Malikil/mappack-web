import InfoAndRules from "./rules/InfoAndRules";

export default async function Home() {
   return (
      <main>
         <h1>Info and Rules</h1>
         <InfoAndRules />
         <hr />
         <h5>Links</h5>
         <ul>
            <li>
               <a href="https://github.com/Malikil/mappack-web">Github</a>
            </li>
         </ul>
      </main>
   );
}
