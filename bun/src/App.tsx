import "./index.css";
import { APITester } from "./APITester";
import { TodoList } from "./TodoList";

export function App() {
  return (
    <div className="app">
      <h1>Welcome to my first Bun app!</h1>
      <TodoList />
      <APITester />
    </div>
  );
}

export default App;
