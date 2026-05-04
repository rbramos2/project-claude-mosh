import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

function HealthCheck() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return <div>Server status: {status ?? "loading..."}</div>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HealthCheck />} />
      <Route path="*" element={<div>404 — Not Found</div>} />
    </Routes>
  );
}
