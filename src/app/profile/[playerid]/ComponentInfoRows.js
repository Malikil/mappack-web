export default function ComponentInfoRows({ data }) {
   return (
      <table>
         <tbody>
            {data.map((r, i) => (
               <tr key={i}>
                  {r.filter(v => v || v === 0).map((c, i) => (
                     <td key={i} className={i === 0 ? undefined : "ps-2"}>
                        {c}
                     </td>
                  ))}
               </tr>
            ))}
         </tbody>
      </table>
   );
}
