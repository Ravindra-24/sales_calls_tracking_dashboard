import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ReceiptText,
  Sparkles,
  X,
} from 'lucide-react';
import { billingPlanName, formatBillingDate } from '../../api/billing';
import type { BillingPlanCode } from '../../types/billing';
import type { BillingAccessMode } from '../../types/billing';

export interface BillingCelebrationData {
  action: 'initial' | 'upgrade' | 'recovery';
  targetPlan: BillingPlanCode;
  previousAccessMode: BillingAccessMode;
  renewalDate?: string | null;
  benefits: string[];
  showPaymentHistory: boolean;
}

interface BillingCelebrationProps {
  celebration: BillingCelebrationData;
  onClose: () => void;
  onOpenDashboard: () => void;
  onViewPaymentHistory: () => void;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  shape: 'rect' | 'circle';
}

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const celebrationTitle = (celebration: BillingCelebrationData) => {
  if (celebration.action === 'recovery' && celebration.previousAccessMode === 'read_only') {
    return 'Welcome back — full access is restored.';
  }
  if (celebration.action === 'recovery') return 'Payment is back on track.';
  if (celebration.action === 'upgrade') return `${billingPlanName(celebration.targetPlan)} is now active.`;
  return `You’re all set — ${billingPlanName(celebration.targetPlan)} is active.`;
};

const startConfetti = (canvas: HTMLCanvasElement) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => undefined;
  const context = canvas.getContext('2d');
  if (!context) return () => undefined;

  const colors = ['#7c3aed', '#4f8cff', '#22d3ee', '#f59e0b', '#ffffff'];
  const particles: ConfettiParticle[] = Array.from({ length: 92 }, (_, index) => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 160,
    y: Math.min(window.innerHeight * 0.42, 360),
    vx: (Math.random() - 0.5) * 11,
    vy: -4 - Math.random() * 8,
    size: 5 + Math.random() * 7,
    rotation: Math.random() * Math.PI,
    rotationSpeed: (Math.random() - 0.5) * 0.24,
    color: colors[index % colors.length],
    shape: index % 4 === 0 ? 'circle' : 'rect',
  }));
  const startedAt = performance.now();
  let frame = 0;

  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * scale);
    canvas.height = Math.floor(window.innerHeight * scale);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(scale, 0, 0, scale, 0, 0);
  };

  const draw = (now: number) => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const fade = Math.max(0, 1 - Math.max(0, now - startedAt - 1300) / 700);
    context.globalAlpha = fade;
    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2;
      particle.vx *= 0.994;
      particle.rotation += particle.rotationSpeed;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      if (particle.shape === 'circle') {
        context.beginPath();
        context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
      }
      context.restore();
    });
    context.globalAlpha = 1;
    if (now - startedAt < 2000) frame = requestAnimationFrame(draw);
    else context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };

  resize();
  window.addEventListener('resize', resize);
  frame = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };
};

export const BillingCelebration = ({
  celebration,
  onClose,
  onOpenDashboard,
  onViewPaymentHistory,
}: BillingCelebrationProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!canvasRef.current) return;
    return startConfetti(canvasRef.current);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="billing-celebration-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <canvas ref={canvasRef} className="billing-confetti-canvas" aria-hidden="true" />
      <div
        ref={dialogRef}
        className="billing-celebration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-celebration-title"
        aria-describedby="billing-celebration-description"
      >
        <button className="billing-celebration-close" type="button" onClick={onClose} aria-label="Close plan activation celebration">
          <X size={19} />
        </button>
        <div className="billing-celebration-orbit" aria-hidden="true">
          <span><Sparkles size={28} /></span>
          <CheckCircle2 size={50} />
        </div>
        <p className="billing-celebration-eyebrow"><Sparkles size={14} /> Plan activated</p>
        <h2 id="billing-celebration-title">{celebrationTitle(celebration)}</h2>
        <p id="billing-celebration-description">
          {celebration.action === 'recovery' && celebration.previousAccessMode === 'full'
            ? 'LeadWatch confirmed the current-period payment while your organization remained available during grace.'
            : 'LeadWatch has confirmed your payment, subscription, and organization access.'}
        </p>

        {celebration.renewalDate && (
          <div className="billing-celebration-renewal">
            <CalendarClock size={18} />
            <span>Next renewal</span>
            <strong>{formatBillingDate(celebration.renewalDate)}</strong>
          </div>
        )}

        <div className="billing-celebration-benefits">
          <span>Now available to your team</span>
          <ul>
            {celebration.benefits.map((benefit) => <li key={benefit}><Check size={15} /> {benefit}</li>)}
          </ul>
        </div>

        <div className="billing-celebration-actions">
          <button className="btn-primary" type="button" onClick={onOpenDashboard}>
            Open dashboard <ArrowRight size={16} />
          </button>
          {celebration.showPaymentHistory && (
            <button className="secondary-button" type="button" onClick={onViewPaymentHistory}>
              <ReceiptText size={16} /> View payment history
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
