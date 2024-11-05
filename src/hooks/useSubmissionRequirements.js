"use client";

import useSWR from "swr";
import fetcher from "@/fetcher";

const useSubmissionRequirements = () => {
   const { data, error, isLoading } = useSWR("/api/db/maps/requirements", fetcher);

   return {
      data,
      isLoading,
      isError: error
   };
};
export default useSubmissionRequirements;
