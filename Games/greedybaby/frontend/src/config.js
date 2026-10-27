const isDirectPort = typeof window !== "undefined" && window.location.port === "5064";

export const baseURL = typeof window !== "undefined"
  ? (isDirectPort ? `${window.location.protocol}//${window.location.hostname}:5064/` : window.location.origin)
  : "http://localhost:5064/";

export const socketPath = typeof window !== "undefined"
  ? (isDirectPort ? "/socket.io/" : "/games/socket/greedybaby/")
  : "/socket.io/";

export const adminBaseURL = typeof window !== "undefined"
  ? (isDirectPort ? `${window.location.protocol}//${window.location.hostname}:5064/` : `${window.location.origin}/games/api/greedybaby/`)
  : "http://localhost:5064/";

export const key =
  process.env.REACT_APP_KEY || "UatwNkS3mntORhJi5m7AkvE5E7BI6KK8cfTOtASBAg8";
