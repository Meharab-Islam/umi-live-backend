
import { ToastContainer, toast } from "react-toastify";

export const ToastConent = (data,type) => {
    return toast(data, {
      position: "top-right",
      autoClose: 2,
      type:type,
      limit:2,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: 0,
      theme: "dark",
    });
  };
