import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function NavbarItems() {
   return (
      <ul className="navbar-nav">
         <li className="nav-item dropdown">
            <a
               className="nav-link dropdown-toggle"
               href="#"
               role="button"
               data-bs-toggle="dropdown"
               aria-expanded="false"
            >
               Links
            </a>
            <ul className="dropdown-menu">
               <li>
                  <Link
                     className="dropdown-item"
                     href="https://docs.google.com/spreadsheets/d/1lBeu0BjLizwDexN9kdB0AJzlqRjLBf0uY0nw8-nr2Ro/edit?usp=sharing"
                     target="_blank"
                     rel="noopener noreferrer"
                  >
                     Pools/Schedule
                  </Link>
               </li>
               <li>
                  <Link
                     className="dropdown-item"
                     href="https://challonge.com/pyop_revival"
                     target="_blank"
                     rel="noopener noreferrer"
                  >
                     Challonge
                  </Link>
               </li>
               <li>
                  <Link
                     className="dropdown-item"
                     href="https://discord.gg/dD4WQme"
                     target="_blank"
                     rel="noopener noreferrer"
                  >
                     Discord
                  </Link>
               </li>
               <li>
                  <Link
                     className="dropdown-item"
                     href="#"
                     target="_blank"
                     rel="noopener noreferrer"
                  >
                     Forum Post
                  </Link>
               </li>
            </ul>
         </li>
         <li className="nav-item">
            <Link className="nav-link" href="/mappool">
               Select Pool
            </Link>
         </li>
         <li className="nav-item d-flex align-items-center">
            <div className="nav-link">
               <ThemeToggle />
            </div>
         </li>
      </ul>
   );
}
