const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const baseURL =
  process.env.REACT_APP_BASE_URL ||
  (isLocalhost
    ? `http://${window.location.hostname}:5003/`
    : "https://greedy.imlive.live/");

export const adminBaseURL =
  process.env.REACT_APP_ADMIN_BASE_URL ||
  (isLocalhost
    ? `http://${window.location.hostname}:5003/`
    : "https://control.imlive.live/");

export const key =
  process.env.REACT_APP_KEY || "UatwNkS3mntORhJi5m7AkvE5E7BI6KK8cfTOtASBAg8";

