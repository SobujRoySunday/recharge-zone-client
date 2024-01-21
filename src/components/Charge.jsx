import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const Charge = () => {
  const slots = useRef([]);
  const [evStations, setEVStations] = useState([]);
  const selectedValue = useRef("");
  const [isCharging, setIsCharging] = useState(false);

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

  async function fetchSlots() {
    try {
      const value = selectedValue.current;
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HTTP}/charge-slots`,
        { selectedValue: value }
      );
      slots.current = response.data.sockets;
      console.log(slots);
    } catch (error) {
      console.error(error);
    }
  }

  const handleDropdownChange = (event) => {
    const newValue = event.target.value;
    selectedValue.current = newValue;
    console.log(selectedValue.current);
    fetchSlots();
  };

  useEffect(() => {
    fetchStations();
  });

  async function handleCharge() {
    try {
      setIsCharging(true);
      const slot = slots.current[0].id;
      console.log("asdvjh");
      await axios.post(`${process.env.REACT_APP_BACKEND_HTTP}/allocate`, [
        slot,
      ]);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDischarge() {
    try {
      setIsCharging(false);
      const slot = slots.current[0].id;
      await axios.post(`${process.env.REACT_APP_BACKEND_HTTP}/disallocate`, [
        slot,
      ]);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="container">
      <div className="card-1">
        <h1>Charge</h1>
        <label htmlFor="dropdown">Select an option:</label>
        {!isCharging && (
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
        )}
        {slots.current.length > 0 ? (
          (isCharging && (
            <button onClick={handleDischarge}>Disconnect</button>
          )) ||
          (!isCharging && <button onClick={handleCharge}>Charge now</button>)
        ) : (
          <p>Charging slots are not available at this station</p>
        )}
      </div>
    </div>
  );
};

export default Charge;
