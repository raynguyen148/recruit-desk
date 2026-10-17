import { Modal } from "./ui/dialog";

const groups: { title: string; items: [string, string][] }[] = [
  {
    title: "Anywhere",
    items: [
      ["⌘ K", "Command palette"],
      ["/", "Focus search"],
      ["N", "New record on this page"],
      ["?", "Show this list"],
    ],
  },
  {
    title: "Go to",
    items: [
      ["G then T", "Today"],
      ["G then C", "Candidates"],
      ["G then J", "Jobs"],
      ["G then A", "Applications"],
      ["G then P", "Companies"],
      ["G then S", "Settings & data"],
    ],
  },
  {
    title: "Lists",
    items: [
      ["J / K", "Next / previous row"],
      ["Enter", "Open the focused row"],
      ["Esc", "Close a record"],
    ],
  },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Keyboard shortcuts"
      description="Shortcuts pause while you type in a field or a dialog is open."
    >
      <div className="shortcut-groups">
        {groups.map((group) => (
          <section key={group.title}>
            <h3>{group.title}</h3>
            <dl>
              {group.items.map(([keys, label]) => (
                <div key={keys}>
                  <dt>
                    {keys
                      .split(" ")
                      .map((part, i) =>
                        part === "then" ? (
                          <span key={i}>then</span>
                        ) : part === "/" && keys.includes("/ ") ? (
                          <span key={i}>/</span>
                        ) : (
                          <kbd key={i}>{part}</kbd>
                        ),
                      )}
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
