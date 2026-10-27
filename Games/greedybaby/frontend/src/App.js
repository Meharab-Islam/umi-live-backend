import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import io from "socket.io-client";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./assets/css/responsive.scss";
import "./assets/css/styles.scss";
import WheelContent from "./Wheel/WheelContent";
import { adminBaseURL, baseURL, socketPath, key } from "./config";



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
      console.log("App.js - Initializing socket with userId:", userId);
      const socket = io.connect(baseURL, {
        path: socketPath,
        transports: ["websocket", "polling", "flashsocket"],
        query: { globalRoom: userId },
      });
      socketRef.current = socket;

      // Debug: Listen to all events
      socket.onAny((event, ...args) => {
        console.log(`App.js - Incoming event: ${event}`, args);
      });

      socketRef.current.on("connect", () => {
        console.log("App.js - Socket connected:", socket.connected);
        if (socket.connected === true) {
          // Register 'start' listener BEFORE emitting
          socket.on("start", (data) => {
            console.log("App.js - Received 'start' event with data:", data);
            setUserData(data);
          });

          setTimeout(() => {
            console.log("App.js - Emitting 'startGame'");
            socket.emit("startGame", {});
          }, 1000);
        }
      });
      socketRef.current.on("connect_error", (err) => {
        console.error("App.js - Socket connect_error:", err);
      });
      return () => {
        console.log("App.js - Disconnecting socket");
        socketRef.current.disconnect();
      };
    }
  }, [userId]);

  useEffect(() => {
    socketRef.current?.on("user", (user) => {
      console.log("App.js - Received 'user' event:", user);
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

  console.log("App.js - userId:", userId);
  console.log("App.js - userData:", userData);
  console.log("App.js - settingData:", settingData);
  console.log("App.js - gameCoin:", gameCoin);

  return (
    <div className="game-page">
      <WheelContent userData={userData} socket={socketRef.current} settingData={settingData} gameCoin={gameCoin} />
      <ToastContainer />
    </div>
  );
}

export default App;
