import MappoolMaps from "./MappoolMaps";
import MappoolSubmissions from "./MappoolSubmissions";

export default function Mappools() {
   return (
      <div>
         <h3 id="mappools">Mappools</h3>
         <MappoolSubmissions />
         <MappoolMaps />
      </div>
   );
}
