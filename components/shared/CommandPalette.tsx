'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildPaletteItems,
  type PaletteAction,
  type PaletteGroup,
  type PaletteItem,
} from '../../lib/palette/items';
import type { Site } from '../../lib/schema';
import { useTheme } from './ThemeProvider';

interface CommandPaletteProps {
  site: Site;
}

const GROUP_ORDER: readonly PaletteGroup[] = ['Navigation', 'Projects', 'Contact', 'Theme'];

/**
 * CommandPalette is the keyboard surface for the public site. Cmd/Ctrl+K and
 * the bare `/` key open it; Escape closes it and restores focus to whichever
 * element held it before opening. The list itself is sourced deterministically
 * from buildPaletteItems(site), so the rendered tree is a function of content
 * plus visibility flags and nothing else.
 *
 * The component mounts inside the public layout but renders nothing in the
 * static tree until the user opens it: the cmdk dialog wraps a Radix dialog
 * and only paints when `open` is true. This keeps the public smoke test path
 * unchanged for crawlers and skips palette markup entirely when
 * settings.visibility.commandPalette is false.
 */
export function CommandPalette({ site }: CommandPaletteProps) {
  const router = useRouter();
  const { setMode } = useTheme();
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const items = useMemo(() => buildPaletteItems(site), [site]);
  const grouped = useMemo(() => groupItems(items), [items]);
  const enabled = items.length > 0;

  const openPalette = useCallback(() => {
    if (!enabled) {
      return;
    }
    const active = typeof document === 'undefined' ? null : document.activeElement;
    previouslyFocused.current = active instanceof HTMLElement ? active : null;
    setSearch('');
    setOpen(true);
  }, [enabled]);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  // Restore focus on close. The Dialog primitive will already pull focus back
  // to the trigger when one exists, but the palette has no visible trigger
  // (Cmd+K is invisible), so we rebind to whatever held focus at open time.
  useEffect(() => {
    if (open) {
      return;
    }
    const target = previouslyFocused.current;
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      const isOpenShortcut =
        (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey);
      const isSlashShortcut =
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target);

      if (isOpenShortcut || isSlashShortcut) {
        event.preventDefault();
        setOpen((current) => {
          if (current) {
            return current;
          }
          const active = typeof document === 'undefined' ? null : document.activeElement;
          previouslyFocused.current = active instanceof HTMLElement ? active : null;
          setSearch('');
          return true;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [enabled]);

  const runAction = useCallback(
    (action: PaletteAction) => {
      setOpen(false);
      // The dialog unmount happens after the state flush; queue the side
      // effect on the next tick so focus restoration and route changes do not
      // race the cmdk teardown.
      queueMicrotask(() => {
        if (action.kind === 'scroll') {
          if (typeof window === 'undefined') {
            return;
          }
          const id = action.target.replace(/^#/, '');
          const node = document.getElementById(id);
          if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
            history.replaceState(null, '', action.target);
          }
        } else if (action.kind === 'link') {
          if (action.href.startsWith('/')) {
            router.push(action.href);
          } else if (typeof window !== 'undefined') {
            window.location.href = action.href;
          }
        } else if (action.kind === 'theme') {
          setMode(action.mode);
        }
      });
    },
    [router, setMode],
  );

  if (!enabled) {
    return null;
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          openPalette();
        } else {
          closePalette();
        }
      }}
      label="Command palette"
      shouldFilter
      loop
      overlayClassName="fixed inset-0 z-40 bg-black/50"
      contentClassName="fixed left-1/2 top-[20vh] z-50 w-[min(92vw,560px)] -translate-x-1/2 rounded-lg border border-border bg-bg shadow-xl"
    >
      {/* Visually hidden Dialog.Title satisfies the Radix Dialog a11y contract
        without competing with the input for visual hierarchy. The input
        already exposes its own placeholder; the title is for assistive tech. */}
      <Dialog.Title className="sr-only">Command palette</Dialog.Title>
      <Dialog.Description className="sr-only">
        Type to filter navigation, contact, project, and theme actions. Use arrow keys to move,
        Enter to run, Escape to close.
      </Dialog.Description>
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder="Type a command or search..."
        className="w-full bg-transparent border-b border-border px-md py-sm text-fg-primary outline-none focus-visible:outline-none"
      />
      <Command.List className="max-h-[60vh] overflow-y-auto p-xs">
        <Command.Empty className="px-md py-sm text-fg-muted text-sm">
          No matching commands.
        </Command.Empty>
        {GROUP_ORDER.map((group) => {
          const entries = grouped.get(group);
          if (!entries || entries.length === 0) {
            return null;
          }
          return (
            <Command.Group
              key={group}
              heading={group}
              className="text-fg-muted tracking-eyebrow text-xs uppercase"
            >
              {entries.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${group} ${item.label}`}
                  onSelect={() => runAction(item.action)}
                  className="text-fg-primary px-md py-sm rounded-sm cursor-pointer data-[selected=true]:bg-fg-muted/10 data-[selected=true]:text-accent"
                >
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          );
        })}
      </Command.List>
    </Command.Dialog>
  );
}

function groupItems(items: PaletteItem[]): Map<PaletteGroup, PaletteItem[]> {
  const map = new Map<PaletteGroup, PaletteItem[]>();
  for (const item of items) {
    const bucket = map.get(item.group);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(item.group, [item]);
    }
  }
  return map;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return target.isContentEditable;
}
