"use client";

import { useEffect, useState } from "react";

const useGamemode = () => {
   const [gamemode, setGamemode] = useState("osu");
   useEffect(() => setGamemode(m => m || localStorage.getItem("game-mode") || "osu"), []);
   useEffect(() => localStorage.setItem("game-mode", gamemode), [gamemode]);
   return { gamemode, setGamemode };
};

export default useGamemode;
