import { useEffect, useMemo, useState } from "react";

type Todo = {
  id: number;
  text: string;
  done: boolean;
  due?: string; // yyyy-mm-dd
};

type Filter = "all" | "active" | "done";

const STORAGE_KEY = "bun-todo-list";
let nextId = 1;

function makeTodo(text: string, due?: string, done = false): Todo {
  return { id: nextId++, text, due, done };
}

function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const seedTodos = (): Todo[] => [
  makeTodo("Explore the Bun + React template", todayISO()),
  makeTodo("Try the API tester with a real endpoint"),
  makeTodo("Add the HMR edit to src/App.tsx", undefined, true),
  makeTodo("Check out bun.lock and bunfig.toml", "2099-01-01"),
];

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTodos();
    const parsed = JSON.parse(raw) as { todos?: Todo[] };
    if (!Array.isArray(parsed.todos)) return seedTodos();
    for (const todo of parsed.todos) {
      if (typeof todo.id === "number" && todo.id >= nextId) nextId = todo.id + 1;
    }
    return parsed.todos.filter(
      (todo) =>
        typeof todo.text === "string" && typeof todo.done === "boolean"
    );
  } catch {
    return seedTodos();
  }
}

const filterLabels: Record<Filter, string> = {
  all: "All",
  active: "Active",
  done: "Done",
};

/** Urgency order: active tasks first (earlier due date = more urgent, undated last), done tasks at the bottom. */
function byUrgency(a: Todo, b: Todo): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.due && b.due) return a.due.localeCompare(b.due);
  if (a.due) return -1;
  if (b.due) return 1;
  return a.id - b.id;
}

function dueBadge(todo: Todo): { label: string; kind: string } | null {
  if (!todo.due) return null;
  const today = todayISO();
  if (todo.done) return { label: todo.due, kind: "due-badge" };
  if (todo.due < today) return { label: `Overdue · ${todo.due}`, kind: "due-badge overdue" };
  if (todo.due === today) return { label: "Due today", kind: "due-badge today" };
  return { label: todo.due, kind: "due-badge" };
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [draft, setDraft] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editDue, setEditDue] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ todos }));
    } catch {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }, [todos]);

  function addTodo(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setTodos((t) => [...t, makeTodo(text, draftDue || undefined)]);
    setDraft("");
    setDraftDue("");
  }

  function toggleTodo(id: number) {
    setTodos((t) =>
      t.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
    );
  }

  function deleteTodo(id: number) {
    setTodos((t) => t.filter((todo) => todo.id !== id));
  }

  function clearCompleted() {
    setTodos((t) => t.filter((todo) => !todo.done));
  }

  function toggleAll() {
    const allDone = todos.length > 0 && todos.every((todo) => todo.done);
    setTodos((t) => t.map((todo) => ({ ...todo, done: !allDone })));
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditDraft(todo.text);
    setEditDue(todo.due ?? "");
  }

  function commitEdit(id: number, text: string, due: string) {
    const trimmed = text.trim();
    if (trimmed === "") {
      deleteTodo(id);
    } else {
      setTodos((t) =>
        t.map((todo) =>
          todo.id === id ? { ...todo, text: trimmed, due: due || undefined } : todo
        )
      );
    }
    setEditingId(null);
  }

  const remaining = todos.filter((todo) => !todo.done).length;
  const completed = todos.length - remaining;
  const visible = useMemo(() => {
    const filtered =
      filter === "all"
        ? todos
        : todos.filter((todo) => (filter === "done" ? todo.done : !todo.done));
    return [...filtered].sort(byUrgency);
  }, [todos, filter]);
  const allDone = todos.length > 0 && remaining === 0;

  return (
    <section className="todo-list">
      <h2>Todo List</h2>
      <form className="todo-form" onSubmit={addTodo}>
        <input
          className="todo-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a todo..."
          aria-label="New todo"
        />
        <input
          className="todo-date"
          type="date"
          value={draftDue}
          onChange={(e) => setDraftDue(e.target.value)}
          aria-label="Due date"
        />
        <button className="todo-add" type="submit">
          Add
        </button>
      </form>
      <div className="todo-toolbar" role="tablist" aria-label="Filter todos">
        {(Object.keys(filterLabels) as Filter[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? "todo-filter active" : "todo-filter"}
            onClick={() => setFilter(key)}
          >
            {filterLabels[key]}
          </button>
        ))}
        <button
          type="button"
          className="todo-filter todo-clear"
          onClick={clearCompleted}
          disabled={completed === 0}
        >
          Clear done ({completed})
        </button>
      </div>
      {todos.length > 0 && (
        <button
          type="button"
          className="todo-toggle-all"
          onClick={toggleAll}
          disabled={todos.length === 0}
        >
          {allDone ? "Uncheck all" : "Check all"}
        </button>
      )}
      {todos.length === 0 && <p className="todo-empty">All done! 🎉</p>}
      {todos.length > 0 && visible.length === 0 && (
        <p className="todo-empty">No tasks in “{filterLabels[filter]}”.</p>
      )}
      <ul className="todo-items">
        {visible.map((todo) => {
          const badge = dueBadge(todo);
          return (
            <li key={todo.id} className={todo.done ? "todo done" : "todo"}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                />
                {editingId === todo.id ? (
                  <span className="todo-edit-row">
                    <input
                      className="todo-edit"
                      value={editDraft}
                      autoFocus
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={(e) => {
                        const row = e.currentTarget.parentElement;
                        if (row?.contains(e.relatedTarget as Node | null)) return;
                        commitEdit(todo.id, editDraft, editDue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          commitEdit(todo.id, editDraft, editDue);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <input
                      className="todo-edit todo-date"
                      type="date"
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                      aria-label="Edit due date"
                    />
                  </span>
                ) : (
                  <span className="todo-text-group" title="Double-click to edit">
                    <span>{todo.text}</span>
                    {badge && <span className={badge.kind}>{badge.label}</span>}
                  </span>
                )}
              </label>
              <button
                className="todo-delete"
                onClick={() => deleteTodo(todo.id)}
                aria-label={`Delete ${todo.text}`}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {todos.length > 0 && (
        <p className="todo-count">
          {remaining} of {todos.length} remaining
        </p>
      )}
    </section>
  );
}
