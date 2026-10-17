import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Check, LoaderCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
type DraftController = {
  commit: () => Promise<boolean>;
  discard: () => void;
  read: () => { label: string; draft: string; error: string; saving: boolean };
};
type RegisteredDraft = DraftController & { attached: boolean };
const Context = createContext<{
  register: (id: string, controller: DraftController) => () => void;
  mark: (id: string, dirty: boolean) => void;
  flush: () => Promise<boolean>;
  hasAttachedDirty: () => boolean;
}>({
  register: () => () => {},
  mark: () => {},
  flush: async () => true,
  hasAttachedDirty: () => false,
});
const PendingContext = createContext(0);
export function AutosaveProvider({ children }: { children: ReactNode }) {
  const registry = useRef(new Map<string, RegisteredDraft>());
  const dirty = useRef(new Set<string>());
  const [, refresh] = useState(0);
  const update = () => refresh((v) => v + 1);
  const api = useRef({
    register: (id: string, controller: DraftController) => {
      const entry = { ...controller, attached: true };
      registry.current.set(id, entry);
      return () => {
        entry.attached = false;
        // StrictMode immediately reattaches the field; only drain actual removals.
        queueMicrotask(() => {
          if (registry.current.get(id) !== entry || entry.attached) return;
          if (dirty.current.has(id) || entry.read().saving) {
            update();
            void entry.commit();
          } else {
            registry.current.delete(id);
            update();
          }
        });
      };
    },
    mark: (id: string, value: boolean) => {
      if (value) dirty.current.add(id);
      else {
        dirty.current.delete(id);
        if (registry.current.get(id)?.attached === false)
          registry.current.delete(id);
      }
      update();
    },
    hasAttachedDirty: () =>
      [...dirty.current].some(
        (id) => registry.current.get(id)?.attached === true,
      ),
    flush: async () => {
      const results = await Promise.all(
        [...registry.current.values()].map((entry) => entry.commit()),
      );
      return results.every(Boolean);
    },
  }).current;
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, []);
  const recovery = [...registry.current.entries()].filter(
    ([id, entry]) => !entry.attached && dirty.current.has(id),
  );
  return (
    <Context.Provider value={api}>
      <PendingContext.Provider value={dirty.current.size}>
        {children}
        {recovery.length > 0 && (
          <aside
            className="draft-recovery"
            aria-label="Unsaved draft recovery"
            role="region"
          >
            <strong>Unsaved drafts</strong>
            <p>
              These fields left the screen before saving. Your text is kept here
              until it saves or you discard it.
            </p>
            {recovery.map(([id, entry]) => {
              const saved = entry.read();
              return (
                <div key={id}>
                  <label htmlFor={`recovery-${id}`}>{saved.label}</label>
                  <textarea
                    id={`recovery-${id}`}
                    readOnly
                    value={saved.draft}
                    aria-label={`Recovered draft: ${saved.label}`}
                  />
                  <p role="status">{saved.error || "Saving draft…"}</p>
                  {saved.error && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void entry.commit()}
                    >
                      Retry save
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saved.saving}
                    onClick={() => entry.discard()}
                  >
                    Discard draft
                  </Button>
                </div>
              );
            })}
          </aside>
        )}
      </PendingContext.Provider>
    </Context.Provider>
  );
}
export const useAutosave = () => useContext(Context);
export function AutoField({
  value,
  onSave,
  label,
  multiline = false,
  type = "text",
  placeholder = "Not set",
  compact = false,
  normalize = (value: string) => value,
}: {
  value: string;
  onSave: (next: string, expected: string) => Promise<void>;
  label: string;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  compact?: boolean;
  normalize?: (value: string) => string;
}) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<"saved" | "dirty" | "saving" | "error">(
    "saved",
  );
  const [error, setError] = useState("");
  const ref = useRef({
    draft: value,
    base: value,
    dirty: false,
    saving: false,
    save: onSave,
    label,
    normalize,
    awaiting: null as { previous: Set<string>; saved: string } | null,
    error: "",
  });
  ref.current.save = onSave;
  ref.current.label = label;
  ref.current.normalize = normalize;
  const id = useRef(crypto.randomUUID()).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const context = useAutosave();
  const currentValue = useRef(value);
  currentValue.current = value;
  const commit = useRef(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    const r = ref.current;
    if (r.saving) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return commit.current();
    }
    if (!r.dirty) return true;
    r.saving = true;
    r.error = "";
    context.mark(id, true);
    setState("saving");
    const rawDraft = r.draft,
      next = r.normalize(rawDraft),
      observed = currentValue.current,
      expected = r.base;
    try {
      await r.save(next, expected);
      r.base = next;
      // The write can resolve before the reactive query publishes its value.
      const previous = new Set(r.awaiting?.previous ?? []);
      if (r.awaiting) previous.add(r.awaiting.saved);
      previous.add(observed);
      r.awaiting =
        currentValue.current === next ? null : { previous, saved: next };
      r.dirty = r.draft !== rawDraft;
      if (!r.dirty) {
        r.draft = next;
        setDraft(next);
      }
      r.saving = false;
      context.mark(id, r.dirty);
      setState(r.dirty ? "dirty" : "saved");
      r.error = "";
      setError("");
      if (r.dirty) return commit.current();
      return true;
    } catch (e) {
      r.saving = false;
      setState("error");
      r.error =
        e instanceof Error
          ? e.message
          : "Could not save. Your draft is still here.";
      setError(r.error);
      context.mark(id, r.dirty);
      return false;
    }
  });
  useEffect(
    () =>
      context.register(id, {
        commit: () => commit.current(),
        read: () => ({
          label: ref.current.label,
          draft: ref.current.draft,
          error: ref.current.error,
          saving: ref.current.saving,
        }),
        discard: () => {
          // Detached failures are recoverable; discard only this local draft.
          clearTimeout(timer.current);
          ref.current.dirty = false;
          ref.current.draft = ref.current.base;
          ref.current.error = "";
          context.mark(id, false);
        },
      }),
    [id, context.register],
  );
  useEffect(() => {
    const awaiting = ref.current.awaiting;
    if (awaiting) {
      if (value === awaiting.saved) ref.current.awaiting = null;
      else if (awaiting.previous.has(value)) return;
      else ref.current.awaiting = null;
    }
    if (!ref.current.dirty && !ref.current.saving) {
      ref.current.base = value;
      ref.current.draft = value;
      setDraft(value);
    }
  }, [value, state]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const change = (next: string) => {
    ref.current.draft = next;
    ref.current.dirty = next !== ref.current.base;
    setDraft(next);
    setState(ref.current.dirty ? "dirty" : "saved");
    context.mark(id, ref.current.dirty || ref.current.saving);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void commit.current(), 650);
  };
  const props = {
    id: `field-${id}`,
    value: draft,
    "aria-label": label,
    "aria-invalid": state === "error" || undefined,
    "aria-describedby": state === "error" ? `error-${id}` : undefined,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change(e.target.value),
    onBlur: () => {
      void commit.current();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        void commit.current();
        (e.target as HTMLElement).blur();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(timer.current);
        ref.current.dirty = false;
        ref.current.base = currentValue.current;
        ref.current.draft = currentValue.current;
        context.mark(id, ref.current.saving);
        setDraft(currentValue.current);
        setState("saved");
        setError("");
      }
    },
    className: compact ? "cell-input" : "input",
  };
  return (
    <div
      className={`auto-field ${compact ? "compact-field" : ""} ${state === "error" ? "field-error" : ""}`}
    >
      {!compact && (
        <label className="field-label" htmlFor={`field-${id}`}>
          {label}
          <span className="field-state">
            {state === "saving" ? (
              <LoaderCircle size={12} className="spin" />
            ) : state === "saved" ? null : state === "dirty" ? (
              "Unsaved"
            ) : (
              <AlertCircle size={12} />
            )}
          </span>
        </label>
      )}
      {multiline ? (
        <textarea {...props} rows={4} />
      ) : (
        <input {...props} type={type} />
      )}
      {state === "error" && (
        <div className="save-error" id={`error-${id}`} role="alert">
          {error}
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void commit.current()}
            >
              Retry
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                clearTimeout(timer.current);
                ref.current.dirty = false;
                ref.current.base = currentValue.current;
                ref.current.draft = currentValue.current;
                setDraft(currentValue.current);
                setState("saved");
                setError("");
                context.mark(id, false);
              }}
            >
              Use saved value
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export function SaveIndicator() {
  const pending = useContext(PendingContext);
  return (
    <span
      className={`save-indicator ${pending ? "pending" : ""}`}
      role="status"
      aria-label={pending ? "Unsaved changes" : "All changes saved"}
    >
      <span
        className="save-state-icon"
        key={pending > 0 ? "pending" : "saved"}
        aria-hidden="true"
      >
        {pending ? (
          <LoaderCircle size={13} className="spin" />
        ) : (
          <Check size={13} />
        )}
      </span>
      <span>{pending ? "Unsaved changes" : "All changes saved"}</span>
    </span>
  );
}
export async function safeAction(
  action: () => Promise<void>,
  success?: string,
) {
  try {
    await action();
    if (success) toast.success(success);
  } catch (e) {
    toast.error(
      e instanceof Error
        ? e.message
        : "Something went wrong. Please try again.",
    );
  }
}
