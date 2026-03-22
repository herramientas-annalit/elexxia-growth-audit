import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      if (res.ok) {
        navigate("/dashboard");
      } else {
        setError("Contraseña incorrecta");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080818" }}>
      <div className="w-full max-w-sm p-8 rounded-2xl border" style={{ background: "#0A0A1F", borderColor: "#1A1A3A" }}>
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold" style={{ color: "#F0F0FF" }}>Elexxia Dashboard</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Contraseña de acceso"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full"
              style={{ background: "#0D0D2B", borderColor: "#1A1A3A", color: "#F0F0FF" }}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full font-semibold"
            style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", color: "white" }}
          >
            {loading ? "Accediendo..." : "Acceder al Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}
