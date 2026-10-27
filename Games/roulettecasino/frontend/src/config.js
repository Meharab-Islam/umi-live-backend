const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const baseURL =
  process.env.REACT_APP_BASE_URL ||
  (isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:${
        window.location.port ? window.location.port : "3000"
      }/`
    : "https://roulette.imlive.live/");

export const adminBaseURL =
  process.env.REACT_APP_ADMIN_BASE_URL ||
  (isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:${
        window.location.port ? window.location.port : "3000"
      }/`
    : "https://control.imlive.live/");

export const key =
  process.env.REACT_APP_KEY || "UatwNkS3mntORhJi5m7AkvE5E7BI6KK8cfTOtASBAg8";
