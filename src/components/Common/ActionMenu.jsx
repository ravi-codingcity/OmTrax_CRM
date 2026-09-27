import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

/**
 * Compact "more actions" (⋮) menu for a table row or card.
 *
 * `actions` is the list of what THIS user may do on THIS row — the caller
 * builds it from the same permission checks it already applies, so nothing is
 * offered here that would not have been offered as a button.
 *
 *   { key, label, icon?, onClick, tone?: 'default'|'primary'|'warning'|'danger',
 *     highlight?: bool,        // marks the trigger so a pending action is noticed
 *     separatorBefore?: bool } // a divider above, e.g. before Delete
 *
 * Opens on hover (devices that can hover) and on click/tap. The menu is rendered
 * into <body> with fixed positioning, so an overflow-hidden/scrolling table
 * cannot clip it; it flips upward near the bottom of the screen and stays inside
 * the viewport horizontally. On a phone it opens as a bottom sheet instead.
 */

const ITEM_HEIGHT = 36;      // h-9 — used to place the menu before it renders
const MENU_WIDTH = 244;
const EDGE = 8;              // keep this far from the viewport edge
const GAP = 6;               // between the trigger and the menu
const ANIMATION_MS = 150;    // matches duration-150 below
const HOVER_OPEN_MS = 70;
const HOVER_CLOSE_MS = 160;

const media = (query) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
const isPhoneViewport = () => media('(max-width: 639px)');
const canHover = () => media('(hover: hover) and (pointer: fine)');

const TONE = {
  default: { item: 'text-gray-700 hover:bg-gray-50 focus:bg-gray-50', icon: 'text-gray-400 group-hover:text-gray-600' },
  primary: { item: 'text-amber-800 hover:bg-amber-50 focus:bg-amber-50', icon: 'text-amber-500 group-hover:text-amber-700' },
  warning: { item: 'text-orange-700 hover:bg-orange-50 focus:bg-orange-50', icon: 'text-orange-500 group-hover:text-orange-700' },
  danger: { item: 'text-red-600 hover:bg-red-50 focus:bg-red-50', icon: 'text-red-400 group-hover:text-red-600' },
};

const DotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <circle cx="10" cy="4" r="1.6" />
    <circle cx="10" cy="10" r="1.6" />
    <circle cx="10" cy="16" r="1.6" />
  </svg>
);

