"use client";

import useSWR from "swr";
import fetcher from "@/fetcher";

const usePlayer = () => {
   const { data, error, isLoading } = useSWR("/api/db/player", fetcher);

   return {
      data,
      isLoading,
      isError: error
   };
};
export default usePlayer;
