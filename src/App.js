import "./App.css";
import CreateEv from "./components/CreateEv";
import MapView from "./components/MapView";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/create-ev" element={<CreateEv />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
