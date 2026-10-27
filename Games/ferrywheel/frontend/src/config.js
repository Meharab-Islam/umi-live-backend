const isDirectPort = typeof window !== "undefined" && window.location.port === "5063";

export const baseURL = typeof window !== "undefined"
  ? (isDirectPort ? `${window.location.protocol}//${window.location.hostname}:5063/` : window.location.origin)
  : "http://localhost:5063/";

export const socketPath = typeof window !== "undefined"
  ? (isDirectPort ? "/socket.io/" : "/games/socket/ferrywheel/")
  : "/socket.io/";

export const adminBaseURL = typeof window !== "undefined"
  ? (isDirectPort ? `${window.location.protocol}//${window.location.hostname}:5063/` : `${window.location.origin}/games/api/ferrywheel/`)
  : "http://localhost:5063/";

export const key =
  process.env.REACT_APP_KEY || "UatwNkS3mntORhJi5m7AkvE5E7BI6KK8cfTOtASBAg8";

