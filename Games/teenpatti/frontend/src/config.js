const isDirectPort = typeof window !== "undefined" && window.location.port === "5067";

export const baseURL = typeof window !== "undefined"
  ? (isDirectPort ? `${window.location.protocol}//${window.location.hostname}:5067/` : window.location.origin)
  : "http://localhost:5067/";

export const socketPath = typeof window !== "undefined"
  ? (isDirectPort ? "/socket.io/" : "/games/socket/teenpatti/")
  : "/socket.io/";

export const adminBaseURL = typeof window !== "undefined"
  ? (isDirectPort ? `${window.location.protocol}//${window.location.hostname}:5067/` : `${window.location.origin}/games/api/teenpatti/`)
  : "http://localhost:5067/";

export const key =
  process.env.REACT_APP_KEY || "UatwNkS3mntORhJi5m7AkvE5E7BI6KK8cfTOtASBAg8";

