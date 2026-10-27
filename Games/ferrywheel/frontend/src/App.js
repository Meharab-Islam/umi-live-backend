import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import io from "socket.io-client";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./assets/css/responsive.scss";
import "./assets/css/styles.scss";
import WheelContent from "./Wheel/WheelContent";
import { adminBaseURL, baseURL, key } from "./config";



const queryParams = new URLSearchParams(window.location.search);
const userId = queryParams.get("id") || "6579c2980cb6184131234567";
axios.defaults.headers.common["key"] = key;

const coinNumbe = [100, 200, 300, 400, 500];
function App() {
  const socketRef = useRef();
  const [userData, setUserData] = useState();
  const [settingData, setSettingData] = useState();
  const [gameCoin, setGameCoin] = useState(coinNumbe);

  useEffect(() => {
    if (userId) {
      const socket = io.connect(baseURL, {
        transports: ["websocket", "polling", "flashsocket"],
        query: { globalRoom: userId },
      });
      socketRef.current = socket;
      socketRef.current.on("connect", () => {
        if (socket.connected === true) {
          setTimeout(() => {
            socket.emit("startGame", {});
            socket.on("start", (data) => {
              setUserData(data);
            });
          }, 1000);
        }
      });
      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [userId]);

  useEffect(() => {
    socketRef.current?.on("user", (user) => {
      if (user && Object?.values(user)?.length > 0) {
        setUserData(user);
      }
    });
  }, [socketRef?.current]);

  useEffect(() => {
    axios
      .get(`${adminBaseURL + "setting"}`)
      .then((res) => {
        setSettingData(res?.data?.setting);
        if (res?.data?.setting?.gameCoin) {
          setGameCoin(res?.data?.setting?.gameCoin);
        }
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="game-page">
      <WheelContent userData={userData} socket={socketRef.current} settingData={settingData} gameCoin={gameCoin} />
      <ToastContainer />
    </div>
  );
}

export default App;
