import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.js";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import axios from "axios";
import getUserLocation from "../lib/getUserLocation";
import calculateDistance from "../lib/calculateDistance";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const MapView = () => {
  const map = useRef(null);
  const [evStations, setEvStations] = useState([]);
  const energyConsumptionRate = 0.2;
  const [chargeConsumption, setChargeConsumption] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const geolocate = useRef();
  const directions = useRef();
  const socket = useRef();
  const [chargingTime, setChargingTime] = useState("");
  const [messageElement, setMessageElement] = useState("");

  function emergencyCall() {
    try {
      socket.current = new WebSocket(process.env.REACT_APP_BACKEND_API);

      socket.current.addEventListener("open", (event) => {
        console.log("WebSocket connection opened:", event);
      });

      socket.current.addEventListener("message", (event) => {
        console.log("Message from server:", event.data);

        // Parse the message as JSON
        try {
          const messageData = JSON.parse(event.data);

          setMessageElement(
            `Message: ${messageData.text}, Location: ${messageData.location}`
          );

          setTimeout(() => {
            setMessageElement("");
          }, 300000);
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      });

      socket.current.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
      });

      socket.current.addEventListener("close", (event) => {
        console.log("WebSocket connection closed:", event);
      });
    } catch (error) {
      console.error(error);
    }

    const emergencyMessage = "Emergency! Please check the situation.";

    // Create an object with text and location
    const messageObject = {
      text: emergencyMessage,
      location: `Lat: ${getUserLocation()[0]}, Lng: ${getUserLocation()[1]}`,
    };

    // Send the message object to the server
    socket.current.send(JSON.stringify(messageObject));
    socket.current.close();
  }

  function calculateConsumption(start, destination) {
    const distance = calculateDistance(start, destination);
    const consumption = distance * energyConsumptionRate;
    setChargeConsumption(consumption.toFixed(2));
    console.log(`chargeConsumption: ${consumption.toFixed(2)}`);
  }

  useEffect(() => {
    // initialize map only once
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [0, 0],
      zoom: 15,
      attributionControl: false,
    });

    // Adding necessary controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    // Geolocation control
    geolocate.current = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
    });
    map.current.addControl(geolocate.current);
    // Directions Control
    directions.current = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: "metric",
      profile: "mapbox/driving-traffic",
    });
    map.current.addControl(directions.current, "top-left");

    // on geolocate event handler
    geolocate.current.on("geolocate", (event) => {
      const userLocation = [event.coords.longitude, event.coords.latitude];
      directions.current.setOrigin(userLocation);
    });

    // battery status
    navigator.getBattery().then((battery) => {
      function updateBatteryState() {
        console.log(battery);
        setBatteryLevel(battery.level * 100);
        if (battery.charging) {
          setChargingTime("Charging...");
        } else {
          if (parseInt(battery.dischargingTime)) {
            let hr = parseInt(battery.dischargingTime / 3600);
            let min = parseInt(battery.dischargingTime / 60 - hr * 60);
            setChargingTime(`${hr}hr ${min}mins remaining`);
          } else {
            setChargingTime(battery.dischargingTime);
          }
        }
      }

      updateBatteryState();

      battery.addEventListener("chargingchange", () => {
        updateBatteryState();
      });

      battery.addEventListener("levelchange", () => {
        updateBatteryState();
      });

      battery.addEventListener("ondischargingtimechange", () => {
        updateBatteryState();
      });
    });
  });

  useEffect(() => {
    if (batteryLevel < 59) {
      geolocate.current.trigger();
      fetchEV();
    }
  }, [batteryLevel]);

  function handleEvChange() {
    const destinationSelector = document.getElementById("destination");
    const selectedDestination = destinationSelector.value;
    if (selectedDestination) {
      const destinationCoordinates = JSON.parse(selectedDestination);
      directions.current.setDestination(destinationCoordinates);
    }
  }

  async function fetchEV() {
    const userLocation = await getUserLocation();
    if (!userLocation) {
      throw new Error("cant get user loc");
    }
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_HTTP}/stations`
      );
      if (response) {
        const evStationsLocal = response.data.chargingStations;
        setEvStations(evStationsLocal);

        let minDistance = Number.MAX_SAFE_INTEGER;
        let minIndex = -1;

        for (let i = 0; i < evStationsLocal.length; i++) {
          const distance = calculateDistance(
            userLocation,
            evStationsLocal[i].position
          );
          if (minDistance > distance) {
            minDistance = distance;
            minIndex = i;
          }
        }

        evStationsLocal.forEach((station) => {
          const marker = new mapboxgl.Marker()
            .setLngLat(station.position)
            .setPopup(new mapboxgl.Popup().setText(station.name))
            .addTo(map.current);

          // Attach click event to the marker
          marker
            .getElement()
            .addEventListener("click", () =>
              calculateConsumption(userLocation, station.position)
            );

          directions.current.setDestination(evStationsLocal[minIndex].position);
        });
      } else {
        console.error("Cant fetch data");
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <main>
      <div id="map"></div>
      <div id="batteryStatus">
        Battery Status: <span id="batteryPercentage">{batteryLevel}</span>
      </div>
      <div id="destinationSelector">
        <label htmlFor="destination">EV Charging Station:</label>
        <select id="destination" defaultValue="" onChange={handleEvChange}>
          <option value="" disabled>
            Select an EV station
          </option>
          {evStations
            ? evStations.map((station) => (
                <option
                  key={station.position}
                  value={JSON.stringify(station.position)}
                >
                  {station.name}
                </option>
              ))
            : null}
        </select>
      </div>
      <div id="chargeInfo">
        Estimated Charge Consumption:{" "}
        <span id="chargeConsumption">{chargeConsumption}</span> kWh
      </div>
      <div id="charging-time">{chargingTime}</div>
      <button
        onClick={emergencyCall}
        id="emergencyButton"
        className="my-custom-selector"
      >
        Emergency Signal
      </button>
      {messageElement === "" ? null : (
        <div id="messageContainer" className="my-custom-selector">
          {messageElement}
        </div>
      )}
    </main>
  );
};

export default MapView;
