const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
const serverParam = urlParams ? urlParams.get("server") : null;
const isDirectPort = typeof window !== "undefined" && window.location.port === "5066";
const isBackendPort = typeof window !== "undefined" && window.location.port === "5050";

export const baseURL = typeof window !== "undefined"
  ? (serverParam || (isDirectPort || isBackendPort ? `${window.location.protocol}//${window.location.hostname}:5066/` : window.location.origin))
  : "http://localhost:5066/";

export const socketPath = typeof window !== "undefined"
  ? (serverParam || isDirectPort || isBackendPort ? "/socket.io/" : "/games/socket/roulettecasino/")
  : "/socket.io/";

export const adminBaseURL = typeof window !== "undefined"
  ? (serverParam ? `${serverParam.replace(/\/+$/, '')}/` : (isDirectPort || isBackendPort ? `${window.location.protocol}//${window.location.hostname}:5066/` : `${window.location.origin}/games/api/roulettecasino/`))
  : "http://localhost:5066/";

export const key =
  process.env.REACT_APP_KEY || "UatwNkS3mntORhJi5m7AkvE5E7BI6KK8cfTOtASBAg8";
