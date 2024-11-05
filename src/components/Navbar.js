import SignIn from "@/components/SignIn";
import Image from "next/image";
import Link from "next/link";
import Container from "react-bootstrap/Container";
import NavbarItems from "./NavbarItems";

export default function Navbar() {
   return (
      <div className="sticky-top w-100 border-bottom bg-body" tabIndex={-1}>
         <nav className="navbar navbar-expand-sm">
            <Container className="d-flex gap-2 align-items-center position-relative">
               <Link className="navbar-brand" href="/">
                  <Image
                     alt="Server Icon"
                     src="/icon.webp"
                     width={64}
                     height={64}
                     className="rounded-circle"
                  />
               </Link>
               <button
                  className="navbar-toggler ms-auto"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#navbarSupportedContent"
                  aria-controls="navbarSupportedContent"
                  aria-expanded="false"
                  aria-label="Toggle navigation"
               >
                  <span className="navbar-toggler-icon" />
               </button>
               <div className="collapse navbar-collapse" id="navbarSupportedContent">
                  <NavbarItems />
               </div>
               <div className="mx-lg-auto" />
               <div className="user-icon-responsive">
                  <SignIn />
               </div>
            </Container>
         </nav>
      </div>
   );
}
