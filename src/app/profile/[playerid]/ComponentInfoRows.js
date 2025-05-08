export default function ComponentInfoRows({ data }) {
   return (
      <table>
         <tbody>
            {data.map((r, i) => (
               <tr key={i}>
                  <td>{r[0]}</td>
                  <td className="ps-2">{r[1]}</td>
               </tr>
            ))}
         </tbody>
      </table>
   );
}
