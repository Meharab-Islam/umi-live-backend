const isDirectPort = typeof window !== "undefined" && window.location.port === "5065";

export const baseURL = typeof window !== "undefined"
  ? (isDirectPort ? `${window.location.protocol}//${window.location.hostname}:5065/` : window.location.origin)
  : "http://localhost:5065/";

export const socketPath = typeof window !== "undefined"
  ? (isDirectPort ? "/socket.io/" : "/games/socket/greedylion/")
  : "/socket.io/";

export const adminBaseURL = typeof window !== "undefined"
  ? (isDirectPort ? `${window.location.protocol}//${window.location.hostname}:5065/` : `${window.location.origin}/games/api/greedylion/`)
  : "http://localhost:5065/";

export const key =
  process.env.REACT_APP_KEY || "UatwNkS3mntORhJi5m7AkvE5E7BI6KK8cfTOtASBAg8";
