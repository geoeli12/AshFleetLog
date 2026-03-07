import { useNavigate } from "react-router-dom";

export default function PageNotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
          <div className="text-3xl font-bold text-slate-800 mb-2">Page not found</div>
          <div className="text-slate-600 mb-6">
            The page you&apos;re looking for doesn&apos;t exist or was moved.
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full h-11 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
