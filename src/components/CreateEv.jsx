import React, { useState } from "react";
import axios from "axios";

const CreateEv = () => {
  const [name, setName] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");

  async function handleSubmit() {
    if (name !== "" && longitude !== null && latitude !== null) {
      const data = {
        name,
        position: [Number(longitude), Number(latitude)],
      };

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_HTTP}/createev`,
          data
        );
        if (response) {
          console.log(`Success: ${response}`);
        } else {
          console.error("Couldn't create");
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  return (
    <div>
      <h1>Create new EV Station</h1>
      <div>
        <input
          type="text"
          placeholder="Station Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <input
          type="number"
          placeholder="Longitude"
          value={longitude}
          onChange={(e) => {
            setLongitude(e.target.value);
          }}
        />
        <input
          type="number"
          placeholder="Latitude"
          value={latitude}
          onChange={(e) => {
            setLatitude(e.target.value);
          }}
        />
        <button onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
};

export default CreateEv;