const ActionMenu = ({ actions = [], label = 'More actions', title = '' }) => {
  const [rendered, setRendered] = useState(false);   // in the DOM
  const [shown, setShown] = useState(false);         // animated in
  const [sheet, setSheet] = useState(false);
  const [place, setPlace] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const pinned = useRef(false);                      // opened by click — hover-out keeps it open
  const generation = useRef(0);                      // bumps on every open/close
  const revealed = useRef(0);                        // the generation already revealed
  const timers = useRef({});
  const menuId = useId();

  const clear = (name) => { clearTimeout(timers.current[name]); timers.current[name] = null; };

  const items = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];
  const focusItem = (i) => { const list = items(); if (list.length) list[(i + list.length) % list.length].focus(); };

  // Where the popover goes, worked out from the trigger alone so it can open in
  // the right place on the first frame. Below if it fits, otherwise above;
  // right-aligned to the trigger and clamped inside the viewport.
  const computePlace = () => {
    const r = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const height = actions.length * ITEM_HEIGHT + 8 + actions.filter((a) => a.separatorBefore).length * 9;
    const below = vh - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    const up = below < height && above > below;
    const left = Math.min(Math.max(EDGE, r.right - MENU_WIDTH), vw - MENU_WIDTH - EDGE);
    return {
      up,
      style: {
        position: 'fixed',
        left,
        width: MENU_WIDTH,
        maxHeight: Math.max(120, up ? above : below),
        ...(up ? { bottom: vh - r.top + GAP } : { top: r.bottom + GAP }),
        transformOrigin: up ? 'bottom right' : 'top right',
      },
    };
  };

  const open = ({ pin = false, focusFirst = false } = {}) => {
    clear('close');
    clear('unmount');
    if (pin) pinned.current = true;
    if (rendered && shown) {
      if (focusFirst) focusItem(0);
      return;
    }
    const asSheet = isPhoneViewport();
    setSheet(asSheet);
    if (!asSheet) setPlace(computePlace());
    setRendered(true);
    // Reveal after the "closed" styles have painted, so the transition runs.
    // Normally two animation frames; a short timer covers a page where frames
    // are paused (a background tab) so the menu can never stay invisible.
    // Whichever fires first wins; a close in between cancels both.
    const gen = ++generation.current;
    const reveal = () => {
      if (generation.current !== gen || revealed.current === gen) return;
      revealed.current = gen;
      setShown(true);
      if (focusFirst) focusItem(0);
    };
    requestAnimationFrame(() => requestAnimationFrame(reveal));
    timers.current.reveal = setTimeout(reveal, 40);
  };

  const close = ({ restoreFocus = false } = {}) => {
    generation.current += 1;                         // cancels a pending reveal
    clear('reveal');
    clear('open');
    clear('close');
    pinned.current = false;
    setShown(false);
    clear('unmount');
    timers.current.unmount = setTimeout(() => setRendered(false), ANIMATION_MS);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const scheduleClose = () => {
    if (pinned.current) return;
    clear('close');
    timers.current.close = setTimeout(() => close(), HOVER_CLOSE_MS);
  };

  // While open: close on an outside press, Escape, or scrolling the page — a
  // fixed-position menu would otherwise drift away from its row. A resize
  // re-positions it instead (see onResize).
  useEffect(() => {
    if (!rendered) return undefined;
    // Scroll and some pointer events can target window/document rather than an
    // element; only an element inside the trigger or menu counts as "inside"
    const isNode = (t) => typeof Node !== 'undefined' && t instanceof Node;
    const inside = (t) => isNode(t) && (triggerRef.current?.contains(t) || menuRef.current?.contains(t));
    const inMenu = (t) => isNode(t) && !!menuRef.current?.contains(t);
    const onPointer = (e) => { if (!inside(e.target)) close(); };
    const onScroll = (e) => { if (!sheet && !inMenu(e.target)) close(); };
    // Resizes are frequent on phones and tablets (address bar, keyboard), so
    // the menu is kept: a popover re-attaches to its row, a sheet is unaffected
    const onResize = () => { if (!sheet && triggerRef.current) setPlace(computePlace()); };
    const onKey = (e) => { if (e.key === 'Escape') close({ restoreFocus: true }); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
    };
    // close() only calls setters and refs, which are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, sheet]);

  // Timers must not fire after the row has gone
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  if (!actions.length) return null;

  const highlighted = actions.some((a) => a.highlight);

  const onTriggerClick = (e) => {
    // A keyboard activation (Enter/Space) reports detail 0
    if (shown && pinned.current) close();
    else open({ pin: true, focusFirst: e.detail === 0 });
  };

  const onMenuKeyDown = (e) => {
    const list = items();
    const at = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(at + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(at < 0 ? -1 : at - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
    else if (e.key === 'End') { e.preventDefault(); focusItem(-1); }
    else if (e.key === 'Tab') close();
  };

  const run = (action) => {
    close();
    action.onClick();
  };

  const renderItems = (itemCls) => actions.map((a) => {
    const tone = TONE[a.tone] || TONE.default;
    return (
      <div key={a.key}>
        {a.separatorBefore && <div className="my-1 border-t border-gray-100" role="separator" />}
        <button
          type="button"
          role="menuitem"
          tabIndex={-1}
          onClick={() => run(a)}
          className={`group w-full flex items-center gap-2.5 px-3 text-left font-medium transition-colors duration-100 focus:outline-none ${itemCls} ${tone.item}`}
        >
          {a.icon && (
            <span className={`flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${tone.icon}`} aria-hidden="true">
              {a.icon}
            </span>
          )}
          <span className="truncate">{a.label}</span>
          {a.highlight && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" aria-hidden="true" />}
        </button>
      </div>
    );
  });

  const popover = rendered && !sheet && place && (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={label}
      style={place.style}
      onMouseEnter={() => clear('close')}
      onMouseLeave={scheduleClose}
      onKeyDown={onMenuKeyDown}
      className={`z-[55] py-1 overflow-y-auto bg-white rounded-xl border border-gray-200/80 shadow-xl shadow-gray-900/10 ring-1 ring-black/5
        transition-[opacity,transform] duration-150 ease-out ${
        shown ? 'opacity-100 scale-100 translate-y-0' : `opacity-0 scale-95 ${place.up ? 'translate-y-1' : '-translate-y-1'}`
      }`}
    >
      {renderItems('h-9 text-[13px]')}
    </div>
  );

  const bottomSheet = rendered && sheet && (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-150 ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => close()}
      />
      <div
        className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]
          transition-transform duration-200 ease-out ${shown ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        {title && <p className="px-3 pb-1.5 text-xs font-semibold text-gray-500 truncate">{title}</p>}
        <div ref={menuRef} id={menuId} role="menu" aria-label={label} onKeyDown={onMenuKeyDown}>
          {renderItems('h-12 text-sm rounded-lg')}
        </div>
        <button type="button" onClick={() => close({ restoreFocus: true })}
          className="mt-1.5 w-full h-11 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={shown}
        aria-controls={rendered ? menuId : undefined}
        onClick={onTriggerClick}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); open({ pin: true, focusFirst: true }); } }}
        onMouseEnter={() => {
          if (!canHover()) return;
          clear('close');
          if (!shown) { clear('open'); timers.current.open = setTimeout(() => open(), HOVER_OPEN_MS); }
        }}
        onMouseLeave={() => { clear('open'); if (rendered) scheduleClose(); }}
        className={`relative inline-flex items-center justify-center h-8 w-8 rounded-full transition-all duration-150 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1
          active:scale-90 ${
          shown
            ? 'bg-amber-100 text-amber-800 shadow-inner'
            : 'text-gray-500 hover:bg-amber-50 hover:text-amber-700 hover:scale-110'
        }`}
      >
        <DotsIcon />
        {highlighted && !shown && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden="true" />
        )}
      </button>
      {(popover || bottomSheet) && createPortal(popover || bottomSheet, document.body)}
    </>
  );
};

export default ActionMenu;
