import Image from "next/image";
import AvatarMenu from "./AvatarMenu";

export default function UserAvatar({ src }) {
   return (
      <div className="dropdown">
         <Image
            src={src}
            alt="User Avatar"
            width={64}
            height={64}
            className="rounded-circle"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
         />
         <AvatarMenu />
      </div>
   );
}
