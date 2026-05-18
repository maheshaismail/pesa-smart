import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const HIDDEN_ROUTES = ['/auth', '/reset-password', '/advisor'];

const FloatingAdvisor = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (HIDDEN_ROUTES.some(r => pathname.startsWith(r))) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 220, delay: 0.2 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => navigate('/advisor')}
      aria-label="AI Advisor"
      className="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full gradient-primary shadow-elevated flex items-center justify-center text-primary-foreground"
    >
      <span className="absolute inset-0 rounded-full gradient-primary animate-ping opacity-20" />
      <Sparkles size={22} className="relative" />
    </motion.button>
  );
};

export default FloatingAdvisor;
