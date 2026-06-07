import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const next = new URLSearchParams();
    const q = params.get("q");
    const cat = params.get("category");
    if (q) next.set("q", q);
    if (cat) next.set("category", cat);
    navigate(`/services${next.toString() ? "?" + next.toString() : ""}`, { replace: true });
  }, []);

  return null;
}
