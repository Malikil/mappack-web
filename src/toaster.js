// I couldn't think of what to call the file
// Then I accidentally wrote toaster
// Now this will be the name forever

import { toast } from "react-toastify";

/**
 * @param {Promise} promise
 * @param {import("react-toastify").ToastPromiseParams} actions
 * @param {import("react-toastify").ToastOptions} options
 */
export async function serverActionToast(promise, actions, options = {}) {
   const toastOptions = {
      isLoading: false,
      closeButton: true,
      autoClose: 2500,
      ...options
   };
   const toastId = toast.loading(actions.pending);
   promise.then(
      result => {
         if (!result?.http || ((result.http.status / 100) | 0) === 2)
            toast.update(toastId, {
               render: actions.success,
               type: "success",
               ...toastOptions
            });
         else
            toast.update(toastId, {
               render: result.http.message,
               type: "error",
               ...toastOptions
            });
      },
      err => {
         console.warn(err);
         toast.update(toastId, {
            render: err.message,
            type: "error",
            ...toastOptions
         });
      }
   );
}
