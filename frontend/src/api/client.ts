import axios from "axios";

const api = axios.create({
  baseURL: "http://10.21.178.175:3000/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export default api;
