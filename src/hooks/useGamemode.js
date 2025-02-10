"use client";

import { useEffect, useState } from "react";

const useGamemode = () => {
   const [gamemode, setGamemode] = useState();
   useEffect(() => setGamemode(m => m || localStorage.getItem("game-mode") || "osu"), []);
   useEffect(() => {
      if (gamemode) localStorage.setItem("game-mode", gamemode);
   }, [gamemode]);
   return { gamemode, setGamemode };
};

export default useGamemode;
