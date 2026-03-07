import { motion } from "framer-motion";

export default function TankGauge({ currentGallons, maxGallons = 1500 }) {
  const percentage = Math.min((currentGallons / maxGallons) * 100, 100);
  const isLow = percentage < 20;
  const isMedium = percentage >= 20 && percentage < 50;

  const getColor = () => {
    if (isLow) return "from-red-500 to-red-600";
    if (isMedium) return "from-amber-400 to-amber-500";
    return "from-emerald-400 to-emerald-500";
  };

  return (
    <div className="relative w-full max-w-xs mx-auto">
      <div className="relative h-64 w-32 mx-auto bg-slate-100 rounded-b-3xl rounded-t-lg border-4 border-slate-300 overflow-hidden shadow-inner">
        {/* Tank cap */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-slate-400 rounded-t-lg border-2 border-slate-500" />
        
        {/* Fuel level */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getColor()} rounded-b-2xl`}
        >
          {/* Animated waves */}
          <div className="absolute top-0 left-0 right-0 h-3 overflow-hidden">
            <motion.div
              animate={{ x: [0, -20, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 opacity-30"
              style={{
                background: "repeating-linear-gradient(90deg, transparent, transparent 10px, white 10px, white 20px)"
              }}
            />
          </div>
        </motion.div>

        {/* Level markers */}
        <div className="absolute inset-y-0 right-2 flex flex-col justify-between py-4 text-[10px] text-slate-400 font-medium">
          <span>F</span>
          <span>¾</span>
          <span>½</span>
          <span>¼</span>
          <span>E</span>
        </div>
      </div>

      {/* Display value */}
      <div className="mt-6 text-center">
        <motion.div
          key={currentGallons}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold text-slate-800"
        >
          {currentGallons?.toLocaleString() || 0}
        </motion.div>
        <div className="text-sm text-slate-500 mt-1">gallons available</div>
      </div>
    </div>
  );
}