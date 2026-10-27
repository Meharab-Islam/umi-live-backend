import { toast } from "react-toastify";

const Toast = (data) => {
  return toast(data, {
    position: "bottom-center",
    autoClose: 2,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: 0,
    theme: "light",
  });
};

export default Toast;
