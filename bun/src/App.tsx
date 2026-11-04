import "./index.css";
import { APITester } from "./APITester";
import { TodoList } from "./TodoList";

export function App() {
  return (
    <div className="app">
      <h1>Welcome to Bun!</h1>
      <p>
        Try editing <code>src/App.tsx</code> and save to see HMR in action.
      </p>
      <TodoList />
      <APITester />
    </div>
  );
}

export default App;
