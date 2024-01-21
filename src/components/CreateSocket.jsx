import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CreateSocket = () => {
  const [evStations, setEVStations] = useState([]);
  const [selectedValue, setSelectedValue] = useState("");

  const handleDropdownChange = (event) => {
    const newValue = event.target.value;
    setSelectedValue(newValue);
  };

  async function fetchStations() {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_HTTP}/stations`
      );
      const evStationsLocal = response.data.chargingStations;
      setEVStations(evStationsLocal);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAddSocket() {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HTTP}/create-socket`,
        { selectedValue }
      );
      if (response) {
        toast.success("Added an socket");
      } else {
        toast.error("Error");
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchStations();
  });
  return (
    <div className="container">
      <ToastContainer />
      <div className="card-1">
        <h1>Create a new Socket</h1>
        <label htmlFor="dropdown">Select a charging station</label>
        <select
          id="dropdown"
          onChange={handleDropdownChange}
          value={selectedValue}
        >
          <option value="">Select an option</option>
          {evStations.map((option, index) => (
            <option key={index} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <button onClick={handleAddSocket}>Add Socket</button>
      </div>
    </div>
  );
};

export default CreateSocket;
