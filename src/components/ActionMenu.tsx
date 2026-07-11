import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { createPortal } from 'react-dom';

export const ActionMenu = ({ children, label = 'Open actions' }: { children: ReactNode; label?: string }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, above: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.min(220, window.innerWidth - 24);
    const estimatedHeight = menuRef.current?.offsetHeight ?? 180;
    const above = window.innerHeight - rect.bottom < estimatedHeight + 16 && rect.top > estimatedHeight;
    setPosition({
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
      top: above ? rect.top - 6 : rect.bottom + 6,
      above,
    });
  };

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
      window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [open]);

  return (
    <div className="action-menu">
      <button
        ref={triggerRef}
        className="action-menu-trigger"
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical size={19} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className={`action-menu-panel${position.above ? ' opens-above' : ''}`}
          role="menu"
          style={{ left: position.left, top: position.top }}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('button')) setOpen(false);
          }}
        >
          {children}
        </div>,
        document.body,
      )}
    </div>
  );
};
