import "./App.css";
import Charge from "./components/Charge";
import CreateEv from "./components/CreateEv";
import CreateSocket from "./components/CreateSocket";
import MapView from "./components/MapView";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/create-ev" element={<CreateEv />} />
        <Route path="/create-socket" element={<CreateSocket />} />
        <Route path="/charge" element={<Charge />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
