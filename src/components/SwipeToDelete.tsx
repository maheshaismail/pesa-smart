import { useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const THRESHOLD = -80;

const SwipeToDelete = ({ children, onDelete }: { children: ReactNode; onDelete: () => void }) => {
  const x = useMotionValue(0);
  const bg = useTransform(x, [0, THRESHOLD], ['hsl(0 0% 100% / 0)', 'hsl(0 72% 51% / 1)']);
  const iconOpacity = useTransform(x, [0, THRESHOLD / 2, THRESHOLD], [0, 0.5, 1]);
  const [swiping, setSwiping] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setSwiping(false);
    if (info.offset.x < THRESHOLD) {
      onDelete();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete background */}
      <motion.div
        style={{ backgroundColor: bg }}
        className="absolute inset-0 rounded-xl flex items-center justify-end pr-6"
      >
        <motion.div style={{ opacity: iconOpacity }}>
          <Trash2 size={20} className="text-destructive-foreground" />
        </motion.div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: THRESHOLD - 20, right: 0 }}
        dragElastic={0.1}
        onDragStart={() => setSwiping(true)}
        onDragEnd={handleDragEnd}
        className="relative z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeToDelete;
