
import { ToastContainer, toast } from "react-toastify";

export const ToastConent = (data) => {
    return toast(data, {
      position: "top-right",
      type:"error",
      limit:1,
      autoClose: 1000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: 0,
      theme: "light",
    });
  };
